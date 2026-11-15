# React Slot Semantics

Status: implemented React 19 profile; experimental and subject to conformance review

This document records the settled behavior for the initial React adapter profile.
Radix Slot is a compatibility reference, not an automatic source of requirements.
UniversalSlots should adopt behavior intentionally and document any differences.

> **Relationship to the universal design:** This document describes a React-specific
> profile for polymorphic composition. It is not the framework-neutral composition
> contract. See [Polymorphic Composition Semantics](./polymorphic-composition.md).
> The React profile implements the v1 decisions in the universal contract; adapter-specific details are recorded here.

## Scope

The initial adapter targets React-style slot substitution: a slot component receives
props and applies them to a single child element. This is distinct from native
content projection (such as Web Component `<slot>`), which does not replace a
child element or merge its props.

This document specifies the React adapter profile. The initial implementation is tracked in US-006; lifecycle hardening is tracked in US-006a.

## API

The React adapter exposes a low-level `Slot` composition primitive:

```tsx
<Slot title="profile link">
  <a href="/profile">Profile</a>
</Slot>
```

The primitive composes its props onto one target element. Higher-level component
libraries may expose APIs such as `asChild`, but those are built on top of
`Slot` and are not part of UniversalSlots' low-level API. `Slot` does not
substitute for ordinary `children` composition.

The first release should support one React element child. Arrays, strings,
numbers, portals, and multiple children are not slot targets. Fragment support
is deferred unless the implementation can define meaningful prop/ref behavior
for fragments.

## Semantics for the first release

These are the settled React v1 profile of the universal composition contract.

### Prop precedence

- Child props win when both the slot and child specify the same ordinary prop.
- Slot props are forwarded only when the prop is **absent** from the child's
  props (`!(name in childProps)`). A prop that is present with the value
  `undefined` counts as specified, so the child's `undefined` wins.
- `children` is special: the child element's own children are preserved.
- `key` is React reconciliation metadata and is not treated as a forwarded DOM
  prop.
- `ref` is special and follows the ref-composition rules below.

This follows the v1 target-wins precedence defined in the universal composition contract.

### Event handlers

- A prop is a recognized event handler if its name matches `/^on[A-Z]/` and
  its value is a function. This is a documented heuristic, not a list of React
  events: it can classify a custom callback prop such as `onSelectItem` as an
  event and compose it. Strict Radix parity is not a goal for the first
  release. A supported-event allowlist can replace the heuristic later.
- When both sides provide a recognized handler, compose both handlers.
- If only one side provides a function, use it unchanged. If either side's value
  is `undefined` or not a function, apply the prop-precedence rules instead:
  the child's explicit `undefined` wins, and the slot handler is forwarded
  only when the child prop is absent.
- Invoke the child handler first, then the slot handler.
- `event.preventDefault()` in the child handler does **not** suppress the slot
  handler in the initial behavior.
- Do not compose function-valued props whose names do not match the pattern.

The default event-composition behavior is a deliberate
UniversalSlots decision; it should not be assumed to match every existing slot
library. The React `Slot` adapter preserves that default, and exposes the
framework-neutral core policy through its `composition.mergeEvent` option:

```tsx
<Slot
  composition={{
    mergeEvent:
      (sourceHandler, targetHandler) =>
      (...args: never[]) => {
        const event = args[0] as { defaultPrevented?: boolean } | undefined;

        targetHandler(...args);
        if (!event?.defaultPrevented) {
          sourceHandler(...args);
        }
      },
  }}
  onClick={parentHandler}
>
  <button onClick={childHandler}>Continue</button>
</Slot>
```

Here the source handler is the Slot contribution and the target handler is the
child contribution. The example therefore invokes the child first and invokes
the parent only when the child has not prevented the event. The policy is
framework-neutral: UniversalSlots does not import or require React's
`SyntheticEvent` type. Consumers may annotate or narrow the event according to
their own component contracts. The `composition` option is consumed by `Slot`
and is not forwarded to the child element. The `composition` name is reserved
for this Slot configuration: a Slot-level prop with that name cannot also be
forwarded as an ordinary source prop. A `composition` prop already present on
the target element remains part of the target's own props.

