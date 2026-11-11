# Polymorphic Composition Semantics

Status: proposed design specification for UniversalSlots

## Purpose

UniversalSlots is intended to support **polymorphic component composition**: one component contributes props, behavior, or presentation to another component while preserving the composition target's identity and rendering responsibility.

This is not a replacement for `children`, native content projection, or render props. Those are distinct composition mechanisms and are outside this specification unless they are used as part of a polymorphic composition implementation.

A motivating React example is:

```tsx
<Button asChild>
  <Link href="/profile">Profile</Link>
</Button>
```

The desired result is a `Link` that receives the Button's composition contributions. The target is not replaced with a Button DOM element. `asChild` is one possible component-library API; it is not required to be UniversalSlots' public API.

UniversalSlots must remain independent of praxis-kit. Praxis-kit use cases may inform requirements, but must not appear as dependencies or assumptions in the contract.

## Terminology

- **Composing component:** The component that contributes props, behavior, or presentation to another target (e.g. Button).
- **Composition target:** The element or component that remains responsible for rendering (e.g. Link).
- **Composition primitive:** The framework-specific mechanism that applies the composition contributions to the target.
- **Composition contract:** Observable behavior that adapters implement and conformance tests verify.
- **Adapter:** A framework-specific implementation of the contract.
- **Target identity:** The target remains the component/element selected by the caller; composition does not silently replace it with a different semantic component.

Avoid using _slot_ without qualification when the meaning could be confused with native content projection.

## Goals

- Define observable runtime behavior for polymorphic composition.
- Preserve the target's rendering responsibility and semantic identity.
- Define how props and behavior contributed by the composing component interact with target props.
- Define type-level requirements so composition does not erase target-specific props, event types, or ref types.
- Allow adapters to use framework-idiomatic mechanisms.
- Make unsupported or partially supported behavior explicit per adapter.

## Non-goals

- Replacing ordinary `children` composition.
- Providing named-slot or native content-projection semantics.
- Defining render-prop/scoped-slot APIs.
- Building a UI component library or styling system.
- Guaranteeing that every framework can implement every capability identically.
- Requiring all adapters to use cloning or element substitution internally.
- Making UniversalSlots depend on praxis-kit.

## Conceptual model

Composition has two inputs:

1. Contributions from the composing component.
2. A caller-selected composition target, including its own props and behavior.

An adapter combines these inputs according to the contract and returns/render-integrates the target. It must not assume that the target is a native DOM element; custom components are valid targets when the adapter can support the required contract.

The composing component is responsible for deciding which contributions it supplies. UniversalSlots defines how those contributions are composed, not which styles, ARIA attributes, or behaviors a Button or other component should contribute.

## Runtime contract areas

The following areas must be specified and tested before the React implementation is considered complete. Exact policies not settled here are listed as design decisions rather than assumed universal behavior.

### Target and identity

- Define supported target shapes for each adapter (native element, framework component, fragment, etc.).
- Preserve target rendering and semantic identity.
- Define what happens when a target cannot accept or forward the relevant props/ref.
- Define behavior for missing, multiple, or invalid targets.
- Define nested composition and how repeated composition is resolved.

### Props and precedence

- Distinguish a prop that is absent from one explicitly present with `undefined`, `null`, or `false`.
- Define precedence for ordinary props when both inputs specify a value.
- Define special treatment for framework metadata and children/content props.
- Define whether prop policy is fixed, adapter-specific, or configurable.
- Avoid assuming that all framework props map directly to DOM attributes.

### Events and callbacks

- Distinguish event handlers from arbitrary function-valued props.
- Define handler ordering when both inputs provide handlers.
- Define whether cancellation (e.g. `preventDefault`) suppresses a later handler.
- Define what happens when a handler is absent, explicitly undefined, or not callable.
- Document limitations for custom callback props and framework event systems.

### Class and style

- Define class concatenation order and handling of empty values.
- Do not imply class conflict resolution (e.g. Tailwind utility conflict resolution) unless explicitly supported.
- Define style merge order, supported value shapes, and mutation guarantees.
- Account for framework differences between class attributes, class bindings, and style objects.

### References and lifecycle

- Define ref/reference composition where a framework supports it.
- Preserve target ref behavior and avoid mutating caller-owned ref objects.
- Specify cleanup/detachment behavior, including lifecycle-specific behavior.
- State clearly when a framework cannot expose a compatible reference.

