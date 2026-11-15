/**
 * Any ref a framework element can carry: an object ref, or a callback ref that
 * may return a cleanup function. `null`/`undefined` mean "no ref".
 *
 * Structural on purpose, so it accepts React and Preact refs without
 * importing either framework.
 */
export type ComposableRef<T> =
  | { current: T | null }
  | ((instance: T | null) => void | (() => void))
  | null
  | undefined;

/** Callback ref produced by {@link composeRefs}. */
export type ComposedRef<T> = (instance: T | null) => void | (() => void);

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
export function composeRefs<T>(...refs: ComposableRef<T>[]): ComposedRef<T> {
  // The same ref can be contributed by several composition layers. Treat ref
  // identity as the unit of composition so it is assigned and cleaned up once.
  const uniqueRefs = [...new Set(flattenRefs(refs))];

  const composed: ComposedRef<T> = (instance) => {
    const cleanups: (() => void)[] = [];

    for (const ref of uniqueRefs) {
      if (ref === null || ref === undefined) continue;

      if (typeof ref === "function") {
        const cleanup = ref(instance);

        if (typeof cleanup === "function") {
          // Callback ref with its own cleanup.
          cleanups.push(cleanup);
        } else if (instance !== null) {
          // Callback ref without a cleanup: called with `null` on detach.
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
