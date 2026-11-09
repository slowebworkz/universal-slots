import { cloneElement, Fragment, isValidElement, useMemo } from "react";
import type { ReactElement, ReactNode, Ref, RefCallback } from "react";

type ComposableRef<T> =
  Ref<T> | ((instance: T | null) => void | (() => void)) | null | undefined;

export type SlotProps = Record<string, unknown> & {
  children?: ReactNode;
  // `any` keeps the ref assignable to whichever element the child renders.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref?: ComposableRef<any>;
};

const slotError =
  "UniversalSlots Slot expects exactly one non-fragment React element child.";

function isEventHandler(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

function mergeClassNames(slotClass: unknown, targetClass: unknown): unknown {
  const slotValue =
    typeof slotClass === "string" && slotClass.trim() !== ""
      ? slotClass.trim()
      : undefined;
  const targetValue =
    typeof targetClass === "string" && targetClass.trim() !== ""
      ? targetClass.trim()
      : undefined;

  if (slotValue && targetValue) {
    return `${slotValue} ${targetValue}`;
  }

  return targetValue ?? slotValue;
}

function isStyleObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStyle(value: unknown): void {
  if (value != null && !isStyleObject(value)) {
    throw new TypeError("UniversalSlots Slot expects style objects.");
  }
}

// Callers must have validated both values with assertStyle.
function mergeStyles(slotStyle: unknown, targetStyle: unknown): unknown {
  if (slotStyle == null) return targetStyle;
  if (targetStyle == null) return slotStyle;

  return { ...(slotStyle as object), ...(targetStyle as object) };
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
export function Slot({ children, ref: slotRef, ...slotProps }: SlotProps) {
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
        ? composeRefs(slotRef, targetRef)
        : slotRef,
    [slotRef, targetRef],
  );

  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error(slotError);
  }

  const target = children as ReactElement<Record<string, unknown>>;
  const targetProps = target.props;
  const mergedProps: Record<string, unknown> = { ...slotProps };

  assertStyle(slotProps.style);
  assertStyle(targetProps.style);

  for (const propName of Object.keys(targetProps)) {
    const targetValue = targetProps[propName];
    const slotValue = slotProps[propName];

    if (propName === "className") {
      mergedProps.className = mergeClassNames(slotValue, targetValue);
      continue;
    }

    if (propName === "style") {
      mergedProps.style = mergeStyles(slotValue, targetValue);
      continue;
    }

    if (
      isEventHandler(propName) &&
      typeof targetValue === "function" &&
      typeof slotValue === "function"
    ) {
      mergedProps[propName] = (...args: unknown[]) => {
        targetValue(...args);
        slotValue(...args);
      };
      continue;
    }

    // Explicit target values, including undefined, take precedence.
    mergedProps[propName] = targetValue;
  }

  if (composedRef != null) {
    mergedProps.ref = composedRef;
  }

  return cloneElement(target, mergedProps);
}