### Forwarding and accessibility

- Define which contributed props are forwarded and which must be consumed by the composing component.
- Avoid silently forwarding composition-only props to DOM elements.
- Preserve caller-provided accessibility attributes according to the chosen precedence policy.
- Do not claim accessibility compliance merely because props are forwarded; component authors remain responsible for semantic correctness.

## Type-level contract

Runtime composition and type-level composition are both intended parts of UniversalSlots. They may be developed in separate milestones, but the runtime design must not make the type-level contract impossible or needlessly framework-specific.

Type-level composition should aim to:

- Preserve target-specific props and useful inference for custom components and intrinsic elements.
- Represent the composing component's accepted props without accidentally exposing implementation-only props to the target.
- Define conflict behavior for props supplied by both the composing component and target.
- Preserve or appropriately constrain target ref types.
- Preserve event/callback types where possible.
- Reject invalid target/prop combinations when the framework's type system can express that constraint.
- Clearly document cases that require runtime validation or cannot be represented statically.

The specification should distinguish the **runtime contract** from each framework's **type adapter**. A framework-neutral conceptual contract does not imply one shared TypeScript utility can express every framework's component types.

Type-level tests should verify public consumer behavior rather than internal helper types.

## Shared runtime policy engine

The initial framework-neutral runtime policy implementation lives in the
`@universal-slots/core` package. Framework adapters delegate common prop
composition to this package and supply their own event-handler recognition
convention. Adapters remain responsible for native element/VNode/template
manipulation, target validation, refs, and lifecycle behavior.

The core policy engine currently defines:

- Target props win for ordinary properties, including explicitly present
  `undefined` values.
- Recognized target and source event handlers run target-first, then source;
  an identical function reference is invoked once, and `preventDefault()` does
  not suppress the source handler.
- `class` and `className` string values concatenate source-first, target-last;
  empty or unsupported values are omitted by the core string policy.
- Style objects are shallow-merged, with target values winning; nullish values
  fall back to the non-nullish value.
- Non-object, non-nullish style values are rejected by the default policy.
- Adapters may override class/style _value handling_ for framework-native
  representations, but must preserve the contract's merge order and precedence.

These are UniversalSlots semantics, not an attempt to copy every existing
consumer's policy. In particular, the current Praxis implementation suppresses
the composing handler when the target event is default-prevented and has its own
class/style normalization behavior. Praxis integration must explicitly adapt those differences rather
than changing the shared contract implicitly.

`@universal-slots/core` has no framework or Praxis dependency. Framework
adapters may depend on it; Praxis and other component libraries may depend on
UniversalSlots packages, but UniversalSlots must never import their types or
runtime code.

## Framework adapter model

The contract is framework-independent in intent, not in implementation. Adapters may use different native mechanisms and may expose capability differences.

- React is the first validation target.
- Preact is a useful subsequent comparison because of its React-like component model, but compatibility must be demonstrated rather than assumed.
- Vue, Svelte, Solid, Lit, and native Web Components should be evaluated against concrete composition requirements before committing to support.
- Native content projection (such as Web Component `<slot>`) is not automatically equivalent to polymorphic composition.
- An adapter must declare unsupported capabilities rather than silently degrade behavior.

Do not create adapter packages or abstractions solely because a framework appears in the research list.

## React-specific profile

The existing [React Slot Semantics](./react-slot-semantics.md) document defines a React-specific implementation profile, including React element validation, child-first prop precedence, event composition, class/style merging, and React 19 refs.

That profile is not itself the framework-neutral contract. As the universal contract is finalized:

- Keep React-only details (React element validation, `key`, React refs, React event conventions) in the React profile.
- Reconcile any shared behavior with this document explicitly.
- Record framework-specific divergences rather than generalizing React behavior without evidence.
- Treat the current React profile as proposed until reviewed against this model.

## Initial composition contract (v1)

The following decisions are settled for the initial contract. They are deliberately
simple and fixed; adapters must not introduce configurable precedence or handler
policies that make the shared behavior unpredictable.

### API and target model

- UniversalSlots provides a **low-level composition primitive** through each
  framework adapter. Component libraries may build higher-level APIs such as
  `asChild` on top of it; UniversalSlots does not prescribe those APIs.
- The primitive receives composition props and one target, then applies the
  contributions to that target while preserving its identity and rendering
  responsibility.
- Native/intrinsic elements and custom framework components are supported when
  they can accept and forward the relevant props.
