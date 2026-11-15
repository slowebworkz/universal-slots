import { describe, expect, it, vi } from "vitest";

import { composeRefs } from "./compose-refs.js";

describe("composeRefs", () => {
  it("assigns object and callback refs and cleans both up once", () => {
    const objectRef = { current: null as string | null };
    const callbackRef = vi.fn();
    const cleanup = composeRefs<string>(objectRef, callbackRef)("node");

    expect(objectRef.current).toBe("node");
    expect(callbackRef).toHaveBeenCalledWith("node");

    (cleanup as () => void)();
    (cleanup as () => void)();
    expect(objectRef.current).toBeNull();
    expect(callbackRef).toHaveBeenCalledTimes(2);
    expect(callbackRef).toHaveBeenLastCalledWith(null);
  });

  it("uses a callback ref's own cleanup instead of calling it with null", () => {
    const refCleanup = vi.fn();
    const ref = vi.fn(() => refCleanup);
    const cleanup = composeRefs<string>(ref)("node");

    (cleanup as () => void)();
    expect(refCleanup).toHaveBeenCalledOnce();
    expect(ref).toHaveBeenCalledOnce();
  });

  it("returns nothing on detach and skips nullish refs", () => {
    const objectRef = { current: "node" as string | null };

    expect(
      composeRefs<string>(undefined, null, objectRef)(null),
    ).toBeUndefined();
    expect(objectRef.current).toBeNull();
  });

  it("deduplicates refs, including across nested compositions", () => {
    const ref = vi.fn();
    const inner = composeRefs<string>(ref);

    composeRefs<string>(inner, ref)("node");
    expect(ref).toHaveBeenCalledOnce();
  });
});