The same `composition` options object also exposes the core class and style
value policies. These are useful when a React consumer uses non-string class
representations or a style model that differs from plain object merging:

```tsx
<Slot
  composition={{
    mergeClass: (source, target) => cn(source, target),
    mergeStyle: (source, target) => mergeFrameworkStyles(source, target),
  }}
  className="button"
  style={{ color: "red" }}
>
  <button>Continue</button>
</Slot>
```

The adapter forwards these callbacks to core; it does not implement a second
class/style merge algorithm. The callbacks receive the source contribution
first and the target contribution second. The default policies remain in
place when an option is omitted. Both `mergeClass` and `mergeStyle` are also
called for source-only values (with `undefined` as the target value) and for
target-only values (with `undefined` as the source value), so a custom policy
can normalize or transform either side.

### `className`

- If both values are non-empty strings, concatenate in slot-then-child order,
  separated by one space.
- If only one side supplies a non-empty string, use that value.
- Do not perform Tailwind/class conflict resolution.

### `style`

- If both values are style objects, shallow-merge them.
- Child style properties take precedence on conflicts.
- Do not mutate either input object.
- Non-object style values are invalid for this initial contract.

### Nested composition

Nested React `Slot` elements are supported. Composition follows the universal
contract:

- Ordinary props from the deepest target win conflicts.
- Event handlers run deepest target first, then inner slot, then outer slot.
- `className` values concatenate outer slot, inner slot, then target.
- Style objects merge outer slot, inner slot, then target; the target wins.
- All refs are composed and receive the same underlying instance, with cleanup
  handled according to React 19 ref semantics.

### `ref`

- If both slot and child provide refs, compose them so both receive the same
  underlying instance.
- Support callback refs and object refs.
- If the same ref identity is supplied by both composition layers, invoke or
  assign it only once and clean it up only once.
