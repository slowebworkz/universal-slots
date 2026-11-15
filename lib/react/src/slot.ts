import {
  composeRefs,
  isEventHandler,
  pickCompositionPolicies,
} from "@universal-slots/adapter-utils";
import { mergeCompositionProps } from "@universal-slots/core";
import { isNonNullish } from "remeda";
import { cloneElement, Fragment, isValidElement, useMemo } from "react";

import type {
  ComposableRef,
  SlotCompositionOptions,
} from "@universal-slots/adapter-utils";
import type { ElementType, ReactElement, ReactNode } from "react";

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
