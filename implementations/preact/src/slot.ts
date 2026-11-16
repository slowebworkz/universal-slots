import {
  composeRefs,
  isEventHandler,
  pickCompositionPolicies,
} from "@universal-slots/adapter-utils";
import {
  assertNullishOr,
  isStyleObject as isCoreStyleObject,
  mergeCompositionProps,
  normalizeClass,
} from "@universal-slots/core";
import { cloneElement, Fragment, isValidElement } from "preact";
import { useMemo } from "preact/hooks";
import {
  isFunction,
  isNonNullish,
  isNullish,
  isObjectType,
  isString,
} from "remeda";

import type { ComposableRef } from "@universal-slots/adapter-utils";
import type { VNode } from "preact";

import type { PreactElementType, SlotProps } from "./types.js";

/** Message of the error thrown when children are not one non-fragment VNode. */
const slotError =
  "UniversalSlots Preact Slot expects exactly one non-fragment VNode child.";

function isSignalLike(value: unknown): boolean {
  return (
    isObjectType(value) &&
    "value" in value &&
    "peek" in value &&
    isFunction(value.peek) &&
    "subscribe" in value &&
    isFunction(value.subscribe)
  );
}

/** Core's style-record check, minus signal-like values, which Preact unwraps. */
function isStyleObject(value: unknown): value is Record<string, unknown> {
  return isCoreStyleObject(value) && !isSignalLike(value);
}

/**
 * Merge plain class strings. Preserve signal-like and other non-string values
 * using target precedence so a Preact signal integration can unwrap them.
 */
function assertPreactClassValue(value: unknown): void {
  assertNullishOr(
    value,
    (allowed) => isString(allowed) || isSignalLike(allowed),
    "Preact composition class values must be strings or signal-like values.",
  );
}

function mergePreactClass(sourceValue: unknown, targetValue: unknown): unknown {
  assertPreactClassValue(sourceValue);
  assertPreactClassValue(targetValue);

  if (isNullish(sourceValue)) {
    return isString(targetValue) ? normalizeClass(targetValue) : targetValue;
  }
  if (isNullish(targetValue)) {
    return isString(sourceValue) ? normalizeClass(sourceValue) : sourceValue;
  }

  if (isString(sourceValue) && isString(targetValue)) {
    const sourceClass = normalizeClass(sourceValue);
    const targetClass = normalizeClass(targetValue);
    if (sourceClass && targetClass) return `${sourceClass} ${targetClass}`;
    return targetClass ?? sourceClass;
  }

  return targetValue;
}

/**
 * Preact accepts CSS strings, style objects, and signal-like values. Merge
 * object pairs; otherwise a present target value wins, with nullish fallback.
 */
function assertPreactStyleValue(value: unknown): void {
  assertNullishOr(
    value,
    (allowed) =>
      isString(allowed) || isStyleObject(allowed) || isSignalLike(allowed),
    "Preact composition style values must be CSS strings, objects, or signal-like values.",
  );
}

function mergePreactStyle(sourceValue: unknown, targetValue: unknown): unknown {
  assertPreactStyleValue(sourceValue);
  assertPreactStyleValue(targetValue);

  if (isNullish(targetValue)) return sourceValue;
  if (isNullish(sourceValue)) return targetValue;

  if (isStyleObject(sourceValue) && isStyleObject(targetValue)) {
    return { ...sourceValue, ...targetValue };
  }

  return targetValue;
}

/**
 * Composes source props onto one Preact VNode while preserving the target VNode.
 * Preact 11 refs are forwarded to component targets and callback refs may return
 * cleanup functions. The adapter preserves those native lifecycle semantics.
 */
export function Slot<Target extends PreactElementType = PreactElementType>({
  children,
  ref: slotRef,
  composition,
  ...slotProps
}: SlotProps<Target>): VNode<Record<string, unknown>> {
  // Host elements carry their ref on the VNode. Component targets (including a
  // nested Slot) receive it as the `ref` prop, so fall back to that.
  const targetRef = isValidElement(children)
    ? (children.ref ??
      ((children.props as Record<string, unknown>)
        .ref as ComposableRef<unknown>))
    : undefined;
  const composedRef = useMemo(
    () =>
      isNonNullish(slotRef) && isNonNullish(targetRef)
        ? composeRefs(
            slotRef as ComposableRef<unknown>,
            targetRef as ComposableRef<unknown>,
          )
        : (slotRef as ComposableRef<unknown>),
    [slotRef, targetRef],
  );

  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error(slotError);
  }

  const mergedProps = mergeCompositionProps(slotProps, children.props, {
    isEventHandler,
    mergeClass: mergePreactClass,
    mergeStyle: mergePreactStyle,
    ...pickCompositionPolicies(composition),
  });

  if (isNonNullish(composedRef)) {
    mergedProps.ref = composedRef;
  }

  return cloneElement(children, mergedProps);
}