- Do not mutate or replace the original ref objects.
- Follow the React 19 callback-ref cleanup behavior described in
  [Supported React versions](#supported-react-versions).
- If only one ref exists, preserve it without unnecessary wrapping when feasible.
- Nested slots compose all refs onto the same underlying target instance.

### Custom component targets and forwarding

A custom component target must forward the props contributed by `Slot` to the
element or component it renders. In React 19, it must also pass an injected
`ref` through when it intends that ref to identify the underlying rendered
instance. `Slot` cannot force a custom component to forward props or refs that
the component consumes or discards.

For example:

```tsx
import type { ComponentProps } from "react";

type LinkProps = ComponentProps<"a"> & { href: string };

function Link({ href, ...props }: LinkProps) {
  return <a href={href} {...props} />;
}
```

The custom target remains responsible for forwarding the attributes and ref;
`Slot` is responsible for composing them onto the `Link` element.

### Boolean and omitted props

- Treat `false` and `undefined` as values, not as interchangeable absence.
- Child prop absent: the slot value is forwarded.
- Child prop explicitly present with `undefined`: the child value wins, so the
  result is `undefined`.
- Child prop explicitly present with `false`: the child value wins.
- Avoid custom DOM boolean serialization; React remains responsible for
  rendering forwarded props.

### Child validation

- Require exactly one valid React element.
- Throw the stable error message:
  `UniversalSlots Slot expects exactly one non-fragment React element child.`
  for zero children, multiple children, or non-element children.
- Reject non-element children such as strings and numbers.
- Initially reject fragments as slot targets; fragments do not provide a
  reliable host instance for prop forwarding or ref composition.
- Do not silently select the first child from an array.

## Supported React versions

**Decision: React 19 only for v1.** The package peer range is `react: ^19.0.0`.
React 18 support is deferred until there is a concrete compatibility need.

React 19 callback refs may return cleanup functions. The composed callback ref
must return a cleanup function that invokes each callback ref's returned cleanup;
for callback refs that return no cleanup, invoke them with `null` during detach.
Object refs are cleared by setting `.current` to `null`. Cleanup must be
idempotent and must not mutate or replace the original ref objects.

This decision is reflected in the React adapter package's peer dependency and
the R-04–R-06 conformance tests.

## Deferred behavior

The following are outside the first release unless a concrete use case requires
them:

- Fragment targets
- Automatic class-name conflict resolution
- Arbitrary function-prop composition
- Configurable prop-precedence policies
- Multiple child targets
- Framework-neutral runtime abstractions beyond what the React adapter needs

## Conformance test matrix

Tests should assert observable outcomes, not implementation details.

| ID    | Scenario                                                   | Expected outcome                                              |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| P-01  | Slot provides prop absent from child                       | Slot prop appears on child                                    |
| P-02  | Both provide same ordinary prop                            | Child value wins                                              |
| P-03  | Child explicitly sets prop to `false`                      | `false` wins                                                  |
| P-04  | Child omits prop (key not present)                         | Slot value is forwarded                                       |
| P-04a | Child explicitly sets prop to `undefined`                  | `undefined` wins; slot value is not forwarded                 |
| P-05  | Child's own `children` conflict with slot children         | Child element's children are preserved                        |
| E-01  | Slot and child handlers both exist                         | Child handler runs, then slot handler                         |
| E-02  | Child handler calls `preventDefault()`                     | Slot handler still runs                                       |
| E-03  | Only one handler exists                                    | That handler runs once                                        |
| E-03a | Slot handler present, child handler absent                 | Slot handler is forwarded and runs once                       |
| E-03b | Child handler present, slot handler absent                 | Child handler runs once                                       |
| E-03c | Child handler explicitly `undefined`, slot handler present | Child `undefined` wins; slot handler does not run             |
| E-05  | Custom `on[A-Z]` callback on both sides                    | Both are composed (documents the heuristic)                   |
| E-04  | Function-valued non-event prop on both sides               | Child value wins; functions are not composed                  |
| C-01  | Both provide `className`                                   | Slot class then child class, separated by one space           |
| C-02  | Only one provides `className`                              | Single value preserved                                        |
| S-01  | Both provide style objects with distinct keys              | Both keys preserved                                           |
| S-02  | Style key conflicts                                        | Child style wins                                              |
| S-03  | Style objects are merged                                   | Neither input object is mutated                               |
| R-01  | Slot and child callback refs                               | Both receive same instance                                    |
| R-02  | Slot and child object refs                                 | Both `.current` values receive same instance                  |
| R-03  | Callback/object ref combination                            | Both refs receive same instance                               |
| R-04  | Ref detachment/unmount                                     | Both refs are cleared/cleaned per the supported React version |
| R-05  | Callback ref returns a cleanup function (React 19 only)    | Cleanup runs for each ref on unmount                          |
| R-06  | Callback ref returns nothing                               | Ref is called with `null` on unmount                          |
| R-07  | Parent rerenders with a new child element and stable refs  | Composed refs are not detached and reattached                 |
| R-08  | Same callback ref supplied by slot and child               | Callback and cleanup each run once                            |
| R-09  | Same object ref supplied by slot and child                 | Assignment and clearing each happen once                      |
| N-05  | Three nested composition levels with callback refs         | All refs receive the target; each cleanup runs once           |
| V-01  | No child                                                   | Stable descriptive error                                      |
| V-02  | More than one child                                        | Stable descriptive error                                      |
| V-03  | String or number child                                     | Stable descriptive error                                      |
| V-04  | Fragment child                                             | Stable descriptive error                                      |
| V-05  | Valid single element                                       | Slot substitution succeeds                                    |
| T-01  | Custom target forwards contributed props and ref           | Rendered target receives both props and underlying instance   |

## TypeScript test plan

- Preserve the child element's intrinsic/component props where practical.
- Allow slot props to be passed without losing useful inference.
- Verify ref types for supported child elements and the chosen React version.
- Verify invalid child shapes are rejected where the type system can express it.
- Runtime validation remains required; TypeScript types are not a substitute.

## Acceptance criteria for this specification task

- API shape is settled or clearly marked as an open decision.
- The supported React version and ref cleanup behavior are decided.
- Prop precedence, event behavior, class/style merge, ref handling, and child
  validation have explicit decisions.
- Every behavior has a conformance test case with an expected result.
- React/Radix compatibility differences are documented.
- No adapter implementation, package changes, or dependencies are added.
