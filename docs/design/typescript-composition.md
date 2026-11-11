# TypeScript composition API

## Purpose

UniversalSlots exposes reusable TypeScript composition contracts without
depending on Praxis-kit or any other consumer library.

The type-level API has two layers:

- `@universal-slots/core` provides framework-neutral composition projection.
- `@universal-slots/react` provides React target prop/ref extraction and applies
  the shared projection to React's `on[A-Z]` event-handler naming convention.

Consumer libraries remain responsible for their own component factories,
contract metadata, variants, presets, and declarative composition APIs.

## Core composition projection

`MergeCompositionProps<Source, Target, EventKeys>` projects the result of
composing source contributions onto a target.

- Source-only properties remain available.
- Target-only properties remain available.
- Required ordinary conflicts use the target value type.
- Optional target conflicts retain the source type as a possibility because
  the target may omit the property.
- `class` and `className` string values project to `string`.
- Object style values are shallowly projected with target keys taking
  precedence.
- Event keys are supplied by the adapter. When both layers provide function
  types, the result preserves both callable contracts as an intersection.

The third generic parameter is intentionally adapter-defined. The framework-
neutral core cannot infer whether a property is an event handler because React,
Preact, Lit, and custom-element APIs use different conventions.

The type projection describes accepted values; it cannot prove that two
function signatures are semantically compatible. Runtime validation and
framework conformance remain necessary.

## React target types

`@universal-slots/react` exports:

- `ReactTargetProps<Target>` — props declared by an intrinsic element or
  component target, excluding its ref.
- `ReactTargetRef<Target>` — the ref type exposed by that target's React props.
- `ReactCompositionProps<Source, Target>` — core composition projection using
  React's `on[A-Z]` event-handler convention.

These utilities allow component libraries to build their own public component
signatures without UniversalSlots knowing about their component factories.

## Slot ref typing

The low-level `Slot` accepts arbitrary source contributions because it cannot
know the prop vocabulary of every component library using it. Its target ref
can be explicitly typed with the target generic:

```tsx
import { Slot } from "@universal-slots/react";

<Slot<"a"> ref={anchorRef} aria-label="Profile">
  <a href="/profile">Profile</a>
</Slot>;
```

For a custom React 19 component that exposes and forwards a `ref` prop:

```tsx
<Slot<typeof Link> ref={anchorRef} aria-label="Profile">
  <Link href="/profile">Profile</Link>
</Slot>
```

The generic parameter provides the ref contract. UniversalSlots does not claim
that TypeScript can reliably recover a concrete target type from arbitrary
JSX children: JSX element types can erase the specific component/prop
relationship needed for that inference.

The child expression is still checked by JSX against the target component's
own props. The explicit generic types the ref; it does not replace the child's
own prop checking.

## Dependency boundary

UniversalSlots type modules must not import, reference, or depend on Praxis-kit.
Praxis-kit may adapt its own component metadata to these generic contracts.
Other component libraries can do the same without adopting Praxis's type model.

## Internal type architecture

The core projection is decomposed into internal modules under
`packages/core/src/composition/types/`:

- `property-keys.ts` derives union-aware key sets, optional/required keys, and
  the value a property can have when it is present.
- `property-values.ts` models ordinary, event, class, and style value merging.
- `merge-composition-props.ts` assembles those operations into the public
  `MergeCompositionProps` contract.

The existing `composition/types.ts` module remains a small re-export boundary.
Intermediate helpers are not public API unless a later adapter demonstrates a
real need to consume them.

## Type-Fest

Core uses Type-Fest 5.10 for `KeysOfUnion` and `Simplify`. These utilities
support union-aware key extraction and readable projected types; UniversalSlots
continues to own its composition semantics and does not delegate its merge
policy to Type-Fest. Type-Fest is a runtime-free type dependency of the core
package because exported declarations use its types. Version 5.10 requires
TypeScript 5.9 or newer and strict mode. The workspace uses TypeScript 6.0.3 and enables `exactOptionalPropertyTypes`, which the
composition projection relies on to distinguish implicit optional-property
absence from an explicitly declared `undefined`.

## Union and optional-property behavior

`MergeCompositionProps` distributes over source and target unions independently
so each source/target member pair retains its own keys. This avoids losing
variant-only properties through `keyof` on an undistributed union.

For an optional target property, the projected value includes the source value
as a fallback. With `exactOptionalPropertyTypes`, the type of a property when
present is derived separately from the implicit absence of an optional
property. An explicitly declared `| undefined` remains part of that value.

Style objects are shallowly projected. If a target style key is optional, the
source style value remains possible when that key is absent; a present target
value takes precedence. Style arrays and function values are not recursively
merged by the core type projection. Framework adapters remain responsible for
constraining their accepted style model and matching their runtime policy.
