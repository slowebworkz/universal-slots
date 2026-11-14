/**
 * Framework-neutral composition policies for combining source props with a target.
 *
 * `sourceProps` are contributed by the composing component; `targetProps` belong
 * to the element/component that remains responsible for rendering.
 */
export type CompositionProps = Record<string, unknown>;

export type EventHandlerClassifier = (propName: string) => boolean;

/**
 * Combines source and target values. Either argument may be `undefined` when
 * that composition layer does not provide the corresponding property.
 */
export type MergeValuePolicy = (
  sourceValue: unknown,
  targetValue: unknown,
) => unknown;

/**
 * Composes two distinct event-handler functions into one. Invoked only when the
 * source and target values are both functions and are not the same reference.
 */
export type EventHandlerValue = (...args: never[]) => unknown;

export type MergeEventPolicy = (
  sourceHandler: EventHandlerValue,
  targetHandler: EventHandlerValue,
) => unknown;

function isEventHandlerValue(value: unknown): value is EventHandlerValue {
  return typeof value === "function";
}

export interface MergeCompositionPropsOptions {
  /** The adapter's convention for identifying event-handler properties. */
  isEventHandler: EventHandlerClassifier;
  /** Override class value handling when the framework accepts non-string values. */
  mergeClass?: MergeValuePolicy;
  /** Override style value handling when the framework has a different style model. */
  mergeStyle?: MergeValuePolicy;
  /** Override how two distinct event-handler functions are composed. */
  mergeEvent?: MergeEventPolicy;
}

function mergeClassValues(sourceValue: unknown, targetValue: unknown): unknown {
  const sourceClass =
    typeof sourceValue === "string" && sourceValue.trim() !== ""
      ? sourceValue.trim()
      : undefined;
  const targetClass =
    typeof targetValue === "string" && targetValue.trim() !== ""
      ? targetValue.trim()
      : undefined;

  if (sourceClass && targetClass) {
    return `${sourceClass} ${targetClass}`;
  }

  return targetClass ?? sourceClass;
}

function isStyleObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStyleObject(value: unknown): void {
  if (value != null && !isStyleObject(value)) {
    throw new TypeError("Composition style values must be objects or nullish.");
  }
}

function mergeStyleObjects(
  sourceValue: unknown,
  targetValue: unknown,
): unknown {
  assertStyleObject(sourceValue);
  assertStyleObject(targetValue);

  if (sourceValue == null) return targetValue;
  if (targetValue == null) return sourceValue;

  return { ...sourceValue, ...targetValue };
}

/** Compose target first, then source, without framework-specific event semantics. */
const mergeEventHandlers: MergeEventPolicy =
  (sourceHandler, targetHandler) =>
  (...args: unknown[]) => {
    (targetHandler as (...values: unknown[]) => unknown)(...args);
    (sourceHandler as (...values: unknown[]) => unknown)(...args);
  };

/**
 * Merge composition contributions into a target's props.
 *
 * Ordinary target props win, including explicitly present `undefined` values.
 * Event handlers are composed target-first, then source by default. An adapter
 * may provide `mergeEvent` to supply a different framework-neutral policy.
 * Class values concatenate and style objects are shallow-merged, with target
 * values taking precedence.
 */
export function mergeCompositionProps(
  sourceProps: CompositionProps,
  targetProps: CompositionProps,
  options: MergeCompositionPropsOptions,
): CompositionProps {
  const merged: CompositionProps = { ...sourceProps };

  // Run source-only class and style props through their policies too, with
  // `undefined` as the target value. Without this pass, unsupported or empty
  // source values would bypass the class and style policies (default or custom)
  // whenever the target did not provide the corresponding prop.
  const mergeClass = options.mergeClass ?? mergeClassValues;
  const mergeStyle = options.mergeStyle ?? mergeStyleObjects;
  const sourceOnlyPolicies: readonly [string, MergeValuePolicy][] = [
    ["class", mergeClass],
    ["className", mergeClass],
    ["style", mergeStyle],
  ];

  for (const [propName, policy] of sourceOnlyPolicies) {
    if (
      Object.hasOwn(sourceProps, propName) &&
      !Object.hasOwn(targetProps, propName)
    ) {
      merged[propName] = policy(sourceProps[propName], undefined);
    }
  }

  for (const propName of Object.keys(targetProps)) {
    const sourceValue = sourceProps[propName];
    const targetValue = targetProps[propName];

    if (propName === "class" || propName === "className") {
      merged[propName] = mergeClass(sourceValue, targetValue);
      continue;
    }

    if (propName === "style") {
      merged.style = mergeStyle(sourceValue, targetValue);
      continue;
    }

    if (
      options.isEventHandler(propName) &&
      isEventHandlerValue(sourceValue) &&
      isEventHandlerValue(targetValue)
    ) {
      // The same callback contributed by both layers represents one handler.
      if (sourceValue === targetValue) {
        merged[propName] = targetValue;
      } else {
        merged[propName] = (options.mergeEvent ?? mergeEventHandlers)(
          sourceValue,
          targetValue,
        );
      }
      continue;
    }

    // An explicitly supplied target value, including undefined, wins.
    merged[propName] = targetValue;
  }

  return merged;
}
