import { mergeCompositionProps } from "@universal-slots/core";
import { isFunction, isNonNullish, isNullish } from "remeda";
import { cloneElement, Fragment, isValidElement, useMemo } from "react";

import type { MergeEventPolicy, MergeValuePolicy } from "@universal-slots/core";
import type {
  ElementType,
  ReactElement,
  ReactNode,
  Ref,
  RefCallback,
} from "react";

import type { ReactTargetRef } from "./types.js";

/**
 * Any ref a React 19 element can carry: an object ref, or a callback ref that
 * may return a cleanup function. `null`/`undefined` mean "no ref".
 */
type ComposableRef<T> =
  Ref<T> | ((instance: T | null) => void | (() => void)) | null | undefined;

/** Optional framework-neutral policies that customize React Slot composition. */
export interface SlotCompositionOptions {
  /** Override how distinct recognized event handlers are composed. */
  mergeEvent?: MergeEventPolicy;
  /** Override class/className value handling for framework-specific values. */
  mergeClass?: MergeValuePolicy;
  /** Override style value handling for framework-specific style models. */
  mergeStyle?: MergeValuePolicy;
}

/**
 * Props accepted by the low-level Slot primitive.
 *
 * The source layer may contribute arbitrary props, so its runtime prop bag
 * remains open. Supply the target element/component as the generic argument
 * when a target-specific ref type is required, e.g. `Slot<"a">` or
 * `Slot<typeof Link>`.
 */
export type SlotProps<Target extends ElementType = ElementType> = Record<
  string,
  unknown
> & {
  children?: ReactNode;
  composition?: SlotCompositionOptions;
  ref?: ReactTargetRef<Target>;
};

/** Message of the error thrown when `children` is not a single, non-fragment element. */
const slotError =
  "UniversalSlots Slot expects exactly one non-fragment React element child.";

/**
 * Classifies React event-handler props: `on` followed by a capital letter.
 * Keep in step with the `ReactEventKey` type in `types.ts`, which mirrors this
 * convention at the type level.
 */
function isEventHandler(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

/**
 * Maps each composed callback to the original refs it applies, so nested
 * compositions can flatten and deduplicate by original ref identity. Weakly
 * keyed so composed callbacks can still be garbage collected.
 */
const composedSources = new WeakMap<object, readonly ComposableRef<never>[]>();

/**
 * Expands any previously composed ref back into the original refs it applies,
 * so nested compositions deduplicate by original ref identity.
 */
function flattenRefs<T>(refs: ComposableRef<T>[]): ComposableRef<T>[] {
  return refs.flatMap((ref) =>
    typeof ref === "function" && composedSources.has(ref)
      ? (composedSources.get(ref) as ComposableRef<T>[])
      : [ref],
  );
}

/**
 * Combines several refs into one callback ref.
 *
 * Each distinct ref is assigned once. Attaching returns a once-only cleanup
 * that detaches every ref: callback refs that return their own cleanup use it,
 * those that do not are called with `null`, and object refs are reset to
 * `null`. Detaching (`instance === null`) returns nothing, because there is
 * nothing left to clean up.
 */
function composeRefs<T>(...refs: ComposableRef<T>[]): RefCallback<T> {
  // The same ref can be contributed by several composition layers. Treat ref
  // identity as the unit of composition so it is assigned and cleaned up once.
  const uniqueRefs = [...new Set(flattenRefs(refs))];

  const composed: RefCallback<T> = (instance) => {
    const cleanups: (() => void)[] = [];

    for (const ref of uniqueRefs) {
      if (isNullish(ref)) continue;

      if (typeof ref === "function") {
        const cleanup = ref(instance);

        if (isFunction(cleanup)) {
          // React 19 callback ref with its own cleanup.
          cleanups.push(cleanup);
        } else if (instance !== null) {
          // Callback ref without a cleanup: React calls it with `null` on detach.
          cleanups.push(() => {
            ref(null);
          });
        }
      } else {
        // Object ref: assign now, reset on cleanup.
        ref.current = instance;

        if (instance !== null) {
          cleanups.push(() => {
            ref.current = null;
          });
        }
      }
    }

    // Detach call: refs were already updated above and nothing remains to clean.
    if (instance === null) return;

    // Makes the cleanup idempotent: later calls do nothing.
    let cleaned = false;

    return () => {
      if (cleaned) return;
      cleaned = true;

      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

  // Record the originals so an outer composition can flatten this one.
  composedSources.set(composed, uniqueRefs as ComposableRef<never>[]);
  return composed;
}

/**
 * Composes props and behavior onto a single React element while preserving the
 * target element's identity and rendering responsibility.
 *
 * This is a low-level primitive. Component libraries can build APIs such as
 * `asChild` on top of it.
 *
 * Requires React 19: the target's own ref is read from `children.props.ref`,
 * where `ref` is an ordinary prop. React 18 keeps it on the element instead.
 */
export function Slot<Target extends ElementType = ElementType>({
  children,
  ref: slotRef,
  composition,
  ...slotProps
}: SlotProps<Target>) {
  // Hooks run before validation so the hook order never depends on a throw.
  //
  // React 19 exposes the target's own ref as `props.ref`. `props` is untyped on
  // a generic element, hence the casts on the refs here and below: the target's
  // ref type is only known at the call site.
  const targetRef = isValidElement(children)
    ? ((children.props as Record<string, unknown>)
        .ref as ComposableRef<unknown>)
    : undefined;
  // Memoized so React does not detach and re-attach both refs on every
  // re-render. With only one ref present there is nothing to compose, and a
  // lone target ref already survives in the merged props.
  const composedRef = useMemo(
    () =>
      isNonNullish(slotRef) && isNonNullish(targetRef)
        ? composeRefs(slotRef as ComposableRef<unknown>, targetRef)
        : (slotRef as ComposableRef<unknown>),
    [slotRef, targetRef],
  );

  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error(slotError);
  }

  // Validated above: exactly one non-fragment element.
  const target = children as ReactElement<Record<string, unknown>>;
  const mergedProps = mergeCompositionProps(slotProps, target.props, {
    isEventHandler,
    // Pick known options explicitly so untyped input cannot override
    // event classification or other core options.
    ...(isNonNullish(composition?.mergeEvent) && {
      mergeEvent: composition.mergeEvent,
    }),
    ...(isNonNullish(composition?.mergeClass) && {
      mergeClass: composition.mergeClass,
    }),
    ...(isNonNullish(composition?.mergeStyle) && {
      mergeStyle: composition.mergeStyle,
    }),
  });

  // Use the slot ref, or the slot and target refs composed. This replaces any
  // target ref carried over in the merged props.
  if (isNonNullish(composedRef)) {
    mergedProps.ref = composedRef;
  }

  // Clone rather than wrap so the target keeps its type, key and identity.
  return cloneElement(target, mergedProps);
}
