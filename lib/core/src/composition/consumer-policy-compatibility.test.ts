import { describe, expect, it, vi } from "vitest";

import { mergeCompositionProps } from "../index.js";

import type { MergeEventPolicy, MergeValuePolicy } from "../index.js";

const isEventHandler = (name: string) => /^on[A-Z]/.test(name);

type LooseHandler = (...values: unknown[]) => unknown;

const mergePraxisEvent: MergeEventPolicy =
  (slotHandler, childHandler) =>
  (...args: unknown[]) => {
    const event = args[0] as { defaultPrevented?: boolean } | null | undefined;

    (childHandler as LooseHandler)(...args);
    if (!(typeof event === "object" && event?.defaultPrevented === true)) {
      (slotHandler as LooseHandler)(...args);
    }
  };

const mergePraxisClass: MergeValuePolicy = (slot, child) =>
  [slot, child]
    .filter(
      (value): value is string => typeof value === "string" && value !== "",
    )
    .join(" ");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Mirrors Praxis Kit's current mergeStyles policy: nullish child values fall
// back to the Slot value, while present non-record values remain child-wins.
const mergePraxisStyle: MergeValuePolicy = (slot, child) => {
  if (child == null) return slot;
  if (!isRecord(slot) || !isRecord(child)) return child;
  return { ...slot, ...child };
};

describe("consumer policy compatibility", () => {
  it("reproduces Praxis event order and preventDefault behavior", () => {
    const order: string[] = [];
    const slotHandler = vi.fn(() => order.push("slot"));
    const childHandler = vi.fn((event: { defaultPrevented: boolean }) => {
      order.push("child");
      event.defaultPrevented = true;
    });
    const merged = mergeCompositionProps(
      { onClick: slotHandler },
      { onClick: childHandler },
      { isEventHandler, mergeEvent: mergePraxisEvent },
    );
    const event = { defaultPrevented: false };

    (merged.onClick as (value: typeof event) => void)(event);

    expect(order).toEqual(["child"]);
    expect(childHandler).toHaveBeenCalledOnce();
    expect(slotHandler).not.toHaveBeenCalled();
  });

  it("runs the child handler before the Slot handler when not prevented", () => {
    const order: string[] = [];
    const slotHandler = vi.fn(() => order.push("slot"));
    const childHandler = vi.fn(() => order.push("child"));
    const merged = mergeCompositionProps(
      { onClick: slotHandler },
      { onClick: childHandler },
      { isEventHandler, mergeEvent: mergePraxisEvent },
    );

    (merged.onClick as () => void)();

    expect(order).toEqual(["child", "slot"]);
  });

  it("runs a shared event handler reference only once", () => {
    const handler = vi.fn();
    const mergeEvent = vi.fn(mergePraxisEvent);
    const merged = mergeCompositionProps(
      { onClick: handler },
      { onClick: handler },
      { isEventHandler, mergeEvent },
    );

    (merged.onClick as () => void)();

    expect(handler).toHaveBeenCalledOnce();
    expect(mergeEvent).not.toHaveBeenCalled();
  });

  it("delegates class merging and preserves Slot-to-child order", () => {
    const merged = mergeCompositionProps(
      { className: "slot-base" },
      { className: "child-variant" },
      { isEventHandler, mergeClass: mergePraxisClass },
    );

    expect(merged.className).toBe("slot-base child-variant");
  });

  it("reproduces Praxis style precedence and nullish-child fallback", () => {
    const slotStyle = { color: "red", padding: 4 };
    const childStyle = { color: "blue" };

    const merged = mergeCompositionProps(
      { style: slotStyle },
      { style: childStyle },
      { isEventHandler, mergeStyle: mergePraxisStyle },
    );
    const nullishChild = mergeCompositionProps(
      { style: slotStyle },
      { style: undefined },
      { isEventHandler, mergeStyle: mergePraxisStyle },
    );

    expect(merged.style).toEqual({ color: "blue", padding: 4 });
    expect(nullishChild.style).toBe(slotStyle);
    expect(slotStyle).toEqual({ color: "red", padding: 4 });
  });

  it("preserves a present non-record child style value", () => {
    const merged = mergeCompositionProps(
      { style: { color: "red" } },
      { style: "custom-style-token" },
      { isEventHandler, mergeStyle: mergePraxisStyle },
    );

    expect(merged.style).toBe("custom-style-token");
  });

  it("retains ordinary child prop precedence including explicit undefined", () => {
    const merged = mergeCompositionProps(
      { title: "slot title" },
      { title: undefined },
      { isEventHandler },
    );

    expect(Object.hasOwn(merged, "title")).toBe(true);
    expect(merged.title).toBeUndefined();
  });
});
