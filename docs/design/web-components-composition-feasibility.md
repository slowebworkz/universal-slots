# Native Web Components Composition Feasibility

Status: investigation plan; no implementation decision has been made.

## Purpose

Assess whether UniversalSlots can provide its existing polymorphic composition contract to native Web Components without depending on Lit or another rendering framework.

This investigation is motivated by two Praxis Kit integration gaps: `asChild` and `compose.with` could not be supported by its Lit and Web Components adapters. Those APIs are motivating integration use cases, not dependencies or requirements of UniversalSlots' public API. UniversalSlots must continue to define a framework-independent composition contract and remain independent of Praxis Kit.

The investigation must distinguish polymorphic composition from native content projection. An HTML `<slot>` distributes light-DOM children into a shadow tree; that behavior alone does not clone a target, apply composition contributions to it, or preserve the target as the rendering responsibility while merging props and behavior.

## Existing contract to evaluate against

Use [Polymorphic Composition Semantics](./polymorphic-composition.md) as the source of truth. Do not invent a separate Web Components contract during this investigation.

The assessment must account for the current core policies:

- Ordinary target props take precedence, including explicitly present `undefined` values.
- Recognized event handlers compose target-first, then source, under the default `chain` policy; identical function references run once.
- `class` and `className` string values concatenate source-first, target-last.
- Style objects merge shallowly with target values winning.
- Framework adapters own target validation, element manipulation, reference handling, and lifecycle behavior.

Where native platform concepts do not map directly to these policies, document the mismatch and its observable consequence. Do not silently weaken or reinterpret the contract.

## Scope

Investigate native platform capabilities relevant to a DOM-backed adapter:

- Custom Elements and their construction, connection, disconnection, adoption, and attribute/property behavior.
- Light DOM, Shadow DOM, slot assignment, and event retargeting.
- DOM node identity, ownership, movement, cloning, and replacement.
- Element properties versus attributes, including boolean, object-valued, and property-only values.
- Event listener identity, options, ordering, removal, and cleanup.
- Class and style composition on existing elements.
- Element references and lifecycle-safe composition/cleanup.
- Nested composition and repeated composition.
- Custom-element targets and elements with closed or open shadow roots.
- Browser support and any required platform feature detection.

The investigation may consider a DOM-native helper layer, but must compare it with an implementation contained entirely within the Web Components adapter. It must not assume that a shared DOM foundation is desirable merely because Lit and native Web Components both use the DOM.

## Required questions

### Target identity and substitution

1. What is the native adapter's composition target: an existing `Element`, a `Node`, a custom element instance, or another explicit target shape?
2. Can the adapter preserve the target's identity while applying contributions, or would a proposed technique replace, clone, move, or wrap it?
3. What happens to listeners, expando properties, internal state, form state, focus, selection, and custom-element lifecycle when a node is cloned or replaced?
4. Which target shapes must be rejected, including text nodes, comments, fragments, multiple targets, or already-connected nodes?
5. Can the adapter support a target that is owned by another rendering system without taking over that system's updates?

### Property and attribute behavior

1. Which contributions are applied as DOM properties, attributes, or another mechanism, and how is that distinction determined?
2. How are property-only values, object values, boolean attributes, `aria-*`, `data-*`, and explicitly undefined values handled?
3. Can target-wins precedence be preserved without losing the distinction between absent and explicitly present values?
4. How are framework-specific or custom-element properties handled without assuming that every property is an HTML attribute?
5. Which composition-only props must be consumed rather than forwarded?

### Events

1. How will the adapter identify event-handler contributions without treating arbitrary function-valued properties as handlers?
2. Can it preserve the core target-first/source-second ordering and identical-handler de-duplication?
3. How will listener options (`capture`, `once`, `passive`, `signal`) be reconciled when composing listeners?
4. How will listeners be removed when composition ends or the target is disconnected?
5. How do Shadow DOM retargeting and composed events affect observable handler behavior?
6. Are event handler properties (`onclick`) and `addEventListener` contributions treated differently, and if so, how is the contract kept clear?

### Class and style

1. Can the existing class concatenation policy be applied without overwriting classes managed by the target's owner?
2. Can style-object merging be mapped safely to `CSSStyleDeclaration` while preserving target precedence?
3. What happens when another renderer subsequently updates the same class or style attributes?
4. Is ownership or cleanup metadata needed to remove only the adapter's contributions?

