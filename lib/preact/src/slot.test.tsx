// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createRef, Fragment, h, render } from "preact";

import { Slot } from "./slot.js";

const containers: HTMLElement[] = [];

function mount(vnode: Parameters<typeof render>[0]): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  containers.push(container);
  render(vnode, container);
  return container;
}

afterEach(() => {
  for (const container of containers.splice(0)) {
    render(null, container);
    container.remove();
  }
});

describe("Preact Slot", () => {
  it("composes class, style objects, and ordinary target props", () => {
    const container = mount(
      h(
        Slot,
        {
          className: "source-class",
          style: { color: "blue", padding: "4px" },
          title: "source",
        },
        h(
          "button",
          {
            className: "target-class",
            style: { color: "red", margin: "2px" },
            title: "target",
          },
          "target",
        ),
      ),
    );

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.className).toBe("source-class target-class");
    expect(button?.title).toBe("target");
    expect(button?.style.color).toBe("red");
    expect(button?.style.padding).toBe("4px");
    expect(button?.style.margin).toBe("2px");
  });

  it("normalizes source-only and target-only class strings", () => {
    const sourceOnly = mount(
      h(Slot, { className: " source-only " }, h("button", {}, "target")),
    );
    const targetOnly = mount(
      h(Slot, {}, h("button", { className: " target-only " }, "target")),
    );

    expect(sourceOnly.querySelector("button")?.className).toBe("source-only");
    expect(targetOnly.querySelector("button")?.className).toBe("target-only");
  });

  it("rejects invalid non-string, non-signal class values", () => {
    expect(() =>
      mount(h(Slot, { className: 42 as never }, h("button", {}, "target"))),
    ).toThrow(/Preact composition class values/);
  });

  it("preserves Preact CSS-string styles with target precedence", () => {
    const container = mount(
      h(
        Slot,
        { style: { color: "blue" } },
        h("button", { style: "color: red" }, "target"),
      ),
    );

    expect(container.querySelector("button")?.style.color).toBe("red");
  });

  it("preserves target signal-like class values for a Preact signal integration", () => {
    const targetClass = {
      value: "target-class",
      peek() {
        return this.value;
      },
      subscribe() {
        return () => undefined;
      },
    };
    let receivedClass: unknown;
    function Target(props: { className: unknown }) {
      receivedClass = props.className;
      return h("button", {}, "target");
    }
    mount(
      h(
        Slot,
        { className: "source-class" },
        h(Target, { className: targetClass }),
      ),
    );

    expect(receivedClass).toBe(targetClass);
  });

  it("preserves target signal-like style values for a Preact signal integration", () => {
    const targetStyle = {
      value: { color: "red" },
      peek() {
        return this.value;
      },
      subscribe() {
        return () => undefined;
      },
    };
    let receivedStyle: unknown;
    function Target(props: { style: unknown }) {
      receivedStyle = props.style;
      return h("button", {}, "target");
    }
    mount(
      h(Slot, { style: { padding: "4px" } }, h(Target, { style: targetStyle })),
    );

    expect(receivedStyle).toBe(targetStyle);
  });

  it("preserves source signal-like class values when the target has no class", () => {
    const sourceClass = {
      value: "source-class",
      peek() {
        return this.value;
      },
      subscribe() {
        return () => undefined;
      },
    };
    let receivedClass: unknown;
    function Target(props: { className?: unknown }) {
      receivedClass = props.className;
      return h("button", {}, "target");
    }
    mount(
      h(
        Slot,
        { className: sourceClass as never },
        h(Target, { className: undefined }),
      ),
    );

    expect(receivedClass).toBe(sourceClass);
  });

  it("preserves source signal-like style values when the target style is undefined", () => {
    const sourceStyle = {
      value: { color: "red" },
      peek() {
        return this.value;
      },
      subscribe() {
        return () => undefined;
      },
    };
    let receivedStyle: unknown;
    function Target(props: { style?: unknown }) {
      receivedStyle = props.style;
      return h("button", {}, "target");
    }
    mount(
      h(Slot, { style: sourceStyle as never }, h(Target, { style: undefined })),
    );

    expect(receivedStyle).toBe(sourceStyle);
  });

  it("falls back to source style when the target style is nullish", () => {
    const container = mount(
      h(
        Slot,
        { style: { color: "blue" } },
        h("button", { style: undefined }, "target"),
      ),
    );

    expect(container.querySelector("button")?.style.color).toBe("blue");
  });

  it("rejects invalid non-object, non-string style values", () => {
    expect(() =>
      mount(h(Slot, { style: 42 as never }, h("button", {}, "target"))),
    ).toThrow(/Preact composition style values/);
  });

  it("runs target handlers before source handlers without cancellation coupling", () => {
    const calls: string[] = [];
    const container = mount(
      h(
        Slot,
        {
          onClick: () => calls.push("source"),
        },
        h(
          "button",
          {
            onClick: (event: MouseEvent) => {
              calls.push("target");
              event.preventDefault();
            },
          },
          "target",
        ),
      ),
    );

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    container.querySelector("button")?.dispatchEvent(event);

    expect(calls).toEqual(["target", "source"]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("invokes an identical handler reference once", () => {
    const calls: string[] = [];
    const handler = () => calls.push("handler");
    const container = mount(
      h(
        Slot,
        { onClick: handler },
        h("button", { onClick: handler }, "target"),
      ),
    );

    container
      .querySelector("button")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(calls).toEqual(["handler"]);
  });

  it("composes object and callback refs and cleans them up", () => {
    const objectRef = createRef<HTMLButtonElement | null>();
    const callbackInstances: (HTMLButtonElement | null)[] = [];
    let callbackCleanups = 0;
    const callbackRef = (instance: HTMLButtonElement | null) => {
      callbackInstances.push(instance);
      if (instance !== null) {
        return () => {
          callbackCleanups += 1;
        };
      }
    };

    const container = mount(
      h(
        Slot<"button">,
        { ref: callbackRef },
        h("button", { ref: objectRef }, "target"),
      ),
    );

    const button = container.querySelector("button");
    expect(objectRef.current).toBe(button);
    expect(callbackInstances).toEqual([button]);

    render(null, container);

    expect(objectRef.current).toBe(null);
    expect(callbackCleanups).toBe(1);
    expect(callbackInstances).toEqual([button]);
  });

  it("deduplicates the same ref across nested Slots", () => {
    const instances: (HTMLButtonElement | null)[] = [];
    const sharedRef = (instance: HTMLButtonElement | null) => {
      instances.push(instance);
    };
    const nested = h(
      Slot<"button">,
      { ref: sharedRef },
      h("button", {}, "target"),
    );
    const container = mount(h(Slot<"button">, { ref: sharedRef }, nested));

    expect(instances).toHaveLength(1);
    expect(instances[0]).toBe(container.querySelector("button"));
  });

  it("rejects non-VNode, multiple, and Fragment children", () => {
    expect(() => mount(h(Slot, {}, "not a vnode"))).toThrow(
      /exactly one non-fragment VNode/,
    );
    expect(() => mount(h(Slot, {}, [h("span", {}), h("span", {})]))).toThrow(
      /exactly one non-fragment VNode/,
    );
    expect(() => mount(h(Slot, {}, h(Fragment, {}, h("span", {}))))).toThrow(
      /exactly one non-fragment VNode/,
    );
  });
});
