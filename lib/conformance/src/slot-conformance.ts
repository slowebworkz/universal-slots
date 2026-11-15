import { describe, expect, it, vi } from "vitest";

/**
 * What a framework adapter supplies so the shared suite can build and mount
 * its elements. Everything is framework-neutral: elements are opaque values
 * created by `h`, and assertions read the resulting DOM.
 */
export interface SlotConformanceAdapter {
  /** Label for the generated `describe` block. */
  name: string;
  /** The adapter's `Slot` component. */
  Slot: unknown;
  /** The framework's fragment type, used to test fragment rejection. */
  Fragment: unknown;
  /** The error the adapter throws for an invalid child. */
  childError: string | RegExp;
  /** Create an element: `h("button", { title: "x" }, "label")`. */
  h(
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): unknown;
  /** Create an object ref that the framework understands. */
  createRef(): { current: unknown };
  /** Mount into the document and return the container plus an unmount. */
  mount(element: unknown): { container: HTMLElement; unmount: () => void };
  /** Dispatch a click on an element the way the framework expects. */
  click(element: Element): void;
}

type Props = Record<string, unknown>;

/**
 * Registers the behaviours every adapter must share: prop, event, class, style
 * and ref composition, child validation and nested slots. Adapter-specific
 * behaviour (signals, StrictMode, re-render lifecycles) stays in the adapter.
 *
 * Call inside a test file that sets the `jsdom` environment and registers its
 * own `afterEach` cleanup.
 */
