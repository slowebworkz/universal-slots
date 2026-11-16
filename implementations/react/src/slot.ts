import {
  composeRefs,
  isEventHandler,
  pickCompositionPolicies,
} from "@universal-slots/adapter-utils";
import { mergeCompositionProps } from "@universal-slots/core";
import { isNonNullish } from "remeda";
import {
  cloneElement,
  forwardRef,
  Fragment,
  isValidElement,
  useMemo,
  version,
} from "react";

import type {
  ComposableRef,
  SlotCompositionOptions,
} from "@universal-slots/adapter-utils";
import type { ElementType, ReactElement, ReactNode, Ref } from "react";

import type { ReactTargetRef } from "./types.js";

export type { SlotCompositionOptions };

/**
 * Props accepted by the low-level Slot primitive.
 *
 * The source layer may contribute arbitrary props, so its runtime prop bag
 * remains open. Supply the target element/component as the generic argument
 * when a target-specific ref type is required, e.g. `Slot<"a">` or
 * `Slot<typeof Link>`.
 */
export type SlotProps<Target extends ElementType = ElementType> =
  SlotPropsWithoutRef & {
    ref?: ReactTargetRef<Target>;
  };

/**
 * Slot props without `ref`. Declared directly because `Omit` on the open prop
 * bag would collapse it to an index signature and widen `children` to `unknown`.
 */
type SlotPropsWithoutRef = Record<string, unknown> & {
  children?: ReactNode;
  composition?: SlotCompositionOptions;
};

/** Message of the error thrown when `children` is not a single, non-fragment element. */
const slotError =
  "UniversalSlots Slot expects exactly one non-fragment React element child.";

const usesLegacyElementRef = Number.parseInt(version, 10) === 18;

/** Read the child ref from the location used by the installed React major. */
function getTargetRef(children: ReactNode): ComposableRef<unknown> {
  if (!isValidElement(children)) return undefined;

  if (usesLegacyElementRef) {
    // React 18 stores refs on the element; React 19 moves them into props.
    // Keep this structural to avoid depending on deprecated React 19 typings.
    return (children as unknown as { ref?: ComposableRef<unknown> }).ref;
  }

  return (children.props as Record<string, unknown>)
    .ref as ComposableRef<unknown>;
}

/**
 * Composes props and behavior onto a single React element while preserving the
 * target element's identity and rendering responsibility.
 *
 * This is a low-level primitive. Component libraries can build APIs such as
 * `asChild` on top of it.
 *
 * Supports React 18 and 19. The target ref is read from the location used by
 * the installed React major, then composed with the Slot ref when both exist.
 */
function SlotImpl(
  { children, composition, ...slotProps }: SlotPropsWithoutRef,
  forwardedRef: Ref<unknown>,
) {
  const slotRef = forwardedRef as ComposableRef<unknown>;
  // Hooks run before validation so the hook order never depends on a throw.
  // Memoized so React does not detach and re-attach both refs on every
  // re-render. With only one ref present there is nothing to compose, and a
  // lone target ref already survives in the merged props.
  const targetRef = getTargetRef(children);
  const composedRef = useMemo(() => {
    if (isNonNullish(slotRef) && isNonNullish(targetRef)) {
      const composed = composeRefs(
        slotRef as ComposableRef<unknown>,
        targetRef,
      );

      // React 18 does not support callback-ref cleanup functions: it warns when
      // a callback ref returns one. Discard the cleanup and rely on React 18
      // calling the ref with `null` on detach, which detaches every original ref.
      return usesLegacyElementRef
        ? (instance: unknown) => {
            composed(instance);
          }
        : composed;
    }

    // React 18 does not retain the child's ref in target.props, so even a lone
    // target ref must be passed explicitly when cloning the element.
    return (slotRef ?? targetRef) as ComposableRef<unknown>;
  }, [slotRef, targetRef]);

  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error(slotError);
  }

  // Validated above: exactly one non-fragment element.
  const target = children as ReactElement<Record<string, unknown>>;
  const mergedProps = mergeCompositionProps(slotProps, target.props, {
    isEventHandler,
    // Pick known options explicitly so untyped input cannot override
    // event classification or other core options.
    ...pickCompositionPolicies(composition),
  });

  // Use the slot ref, or the slot and target refs composed. This replaces any
  // target ref carried over in the merged props.
  if (isNonNullish(composedRef)) {
    mergedProps.ref = composedRef;
  }

  // Clone rather than wrap so the target keeps its type, key and identity.
  return cloneElement(target, mergedProps);
}

/**
 * Forward the Slot ref explicitly so the same public API works on React 18,
 * where function components do not receive `ref` as an ordinary prop.
 */
export const Slot = forwardRef(SlotImpl) as unknown as <
  Target extends ElementType = ElementType,
>(
  props: SlotProps<Target>,
) => ReactElement;
