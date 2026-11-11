import {
  mergeCompositionProps,
  type MergeEventPolicy,
} from "@universal-slots/core";
import { cloneElement, Fragment, isValidElement, useMemo } from "react";
import type {
  ElementType,
  ReactElement,
  ReactNode,
  Ref,
  RefCallback,
} from "react";

import type { ReactTargetRef } from "./types.js";

type ComposableRef<T> =
  Ref<T> | ((instance: T | null) => void | (() => void)) | null | undefined;

/** Optional framework-neutral policies that customize React Slot composition. */
export interface SlotCompositionOptions {
  /** Override how distinct recognized event handlers are composed. */
  mergeEvent?: MergeEventPolicy;
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

const slotError =
  "UniversalSlots Slot expects exactly one non-fragment React element child.";

function isEventHandler(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

// Maps each composed callback to the original refs it applies, so nested
// compositions can flatten and deduplicate by original ref identity.
const composedSources = new WeakMap<object, readonly ComposableRef<never>[]>();

function flattenRefs<T>(refs: ComposableRef<T>[]): ComposableRef<T>[] {
  return refs.flatMap((ref) =>
    ref != null && typeof ref === "function" && composedSources.has(ref)
      ? (composedSources.get(ref) as ComposableRef<T>[])
      : [ref],
  );
}

function composeRefs<T>(...refs: ComposableRef<T>[]): RefCallback<T> {
  // The same ref can be contributed by several composition layers. Treat ref
  // identity as the unit of composition so it is assigned and cleaned up once.
  const uniqueRefs = [...new Set(flattenRefs(refs))];

  const composed: RefCallback<T> = (instance) => {
    const cleanups: (() => void)[] = [];

    for (const ref of uniqueRefs) {
      if (ref == null) continue;

      if (typeof ref === "function") {
        const cleanup = ref(instance);

        if (typeof cleanup === "function") {
          cleanups.push(cleanup);
        } else if (instance !== null) {
          cleanups.push(() => {
            ref(null);
          });
        }
      } else {
        ref.current = instance;

        if (instance !== null) {
          cleanups.push(() => {
            ref.current = null;
          });
        }
      }
    }

    if (instance === null) return;

    let cleaned = false;

    return () => {
      if (cleaned) return;
      cleaned = true;

      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

  composedSources.set(composed, uniqueRefs as ComposableRef<never>[]);
  return composed;
}

/**
 * Composes props and behavior onto a single React element while preserving the
 * target element's identity and rendering responsibility.
 *
 * This is a low-level primitive. Component libraries can build APIs such as
 * `asChild` on top of it.
 */
export function Slot<Target extends ElementType = ElementType>({
  children,
  ref: slotRef,
  composition,
  ...slotProps
}: SlotProps<Target>) {
  // Hooks run before validation so the hook order never depends on a throw.
  // The composed ref is memoized so React does not detach and re-attach both
  // refs on every re-render.
  const targetRef = isValidElement(children)
    ? ((children.props as Record<string, unknown>)
        .ref as ComposableRef<unknown>)
    : undefined;
  const composedRef = useMemo(
    () =>
      slotRef != null && targetRef != null
        ? composeRefs(slotRef as ComposableRef<unknown>, targetRef)
        : (slotRef as ComposableRef<unknown>),
    [slotRef, targetRef],
  );

  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error(slotError);
  }

  const target = children as ReactElement<Record<string, unknown>>;
  const mergedProps = mergeCompositionProps(slotProps, target.props, {
    isEventHandler,
    // Pick known options explicitly so untyped input cannot override
    // event classification or other core options.
    ...(composition?.mergeEvent != null && {
      mergeEvent: composition.mergeEvent,
    }),
  });

  if (composedRef != null) {
    mergedProps.ref = composedRef;
  }

  return cloneElement(target, mergedProps);
}
