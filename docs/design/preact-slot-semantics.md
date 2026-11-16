# Preact Slot Semantics

**Status:** Experimental adapter profile for Preact 11.

The Preact adapter implements single-VNode polymorphic composition using
Preact's native VNode, `cloneElement`, hooks, and ref lifecycle. It is a distinct
adapter, not an alias for the React adapter or `preact/compat`.

## Scope

`Slot` accepts one Preact VNode child and returns a clone of that VNode with the
source props composed onto its props. It rejects non-VNode children, arrays of
children, and Fragment children. It does not implement a higher-level `asChild`
API, extract slottable descendants, or rebuild surrounding siblings.

The initial adapter targets Preact 11. It relies on Preact 11's default ref
forwarding for function-component targets and does not claim Preact 10 support.

## Prop composition

- Source props are the props contributed by `Slot`.
- Target props are the props already present on the child VNode.
- Ordinary target props win, including explicitly present `undefined` values.
- `class` and `className` concatenate and normalize when both values are
  strings. Non-string values (including Preact signal-like values) use target
  precedence and are passed through so an installed Preact signal integration can
  unwrap them after composition.
  A source signal is retained when the target value is nullish. The adapter does
  not synthesize combined signals; supply `composition.mergeClass` if an
  application needs signal-aware combination.
- When both style values are objects, they are shallowly merged and target
  properties win.
- Preact accepts CSS strings, style objects, and signal-like style values. If
  both values are objects, they are shallowly merged. Otherwise a present target
  value wins; a nullish target falls back to the source value. Signal-like
  values are passed through but are not synthesized or combined. Other invalid
  style values (including numbers and arrays) throw a `TypeError`. Supply
  `composition.mergeStyle` for application-specific signal-aware composition.
- Event props are recognized by `/^on[A-Z]/` and are composed target-first,
  then source, using Core's default policy. `preventDefault()` does not suppress
  the source handler. Supply `composition.mergeEvent` to override this behavior.
- The adapter deduplicates identical handler references through Core.

`composition.mergeClass` and `composition.mergeStyle` can replace the default
class and style policies. These options use the same policy signatures as Core.

## Refs

The slot ref and child VNode ref are composed when both are present. Callback
refs and object refs are supported. Callback cleanup functions are preserved;
callback refs without a cleanup are called with `null` during detach, and object
refs are reset to `null`. Nested compositions flatten previously composed refs
and deduplicate by original ref identity.

Preact 11 forwards refs to function-component targets by default. A custom
component remains responsible for forwarding the received ref and other
composed props to the element it renders.

## Type surface

The adapter exports `PreactTargetProps`, `PreactTargetRef`,
`PreactCompositionProps`, `PreactEventKey`, and `SlotProps`. Intrinsic targets
use their declared ref type; class components use their instance type; function
components use Preact's default ref type unless their props declare a narrower
`ref`. Supply the target generic explicitly because it is not inferred from the
child VNode. The class and style projections accept Preact signal-like values,
CSS strings, and CSS property objects. Event-key classification
uses the `on` plus capital-letter convention; it is a naming convention, not a
complete enumeration of Preact's event system.

## Compatibility

- Supported: Preact `^11.0.0`.
- Not currently claimed: Preact 10, `preact/compat` as a separate React runtime,
  custom renderer integrations, or automatic prop filtering.
- The adapter is experimental until its runtime, declaration, and external
  consumer checks pass in the supported project environment.