### References, lifecycle, and ownership

1. What does a reference mean for this adapter, and how is the target's existing reference preserved?
2. When and where are composition contributions installed and removed?
3. How are disconnect/reconnect cycles handled for custom elements?
4. Can cleanup be deterministic if the target is moved between parents or documents?
5. What happens if the target or its owner independently mutates the same properties, attributes, listeners, class list, or style declaration?
6. What ownership rules are necessary to avoid fighting a framework renderer or custom-element implementation?

### Nested composition and `compose.with` integration

1. Can multiple composition layers be applied deterministically while preserving the core merge policies?
2. How are duplicate contributions, repeated application, and idempotency handled?
3. Can the resulting primitive support the composition patterns that Praxis Kit currently exposes through `compose.with`?
4. Which parts of `compose.with` are Universal Slots responsibilities, and which remain Praxis Kit orchestration or component-author responsibilities?
5. What additional contract details must be specified before claiming compatibility?

Do not define or implement a Praxis Kit-specific `compose.with` API in UniversalSlots. Record an integration mapping separately from the framework-neutral contract.

## Required experiments

The assessment should include small browser-based prototypes or focused experiments for the following cases:

1. Compose contributions onto an existing native element without changing its identity.
2. Compose onto a custom element before and after it is connected.
3. Disconnect and reconnect a composed custom element and verify listener cleanup/reinstallation.
4. Apply property-only and attribute-backed values, including `aria-*`, `data-*`, boolean values, object values, and explicit `undefined`.
5. Compose two event handlers and verify ordering, de-duplication, listener options, and cleanup.
6. Apply class and style contributions while an independent owner subsequently updates the same element.
7. Apply nested composition more than once and verify deterministic, idempotent behavior.
8. Exercise a target inside and across Shadow DOM boundaries, including composed events.

Record the browser/runtime, setup, observed behavior, and limitations for each experiment. A conceptual argument alone is insufficient to claim feasibility where DOM ownership or lifecycle behavior is uncertain.

## Conformance implications

Map each supported behavior to a conformance test before recommending implementation. Reuse the shared conformance suite where its assertions are framework-neutral; add Web Components-specific browser tests for DOM identity, custom-element lifecycle, Shadow DOM, event retargeting, and cleanup.

At minimum, the proposed test plan must cover:

- Target identity preservation.
- Target-wins ordinary prop precedence, including explicit `undefined`.
- Event ordering and identical-handler de-duplication.
- Class and style merge behavior.
- Reference preservation and cleanup.
- Invalid and unsupported target handling.
- Nested composition and repeated application.
- Disconnect/reconnect and external mutation behavior.

Do not mark the adapter conformant based only on unit tests that use mocked DOM objects.

## Deliverables

The investigation is complete when it produces:

1. A capability matrix identifying supported, conditionally supported, and unsupported contract areas.
2. Results from the required experiments, with reproducible notes.
3. An ownership and lifecycle model for composed targets.
4. A proposed mapping from Praxis Kit's `asChild` and `compose.with` use cases to the UniversalSlots contract, without introducing Praxis Kit dependencies.
5. A list of contract gaps requiring a framework-neutral specification change, if any.
6. An implementation recommendation: proceed, proceed with documented limitations, or do not implement under the current contract.
7. Acceptance criteria and a browser-level test plan for a subsequent implementation branch.

## Decision criteria

Recommend implementation only if the adapter can preserve target identity and ownership, apply the existing merge policies predictably, clean up its effects across lifecycle transitions, and coexist with independently managed DOM updates.

If a capability cannot be supported, state the exact limitation and its impact on `asChild`-style and `compose.with`-style integration. Do not claim universal compatibility based on partial prop forwarding.

A shared DOM-native foundation should be recommended only if the experiments demonstrate a stable, reusable boundary that does not impose DOM-specific assumptions on React or Preact and does not create conflicting ownership between adapters.

## Non-goals

- Implementing the Web Components adapter in this investigation branch.
- Implementing or depending on Lit.
- Replacing native `<slot>` content projection.
- Defining a Praxis Kit API or importing Praxis Kit types.
- Changing the existing core merge policies merely to accommodate the DOM.
- Claiming support for all custom elements or rendering systems without evidence.
