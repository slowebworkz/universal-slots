/**
 * Framework-neutral composition policies for combining source props with a target.
 *
 * `sourceProps` are contributed by the composing component; `targetProps` belong
 * to the element/component that remains responsible for rendering.
 */
export type CompositionProps = Record<string, unknown>;

export type EventHandlerClassifier = (propName: string) => boolean;

export type MergeValuePolicy = (
  sourceValue: unknown,
  targetValue: unknown,
) => unknown;

export interface MergeCompositionPropsOptions {
  /** The adapter's convention for identifying event-handler properties. */
  isEventHandler: EventHandlerClassifier;
  /** Override class value handling when the framework accepts non-string values. */
  mergeClass?: MergeValuePolicy;
  /** Override style value handling when the framework has a different style model. */
  mergeStyle?: MergeValuePolicy;
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

/**
 * Merge composition contributions into a target's props.
 *
 * Ordinary target props win, including explicitly present `undefined` values.
 * Event handlers are composed target-first, then source. Cancellation does not
 * suppress the source handler. Class values concatenate and style objects are
 * shallow-merged, with target values taking precedence.
 */
export function mergeCompositionProps(
  sourceProps: CompositionProps,
  targetProps: CompositionProps,
  options: MergeCompositionPropsOptions,
): CompositionProps {
  // Validate source style even when the target does not provide a style prop,
  // unless the adapter supplied its own style-value policy.
  if (options.mergeStyle == null) {
    assertStyleObject(sourceProps.style);
  }

  const merged: CompositionProps = { ...sourceProps };

  for (const propName of Object.keys(targetProps)) {
    const sourceValue = sourceProps[propName];
    const targetValue = targetProps[propName];

    if (propName === "class" || propName === "className") {
      merged[propName] = (options.mergeClass ?? mergeClassValues)(
        sourceValue,
        targetValue,
      );
      continue;
    }

    if (propName === "style") {
      merged.style = (options.mergeStyle ?? mergeStyleObjects)(
        sourceValue,
        targetValue,
      );
      continue;
    }

    if (
      options.isEventHandler(propName) &&
      typeof sourceValue === "function" &&
      typeof targetValue === "function"
    ) {
      // The same callback contributed by both layers represents one handler.
      if (sourceValue === targetValue) {
        merged[propName] = targetValue;
      } else {
        merged[propName] = (...args: unknown[]) => {
          targetValue(...args);
          sourceValue(...args);
        };
      }
      continue;
    }

    // An explicitly supplied target value, including undefined, wins.
    merged[propName] = targetValue;
  }

  return merged;
}
