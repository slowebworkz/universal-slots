# Praxis Kit integration proof of concept

This document records the first integration seam validated against the Praxis Kit
React adapter. It is an integration recipe, not a dependency or an instruction to
make UniversalSlots depend on Praxis Kit.

## Scope of the proof of concept

Praxis Kit already owns several responsibilities that UniversalSlots should not
replace:

- `applySlot` and `extractSlottable` locate the actual merge target and rebuild
  surrounding siblings.
- `composeRefs` and the React-version-specific clone helpers preserve Praxis
  Kit's React 18 and React 19 ref behavior.
- `createContractComponent`, prop filtering, component contracts, variants,
  presets, defaults, and diagnostics remain Praxis Kit responsibilities.

The reusable seam is the prop-composition operation inside
`makeCloneSlotChild`. Praxis can retain its extraction, clone, and ref lifecycle
while delegating the framework-neutral prop merge to `@universal-slots/core`.

This is preferable to wrapping every Praxis child in UniversalSlots React
`Slot`: the latter would add another rendering layer and would not replace
Praxis's `Slottable` extraction or version-specific ref handling. The React
adapter remains useful to consumers that want UniversalSlots to own the full
single-element Slot operation.

## Policy mapping

The current Praxis merge operation receives the Slot contribution first and the
child contribution second. That maps directly to UniversalSlots' `sourceProps`
and `targetProps` arguments.

| Praxis behavior                                       | UniversalSlots configuration                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Child-first event handlers                            | `mergeEvent` wrapper that reverses the two handlers when calling `chainHandlers` |
| `defaultPrevented` suppresses the Slot handler        | Reuse Praxis `chainHandlers`                                                     |
| Praxis class/Tailwind merge                           | Reuse `mergeClassNames`                                                          |
| Praxis shallow style merge and nullish-child fallback | Reuse `mergeStyles`                                                              |
| React event-name classification                       | Reuse `isReactEventKey`                                                          |
| Ordinary child prop wins                              | Core default precedence                                                          |
| Same handler reference is invoked once                | Core default deduplication                                                       |

## Minimal integration change

In Praxis Kit's `adapters/react/src/shared/slot/make-clone-slot-child.ts`,
replace the `mergeProps` call with the core function and the existing Praxis
policies. The surrounding child extraction, ref composition, and cloning remain
unchanged.

```ts
import { mergeCompositionProps } from "@universal-slots/core";
import {
  chainHandlers,
  mergeClassNames,
  mergeStyles,
} from "@praxis-kit/adapter-utils";
import type { EventHandler } from "@praxis-kit/adapter-utils";

import { isReactEventKey } from "./predicates";

// Inside makeCloneSlotChild, after childProps is obtained:
const merged = mergeCompositionProps(slotProps, childProps, {
  isEventHandler: isReactEventKey,
  mergeEvent: (slotHandler, childHandler) =>
    chainHandlers(childHandler as EventHandler, slotHandler as EventHandler),
  mergeClass: mergeClassNames,
  mergeStyle: mergeStyles,
});
```

The cast at the event-policy boundary adapts UniversalSlots' intentionally
framework-neutral callback type to Praxis's existing handler type. It does not
introduce React event types into UniversalSlots core.

The import from `@universal-slots/core` must be a declared dependency of the
Praxis package that owns this call. Do not import UniversalSlots private source
paths. Until the public package is published or made available through an
intentional local workspace/link setup, this snippet is a design proof rather
than a directly applicable cross-repository patch.

## Compatibility cases to verify in Praxis

Before replacing the existing merge function in Praxis, run its adapter tests
against at least these cases:

1. Child handler runs before Slot handler.
2. Child `preventDefault()` suppresses the Slot handler.
3. A shared handler reference runs once.
4. Praxis `cn` class behavior is retained for strings, arrays, and object values.
5. Child style keys override Slot style keys.
6. A nullish child style falls back to the Slot style.
7. A present but non-record child style remains the winning value, matching the
   existing Praxis behavior.
8. Child ordinary props win, including explicitly present `undefined`.
9. React 18 and React 19 ref lifecycle tests remain unchanged.
10. `Slottable` extraction and sibling rebuilding remain unchanged.

The UniversalSlots core compatibility tests cover event order and cancellation,
shared-handler deduplication, string class ordering, style precedence and
fallback, non-record child styles, and ordinary child prop precedence. They do
not execute Praxis Kit's actual `cn` implementation. The `cn` input matrix and
the last three framework/extraction cases must be verified in the Praxis
repository, where those implementations live.

## Integration boundary

UniversalSlots owns the generic merge algorithm and accepts policies for
framework- or library-specific values. Praxis Kit supplies its existing
policies and continues to own the component-contract and rendering layers.
Neither project should import the other's private implementation.
