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

## Design decisions to resolve

The specification review must explicitly settle or mark as deferred:

1. Whether prop precedence is fixed or configurable.
2. Which props are composed specially (events, class, style, refs) and which use ordinary precedence.
3. Whether cancellation suppresses composed event handlers.
4. How composition-only props are identified and filtered.
5. What target categories are required for the first release.
6. Whether nested composition is required in v1 and what ordering it uses.
7. Which runtime capabilities are required versus optional per adapter.
8. How much type-level composition is included in the first public release.
9. Whether the public API is a low-level primitive, framework adapter API, or both.

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
- Prop, event, class/style, ref/lifecycle, forwarding, and nested-composition questions are settled or explicitly deferred.
- Framework-neutral requirements are separated from React-specific behavior.
- The React profile is related to, but not mistaken for, the universal contract.
- No implementation or dependency changes are required by this milestone.
