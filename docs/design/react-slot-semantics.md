# React Slot Semantics

Status: proposed specification for the initial React adapter

This document defines the behavior to settle before implementing the React adapter.
Radix Slot is a compatibility reference, not an automatic source of requirements.
UniversalSlots should adopt behavior intentionally and document any differences.

## Scope

The initial adapter targets React-style slot substitution: a slot component receives
props and applies them to a single child element. This is distinct from native
content projection (such as Web Component `<slot>`), which does not replace a
child element or merge its props.

This task is specification and test planning only. It does not implement the
adapter or introduce dependencies.

## API proposal

The initial public shape is:

```tsx
<Slot>
  <a href="/profile">Profile</a>
</Slot>
```

The slot receives props that are merged onto its child. An explicit `asChild`
prop is not required if the component itself always performs slot substitution.
If the eventual API needs both ordinary rendering and child substitution, settle
that separately before implementation.

The first release should support one React element child. Arrays, strings,
numbers, portals, and multiple children are not slot targets. Fragment support
is deferred unless the implementation can define meaningful prop/ref behavior
for fragments.

## Semantics to adopt for the first release

These are proposed defaults. Any intentional deviation should be recorded here
before tests are written.

### Prop precedence

- Child props win when both the slot and child specify the same ordinary prop.
- Slot props are forwarded only when the prop is **absent** from the child's
  props (`!(name in childProps)`). A prop that is present with the value
  `undefined` counts as specified, so the child's `undefined` wins.
- `children` is special: the child element's own children are preserved.
- `key` is React reconciliation metadata and is not treated as a forwarded DOM
  prop.
- `ref` is special and follows the ref-composition rules below.

This mirrors the common Radix Slot convention of child-first precedence.

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

The event-composition cancellation policy is a deliberate UniversalSlots
decision; it should not be assumed to match every existing slot library.

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

### `ref`

- If both slot and child provide refs, compose them so both receive the same
  underlying instance.
- Support callback refs and object refs.
- Do not mutate or replace the original ref objects.
- Ref cleanup behavior depends on the supported React version (see
  [Supported React versions](#supported-react-versions)); R-04 cannot be
  finalized until that decision is made.
- If only one ref exists, preserve it without unnecessary wrapping when feasible.

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
- Throw a clear, stable error for zero children or multiple children.
- Reject non-element children such as strings and numbers.
- Initially reject fragments as slot targets; fragments do not provide a
  reliable host instance for prop forwarding or ref composition.
- Do not silently select the first child from an array.

## Supported React versions

**Open decision; must be settled before implementation.** The package declares
no React peer dependency yet. React 18 and 19 differ in ref behavior, so this
affects runtime code and type declarations (for example, `ref` as a regular
prop in 19 versus `element.ref` in 18).

Decide:

- Whether the first release targets React 18, React 19, or both.
- Callback ref cleanup. React 19 lets a callback ref return a cleanup function
  and skips the `null` call when it does; React 18 always calls the ref with
  `null` on detach. The composed ref must either return a cleanup that runs
  each ref's cleanup (or clears it with `null` when it returned none), or call
  each ref with `null`.

Recommendation: target React 19 only for the first release, declare the peer
range accordingly, and add 18 support only on demand.

## Deferred behavior

The following are outside the first release unless a concrete use case requires
them:

- Fragment targets
- Automatic class-name conflict resolution
- Arbitrary function-prop composition
- Configurable event-handler ordering
- Configurable prop-precedence policies
- Multiple child targets
- Framework-neutral runtime abstractions beyond what the React adapter needs

## Conformance test matrix

Tests should assert observable outcomes, not implementation details.

| ID    | Scenario                                                   | Expected outcome                                                   |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| P-01  | Slot provides prop absent from child                       | Slot prop appears on child                                         |
| P-02  | Both provide same ordinary prop                            | Child value wins                                                   |
| P-03  | Child explicitly sets prop to `false`                      | `false` wins                                                       |
| P-04  | Child omits prop (key not present)                         | Slot value is forwarded                                            |
| P-04a | Child explicitly sets prop to `undefined`                  | `undefined` wins; slot value is not forwarded                      |
| P-05  | Child's own `children` conflict with slot children         | Child element's children are preserved                             |
| E-01  | Slot and child handlers both exist                         | Child handler runs, then slot handler                              |
| E-02  | Child handler calls `preventDefault()`                     | Slot handler still runs                                            |
| E-03  | Only one handler exists                                    | That handler runs once                                             |
| E-03a | Slot handler present, child handler absent                 | Slot handler is forwarded and runs once                            |
| E-03b | Child handler present, slot handler absent                 | Child handler runs once                                            |
| E-03c | Child handler explicitly `undefined`, slot handler present | Child `undefined` wins; slot handler does not run                  |
| E-05  | Custom `on[A-Z]` callback on both sides                    | Both are composed (documents the heuristic)                        |
| E-04  | Function-valued non-event prop on both sides               | Child value wins; functions are not composed                       |
| C-01  | Both provide `className`                                   | Slot class then child class, separated by one space                |
| C-02  | Only one provides `className`                              | Single value preserved                                             |
| S-01  | Both provide style objects with distinct keys              | Both keys preserved                                                |
| S-02  | Style key conflicts                                        | Child style wins                                                   |
| S-03  | Style objects are merged                                   | Neither input object is mutated                                    |
| R-01  | Slot and child callback refs                               | Both receive same instance                                         |
| R-02  | Slot and child object refs                                 | Both `.current` values receive same instance                       |
| R-03  | Callback/object ref combination                            | Both refs receive same instance                                    |
| R-04  | Ref detachment/unmount                                     | Both refs are cleared/cleaned per the supported React version      |
| R-05  | Callback ref returns a cleanup function (React 19 only)    | Cleanup runs for each ref on unmount                               |
| R-06  | Callback ref returns nothing                               | Ref is called with `null` on unmount (behavior per chosen version) |
| V-01  | No child                                                   | Stable descriptive error                                           |
| V-02  | More than one child                                        | Stable descriptive error                                           |
| V-03  | String or number child                                     | Stable descriptive error                                           |
| V-04  | Fragment child                                             | Stable descriptive error                                           |
| V-05  | Valid single element                                       | Slot substitution succeeds                                         |

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
