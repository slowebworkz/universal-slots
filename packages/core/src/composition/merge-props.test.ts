import { describe, expect, it, vi } from "vitest";

import { mergeCompositionProps } from "./merge-props.js";

const isEventHandler = (name: string) => /^on[A-Z]/.test(name);

describe("mergeCompositionProps", () => {
  it("forwards source props absent from the target", () => {
    expect(
      mergeCompositionProps(
        { title: "from-source", "aria-label": "source" },
        { id: "target" },
        { isEventHandler },
      ),
    ).toEqual({ title: "from-source", "aria-label": "source", id: "target" });
  });

  it("lets explicitly present target props win, including undefined", () => {
    const merged = mergeCompositionProps(
      { title: "source", disabled: true },
      { title: undefined, disabled: false },
      { isEventHandler },
    );

    expect(Object.hasOwn(merged, "title")).toBe(true);
    expect(merged.title).toBeUndefined();
    expect(merged.disabled).toBe(false);
  });

  it("composes target handlers before source handlers", () => {
    const order: string[] = [];
    const sourceHandler = vi.fn(() => order.push("source"));
    const targetHandler = vi.fn(() => order.push("target"));
    const merged = mergeCompositionProps(
      { onClick: sourceHandler },
      { onClick: targetHandler },
      { isEventHandler },
    );

    (merged.onClick as () => void)();

    expect(order).toEqual(["target", "source"]);
    expect(targetHandler).toHaveBeenCalledOnce();
    expect(sourceHandler).toHaveBeenCalledOnce();
  });

  it("does not invoke an identical handler reference twice", () => {
    const handler = vi.fn();
    const merged = mergeCompositionProps(
      { onClick: handler },
      { onClick: handler },
      { isEventHandler },
    );

    (merged.onClick as () => void)();

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not let preventDefault suppress the source handler", () => {
    const sourceHandler = vi.fn();
    const targetHandler = vi.fn((event: { preventDefault(): void }) => {
      event.preventDefault();
    });
    const merged = mergeCompositionProps(
      { onClick: sourceHandler },
      { onClick: targetHandler },
      { isEventHandler },
    );
    const event = { preventDefault: vi.fn() };

    (merged.onClick as (value: typeof event) => void)(event);

    expect(targetHandler).toHaveBeenCalledOnce();
    expect(sourceHandler).toHaveBeenCalledOnce();
  });

  it("does not compose arbitrary function-valued props", () => {
    const source = vi.fn();
    const target = vi.fn();
    const merged = mergeCompositionProps(
      { renderItem: source },
      { renderItem: target },
      { isEventHandler },
    );

    expect(merged.renderItem).toBe(target);
    expect(source).not.toHaveBeenCalled();
  });

  it("concatenates class and className strings in composition order", () => {
    expect(
      mergeCompositionProps(
        { className: "source", class: "outer" },
        { className: "target", class: "inner" },
        { isEventHandler },
      ),
    ).toEqual({ className: "source target", class: "outer inner" });
  });

  it("allows adapters to provide framework-specific class value handling", () => {
    const merged = mergeCompositionProps(
      { className: ["source", { active: true }] },
      { className: "target" },
      {
        isEventHandler,
        mergeClass: (source, target) => [source, target],
      },
    );

    expect(merged.className).toEqual([["source", { active: true }], "target"]);
  });

  it("shallow-merges styles with target values winning without mutation", () => {
    const sourceStyle = { color: "red", padding: 4 };
    const targetStyle = { color: "blue", margin: 2 };
    const merged = mergeCompositionProps(
      { style: sourceStyle },
      { style: targetStyle },
      { isEventHandler },
    );

    expect(merged.style).toEqual({ color: "blue", padding: 4, margin: 2 });
    expect(sourceStyle).toEqual({ color: "red", padding: 4 });
    expect(targetStyle).toEqual({ color: "blue", margin: 2 });
  });

  it("allows adapters to provide framework-specific style value handling", () => {
    const merged = mergeCompositionProps(
      { style: "color: red" },
      { style: "color: blue" },
      {
        isEventHandler,
        mergeStyle: (source, target) => `${source}; ${target}`,
      },
    );

    expect(merged.style).toBe("color: red; color: blue");
  });

  it("falls back to the non-nullish style value", () => {
    expect(
      mergeCompositionProps(
        { style: { color: "red" } },
        { style: undefined },
        { isEventHandler },
      ).style,
    ).toEqual({ color: "red" });
  });

  it("validates source styles when the target has no style prop", () => {
    expect(() =>
      mergeCompositionProps({ style: "color: red" }, {}, { isEventHandler }),
    ).toThrow("Composition style values must be objects or nullish.");
  });

  it("rejects non-object style values", () => {
    expect(() =>
      mergeCompositionProps(
        { style: "color: red" },
        { style: { color: "blue" } },
        { isEventHandler },
      ),
    ).toThrow("Composition style values must be objects or nullish.");
  });
});