export function defineSlotConformance(adapter: SlotConformanceAdapter): void {
  const { Slot, Fragment, childError, h, createRef, mount, click } = adapter;

  const target = (container: HTMLElement): HTMLElement => {
    const element = container.querySelector<HTMLElement>(
      '[data-testid="target"]',
    );
    if (!element)
      throw new Error("Expected an element with data-testid=target.");
    return element;
  };

  const button = (props: Props = {}, label = "target") =>
    h("button", { "data-testid": "target", ...props }, label);

  describe(`${adapter.name} Slot conformance`, () => {
    describe("prop precedence", () => {
      it("P-01 forwards a slot prop absent from the child", () => {
        const { container } = mount(h(Slot, { title: "from-slot" }, button()));

        expect(target(container).getAttribute("title")).toBe("from-slot");
      });

      it("P-02 lets the child win for an ordinary conflicting prop", () => {
        const { container } = mount(
          h(Slot, { title: "from-slot" }, button({ title: "from-child" })),
        );

        expect(target(container).getAttribute("title")).toBe("from-child");
      });

      it("P-03 preserves an explicit child false value", () => {
        const Child = ({ disabled }: Props) =>
          h("button", { "data-testid": "target", disabled }, "target");
        const { container } = mount(
          h(Slot, { disabled: true }, h(Child, { disabled: false })),
        );

        expect((target(container) as HTMLButtonElement).disabled).toBe(false);
      });

      it("P-04a lets a child undefined override the slot", () => {
        const { container } = mount(
          h(Slot, { title: "slot title" }, button({ title: undefined })),
        );

        expect(target(container).hasAttribute("title")).toBe(false);
      });

      it("P-05 preserves the child element's own children", () => {
        const { container } = mount(h(Slot, {}, button({}, "child content")));

        expect(target(container).textContent).toBe("child content");
      });

      it("forwards props to custom component targets without replacing them", () => {
        const Probe = ({ value }: Props) =>
          h("button", { "data-testid": "target" }, String(value));
        const { container } = mount(
          h(Slot, { value: "from-slot" }, h(Probe, {})),
        );

        expect(target(container).textContent).toBe("from-slot");
      });

      it("forwards contributed props and refs through a custom target", () => {
        const Link = ({ href, ...props }: Props) => h("a", { href, ...props });
        const linkRef = createRef();
        const { container } = mount(
          h(
            Slot,
            { "aria-label": "profile link", ref: linkRef },
            h(Link, { href: "/profile", "data-testid": "target" }, "Profile"),
          ),
        );

        expect(target(container).getAttribute("href")).toBe("/profile");
        expect(target(container).getAttribute("aria-label")).toBe(
          "profile link",
        );
        expect(linkRef.current).toBe(target(container));
      });
    });

    describe("event handlers", () => {
      it("E-01 invokes the child handler before the slot handler", () => {
        const order: string[] = [];
        const { container } = mount(
          h(
            Slot,
            { onClick: () => order.push("slot") },
            button({ onClick: () => order.push("child") }),
          ),
        );

        click(target(container));

        expect(order).toEqual(["child", "slot"]);
      });

      it("E-02 runs the slot handler after a child preventDefault", () => {
        const slotHandler = vi.fn();
        const childHandler = vi.fn((event: Event) => event.preventDefault());
        const { container } = mount(
          h(Slot, { onClick: slotHandler }, button({ onClick: childHandler })),
        );

        click(target(container));

        expect(childHandler).toHaveBeenCalledOnce();
        expect(slotHandler).toHaveBeenCalledOnce();
      });

      it("E-03 forwards a slot handler when the child has none", () => {
        const slotHandler = vi.fn();
        const { container } = mount(
          h(Slot, { onClick: slotHandler }, button()),
        );

        click(target(container));

        expect(slotHandler).toHaveBeenCalledOnce();
      });

      it("E-03b keeps a child handler when the slot has none", () => {
        const childHandler = vi.fn();
        const { container } = mount(
          h(Slot, {}, button({ onClick: childHandler })),
        );

        click(target(container));

        expect(childHandler).toHaveBeenCalledOnce();
      });

      it("E-03c lets an undefined child handler block the slot handler", () => {
        const slotHandler = vi.fn();
        const { container } = mount(
          h(Slot, { onClick: slotHandler }, button({ onClick: undefined })),
        );

        click(target(container));

        expect(slotHandler).not.toHaveBeenCalled();
      });

      it("E-04 does not compose non-event function props", () => {
        const childHandler = vi.fn();
        const slotHandler = vi.fn();
        const Probe = ({ renderItem }: Props) =>
          h(
            "button",
            { "data-testid": "target", onClick: renderItem },
            "probe",
          );
        const { container } = mount(
          h(
            Slot,
            { renderItem: slotHandler },
            h(Probe, { renderItem: childHandler }),
          ),
        );

        click(target(container));

        expect(childHandler).toHaveBeenCalledOnce();
        expect(slotHandler).not.toHaveBeenCalled();
      });

      it("E-05 composes custom on[A-Z] callbacks", () => {
        const childHandler = vi.fn();
        const slotHandler = vi.fn();
        const Probe = ({ onSelectItem }: Props) =>
          h(
            "button",
            { "data-testid": "target", onClick: onSelectItem },
            "select",
          );
        const { container } = mount(
          h(
            Slot,
            { onSelectItem: slotHandler },
            h(Probe, { onSelectItem: childHandler }),
          ),
        );

        click(target(container));

        expect(childHandler).toHaveBeenCalledOnce();
        expect(slotHandler).toHaveBeenCalledOnce();
      });

      it("uses a custom source-first event policy supplied through composition", () => {
        const order: string[] = [];
        const { container } = mount(
          h(
            Slot,
            {
              composition: {
                mergeEvent:
                  (
                    source: (...args: never[]) => unknown,
                    target: (...args: never[]) => unknown,
                  ) =>
                  (...args: never[]) => {
                    source(...args);
                    target(...args);
                  },
              },
              onClick: () => order.push("slot"),
            },
            button({ onClick: () => order.push("child") }),
          ),
        );

        click(target(container));

        expect(order).toEqual(["slot", "child"]);
      });

      it("consumes composition options instead of forwarding them to the child", () => {
        const received: Props[] = [];
        const Probe = (props: Props) => {
          received.push(props);
          return h("button", { "data-testid": "target" }, "target");
        };

        mount(
          h(Slot, { composition: { mergeClass: () => "x" } }, h(Probe, {})),
        );

        expect(received.at(-1)).not.toHaveProperty("composition");
      });
    });

    describe("className", () => {
      it("C-01 concatenates the slot class before the child class", () => {
        const { container } = mount(
          h(
            Slot,
            { className: "slot-class" },
            button({ className: "child-class" }),
          ),
        );

        expect(target(container).className).toBe("slot-class child-class");
      });

      it("C-02 preserves a single non-empty class value", () => {
        const slotOnly = mount(h(Slot, { className: "slot-only" }, button()));
        const childOnly = mount(
          h(Slot, {}, button({ className: "child-only" })),
        );

        expect(target(slotOnly.container).className).toBe("slot-only");
        expect(target(childOnly.container).className).toBe("child-only");
      });

      it("uses a custom class policy supplied through composition", () => {
        const mergeClass = vi.fn(
          (source: unknown, target: unknown) =>
            `${String(source)}:${String(target)}`,
        );
        const { container } = mount(
          h(
            Slot,
            { composition: { mergeClass }, className: "slot-class" },
            button({ className: "child-class" }),
          ),
        );

        expect(mergeClass).toHaveBeenCalledWith("slot-class", "child-class");
        expect(target(container).className).toBe("slot-class:child-class");
      });
    });

    describe("style", () => {
      it("S-01 merges distinct style keys", () => {
        const { container } = mount(
          h(
            Slot,
            { style: { color: "red" } },
            button({ style: { margin: "2px" } }),
          ),
        );

        expect(target(container).style.color).toBe("red");
        expect(target(container).style.margin).toBe("2px");
      });

      it("S-02 gives child style precedence on conflicts", () => {
        const { container } = mount(
          h(
            Slot,
            { style: { color: "red" } },
            button({ style: { color: "blue" } }),
          ),
        );

        expect(target(container).style.color).toBe("blue");
      });

      it("S-03 does not mutate either style object", () => {
        const slotStyle = { color: "red" };
        const childStyle = { margin: "2px" };

        mount(h(Slot, { style: slotStyle }, button({ style: childStyle })));

        expect(slotStyle).toEqual({ color: "red" });
        expect(childStyle).toEqual({ margin: "2px" });
      });

      it("uses a custom style policy supplied through composition", () => {
        const slotStyle = { color: "red" };
        const childStyle = { color: "blue" };
        const mergeStyle = vi.fn(() => ({ color: "purple" }));
        const { container } = mount(
          h(
            Slot,
            { composition: { mergeStyle }, style: slotStyle },
            button({ style: childStyle }),
          ),
        );

        expect(mergeStyle).toHaveBeenCalledWith(slotStyle, childStyle);
        expect(target(container).style.color).toBe("purple");
      });
    });

    describe("refs", () => {
      it("R-01 gives callback refs the same instance", () => {
        const slotRef = vi.fn();
        const { container } = mount(h(Slot, { ref: slotRef }, button()));

        expect(slotRef).toHaveBeenCalledWith(target(container));
      });

      it("R-02 gives object refs the same instance", () => {
        const slotRef = createRef();
        const { container } = mount(h(Slot, { ref: slotRef }, button()));

        expect(slotRef.current).toBe(target(container));
      });

      it("R-03 composes callback and object refs", () => {
        const slotRef = vi.fn();
        const childRef = createRef();
        const { container } = mount(
          h(Slot, { ref: slotRef }, button({ ref: childRef })),
        );

        expect(slotRef).toHaveBeenCalledWith(target(container));
        expect(childRef.current).toBe(target(container));
      });

      it("R-04 clears object refs on unmount", () => {
        const slotRef = createRef();
        const childRef = createRef();
        const view = mount(
          h(Slot, { ref: slotRef }, button({ ref: childRef })),
        );

        expect(slotRef.current).toBe(target(view.container));
        view.unmount();

        expect(slotRef.current).toBeNull();
        expect(childRef.current).toBeNull();
      });

      it("R-05 runs callback ref cleanup functions on unmount", () => {
        const slotCleanup = vi.fn();
        const childCleanup = vi.fn();
        const view = mount(
          h(
            Slot,
            { ref: vi.fn(() => slotCleanup) },
            button({ ref: vi.fn(() => childCleanup) }),
          ),
        );

        view.unmount();

        expect(slotCleanup).toHaveBeenCalledOnce();
        expect(childCleanup).toHaveBeenCalledOnce();
      });

      it("R-06 gives callback refs without cleanup null on detach", () => {
        const slotRef = vi.fn();
        const childRef = vi.fn();
        const view = mount(
          h(Slot, { ref: slotRef }, button({ ref: childRef })),
        );

        view.unmount();

        expect(slotRef).toHaveBeenLastCalledWith(null);
        expect(childRef).toHaveBeenLastCalledWith(null);
      });

      it("R-08 invokes an identical callback ref once and cleans it up once", () => {
        const cleanup = vi.fn();
        const ref = vi.fn(() => cleanup);
        const view = mount(h(Slot, { ref }, button({ ref })));

        expect(ref).toHaveBeenCalledOnce();
        view.unmount();
        expect(cleanup).toHaveBeenCalledOnce();
      });

      it("R-09 assigns and clears an identical object ref once", () => {
        const ref = createRef();
        const view = mount(h(Slot, { ref }, button({ ref })));

        expect(ref.current).toBe(target(view.container));
        view.unmount();
        expect(ref.current).toBeNull();
      });
    });

    describe("child validation", () => {
      it("V-01 throws a stable error when there is no child", () => {
        expect(() => mount(h(Slot, {}))).toThrow(childError);
      });

      it("V-02 throws a stable error for multiple children", () => {
        expect(() =>
          mount(h(Slot, {}, h("button", {}, "one"), h("button", {}, "two"))),
        ).toThrow(childError);
      });

      it.each(["text", 123])("V-03 rejects child %s", (child) => {
        expect(() => mount(h(Slot, {}, child))).toThrow(childError);
      });

      it("V-04 rejects fragment children", () => {
        expect(() =>
          mount(h(Slot, {}, h(Fragment, {}, h("button", {}, "inside")))),
        ).toThrow(childError);
      });

      it("V-05 renders a valid single element", () => {
        const { container } = mount(h(Slot, {}, button()));

        expect(container.contains(target(container))).toBe(true);
      });
    });

    describe("nested composition", () => {
      it("N-01 applies ordinary props from outer to inner with the target winning", () => {
        const { container } = mount(
          h(
            Slot,
            { title: "outer" },
            h(Slot, { title: "inner" }, button({ title: "target" })),
          ),
        );

        expect(target(container).getAttribute("title")).toBe("target");
      });

      it("N-02 runs handlers from the target outward", () => {
        const order: string[] = [];
        const { container } = mount(
          h(
            Slot,
            { onClick: () => order.push("outer") },
            h(
              Slot,
              { onClick: () => order.push("inner") },
              button({ onClick: () => order.push("target") }),
            ),
          ),
        );

        click(target(container));

        expect(order).toEqual(["target", "inner", "outer"]);
      });

      it("N-03 concatenates classes from outer to target", () => {
        const { container } = mount(
          h(
            Slot,
            { className: "outer" },
            h(Slot, { className: "inner" }, button({ className: "target" })),
          ),
        );

        expect(target(container).className).toBe("outer inner target");
      });

      it("N-04 merges styles from outer to target", () => {
        const { container } = mount(
          h(
            Slot,
            { style: { color: "red", padding: "1px" } },
            h(
              Slot,
              { style: { color: "green" } },
              button({ style: { color: "blue", margin: "2px" } }),
            ),
          ),
        );

        expect(target(container).style.color).toBe("blue");
        expect(target(container).style.padding).toBe("1px");
        expect(target(container).style.margin).toBe("2px");
      });

      it("N-05 composes refs across three levels and cleans each up once", () => {
        const cleanups = [vi.fn(), vi.fn(), vi.fn()];
        const refs = cleanups.map((cleanup) => vi.fn(() => cleanup));
        const view = mount(
          h(
            Slot,
            { ref: refs[0] },
            h(Slot, { ref: refs[1] }, button({ ref: refs[2] })),
          ),
        );

        for (const ref of refs) {
          expect(ref).toHaveBeenCalledOnce();
          expect(ref).toHaveBeenCalledWith(target(view.container));
        }

        view.unmount();

        for (const cleanup of cleanups) expect(cleanup).toHaveBeenCalledOnce();
      });
    });
  });
}