- The primitive does not replace ordinary `children`, content projection, or
  render props. It does not select a target from a `as`/`asChild` prop.
- Unsupported target shapes must fail clearly or be rejected by the adapter.
  Capability limitations must not silently discard composition props.

### Ordinary props and special props

- For ordinary props, **target props win** when the target explicitly specifies
  the prop, including values such as `undefined`, `null`, and `false`.
- Composition props are forwarded only when the target prop is absent.
- Composition-only props are consumed by the adapter and must not leak to the
  rendered host element.
- The adapter owns framework-specific metadata and forwarding rules.

### Event handlers

- Recognized event handlers are composed rather than treated as ordinary props.
- The target handler runs first; the composing handler runs second.
- `preventDefault()` does not suppress the composing handler.
- Only handlers recognized by the adapter's event convention are composed.
  Arbitrary function-valued props are ordinary props and follow target-wins
  precedence.
- A target's explicit `undefined` handler blocks forwarding/composition of the
  composing handler.

### Class and style

- Class values are concatenated in composition order: composing component first,
  target last. Empty values are omitted; no class conflict resolution is done.
- Style objects are shallow-merged in composition order, with the target taking
  precedence for conflicting properties.
- Input style objects must not be mutated.
- Adapters may define their own supported class/style value shapes, but must
  document deviations from this baseline.

### References and lifecycle

- Ref composition is supported where the framework exposes refs/references.
- All composed refs receive the same underlying instance or reference.
- Original caller-owned ref objects are not mutated or replaced.
- Cleanup/detachment follows the framework's lifecycle semantics and must be
  documented by the adapter.
- An adapter that cannot provide compatible ref composition must report that
  capability as unsupported rather than silently dropping refs.

### Nested composition

- Nested composition is supported in v1 when the adapter can preserve the
  contract.
- Contributions accumulate from the outermost composing component toward the
  innermost target.
- Ordinary props use target-wins precedence at each layer; therefore the
  deepest target wins a conflict.
- Event handlers run from the deepest target outward through composing layers.
- Classes concatenate from outermost to innermost target.
- Style properties are merged outermost to innermost, with the deepest target
  winning conflicts.
- Ref composition includes all layers and follows the adapter's lifecycle rules.

### Type-level contract

- Type-level composition is part of the intended product, not merely a consumer
  responsibility.
- Each framework adapter supplies type-level APIs appropriate to that
  framework; a single framework-neutral TypeScript utility is not required.
- The initial React adapter must preserve useful target props and inference,
  expose composition props, and preserve/constrain target ref types.
- Runtime validation remains necessary for cases that static types cannot
  reliably reject.

### Adapter capabilities

The shared contract defines the intended behavior. Adapters may declare a
capability unsupported only when the framework cannot provide it reliably;
they must not silently claim full conformance. Capability declarations should
identify the affected behavior and explain the limitation.

## Deferred decisions

The following remain intentionally deferred:

- Configurable prop precedence or event-handler policies.
- Arbitrary function-prop composition.
- Class conflict resolution (including Tailwind-aware merging).
- Fragment, multiple-target, and non-element target support.
- Universal API syntax beyond the low-level adapter primitive.
- Framework support beyond the initial React validation target and subsequent
  evidence-based adapter research.
- A shared TypeScript type utility across frameworks.

## Conformance strategy

Conformance tests should describe observable outcomes and be divided into:

- Framework-neutral semantic cases.
- Adapter-specific cases for behavior that cannot be shared.
- Type-level consumer cases.
- Explicit unsupported-capability cases.

A test must not require a particular implementation technique (such as `cloneElement`) unless it is testing an adapter-specific implementation constraint.

The React US-004 test suite is a React profile test suite. It should be reconciled with the universal contract after this specification is reviewed; it should not automatically be treated as the entire cross-framework conformance suite.

## Acceptance criteria for this specification

- Polymorphic composition is clearly distinguished from content projection and ordinary children.
- Composing component, target, primitive, adapter, and target identity are defined.
- Runtime and type-level requirements are documented separately.
- Prop, event, class/style, ref/lifecycle, forwarding, and nested-composition semantics are settled for v1; deferred capabilities are explicit.
- Framework-neutral requirements are separated from React-specific behavior.
- The React profile is related to, but not mistaken for, the universal contract.
- No implementation or dependency changes are required by this milestone.
