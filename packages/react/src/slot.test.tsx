// @vitest-environment jsdom

import { createRef, type MouseEvent, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Slot } from "./slot.js";

const slotError =
  "UniversalSlots Slot expects exactly one non-fragment React element child.";

function PropProbe({
  value,
  renderItem,
}: {
  value?: unknown;
  renderItem?: () => void;
}) {
  return (
    <button data-testid="probe" onClick={renderItem}>
      {String(value)}
    </button>
  );
}

function CustomCallbackProbe({ onSelectItem }: { onSelectItem?: () => void }) {
  return (
    <button data-testid="custom-callback" onClick={onSelectItem}>
      select
    </button>
  );
}

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

describe("Slot conformance", () => {
  describe("prop precedence", () => {
    it("P-01 forwards a slot prop absent from the child", () => {
      render(
        <Slot title="from-slot">
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").getAttribute("title")).toBe(
        "from-slot",
      );
    });

    it("P-02 lets the child win for an ordinary conflicting prop", () => {
      render(
        <Slot title="from-slot">
          <button data-testid="target" title="from-child">
            target
          </button>
        </Slot>,
      );

      expect(screen.getByTestId("target").getAttribute("title")).toBe(
        "from-child",
      );
    });

    it("P-03 preserves an explicit child false value", () => {
      const Child = ({ disabled }: { disabled?: boolean }) => (
        <button data-testid="target" disabled={disabled}>
          target
        </button>
      );

      render(
        <Slot disabled>
          <Child disabled={false} />
        </Slot>,
      );

      expect((screen.getByTestId("target") as HTMLButtonElement).disabled).toBe(
        false,
      );
    });

    it("P-04 forwards a slot prop when the child prop is absent", () => {
      render(
        <Slot aria-label="slot label">
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").getAttribute("aria-label")).toBe(
        "slot label",
      );
    });

    it("P-04a child undefined overrides slot", () => {
      render(
        <Slot title="slot title">
          <button data-testid="target" title={undefined}>
            target
          </button>
        </Slot>,
      );

      expect(screen.getByTestId("target").hasAttribute("title")).toBe(false);
    });

    it("P-05 preserves the child element's own children", () => {
      render(
        <Slot>
          <button data-testid="target">child content</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").textContent).toBe("child content");
    });

    it("forwards props to custom component targets without replacing them", () => {
      render(
        <Slot value="from-slot">
          <PropProbe />
        </Slot>,
      );

      expect(screen.getByTestId("probe").textContent).toBe("from-slot");
    });
  });

  describe("event handlers", () => {
    it("E-01 invokes child handler before slot handler", () => {
      const order: string[] = [];
      const childHandler = vi.fn(() => order.push("child"));
      const slotHandler = vi.fn(() => order.push("slot"));

      render(
        <Slot onClick={slotHandler}>
          <button data-testid="target" onClick={childHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(order).toEqual(["child", "slot"]);
    });

    it("E-02 slot handler runs after child preventDefault", () => {
      const slotHandler = vi.fn();
      const childHandler = vi.fn((event: MouseEvent) => event.preventDefault());

      render(
        <Slot onClick={slotHandler}>
          <button data-testid="target" onClick={childHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(childHandler).toHaveBeenCalledOnce();
      expect(slotHandler).toHaveBeenCalledOnce();
    });

    it("E-03/E-03a slot handler forwards without child handler", () => {
      const slotHandler = vi.fn();

      render(
        <Slot onClick={slotHandler}>
          <button data-testid="target">target</button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(slotHandler).toHaveBeenCalledOnce();
    });

    it("E-03b child handler works without slot handler", () => {
      const childHandler = vi.fn();

      render(
        <Slot>
          <button data-testid="target" onClick={childHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(childHandler).toHaveBeenCalledOnce();
    });

    it("E-03c undefined child handler blocks slot handler", () => {
      const slotHandler = vi.fn();

      render(
        <Slot onClick={slotHandler}>
          <button data-testid="target" onClick={undefined}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(slotHandler).not.toHaveBeenCalled();
    });

    it("E-05 composes custom on[A-Z] callbacks", () => {
      const childHandler = vi.fn();
      const slotHandler = vi.fn();

      render(
        <Slot onSelectItem={slotHandler}>
          <CustomCallbackProbe onSelectItem={childHandler} />
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("custom-callback"));

      expect(childHandler).toHaveBeenCalledOnce();
      expect(slotHandler).toHaveBeenCalledOnce();
    });

    it("E-04 does not compose non-event function props", () => {
      const childHandler = vi.fn();
      const slotHandler = vi.fn();

      render(
        <Slot renderItem={slotHandler}>
          <PropProbe value="probe" renderItem={childHandler} />
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("probe"));

      expect(childHandler).toHaveBeenCalledOnce();
      expect(slotHandler).not.toHaveBeenCalled();
    });
  });

  describe("className", () => {
    it("C-01 concatenates slot class before child class", () => {
      render(
        <Slot className="slot-class">
          <button className="child-class" data-testid="target">
            target
          </button>
        </Slot>,
      );

      const target = screen.getByTestId("target");
      expect(target.classList.contains("slot-class")).toBe(true);
      expect(target.classList.contains("child-class")).toBe(true);
      expect(screen.getByTestId("target").className).toBe(
        "slot-class child-class",
      );
    });

    it("C-02 preserves a single non-empty class value", () => {
      render(
        <Slot className="slot-class">
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").className).toBe("slot-class");
    });
  });

  describe("style", () => {
    it("S-01 merges distinct style keys", () => {
      render(
        <Slot style={{ color: "red" }}>
          <button data-testid="target" style={{ backgroundColor: "blue" }}>
            target
          </button>
        </Slot>,
      );

      const target = screen.getByTestId("target") as HTMLButtonElement;
      expect(target.style.color).toBe("red");
      expect(target.style.backgroundColor).toBe("blue");
    });

    it("S-02 gives child style precedence on conflicts", () => {
      render(
        <Slot style={{ color: "red" }}>
          <button data-testid="target" style={{ color: "blue" }}>
            target
          </button>
        </Slot>,
      );

      expect(
        (screen.getByTestId("target") as HTMLButtonElement).style.color,
      ).toBe("blue");
    });

    it("S-03 does not mutate either style object", () => {
      const slotStyle = { color: "red" };
      const childStyle = { backgroundColor: "blue" };
      const slotBefore = { ...slotStyle };
      const childBefore = { ...childStyle };

      render(
        <Slot style={slotStyle}>
          <button data-testid="target" style={childStyle}>
            target
          </button>
        </Slot>,
      );

      expect(slotStyle).toEqual(slotBefore);
      expect(childStyle).toEqual(childBefore);
    });
  });

  describe("refs", () => {
    it("R-01 callback refs receive same instance", () => {
      const slotRef = vi.fn();
      const childRef = vi.fn();

      render(
        <Slot ref={slotRef}>
          <button ref={childRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      const instance = screen.getByTestId("target");
      expect(slotRef).toHaveBeenCalledWith(instance);
      expect(childRef).toHaveBeenCalledWith(instance);
    });

    it("R-02 object refs receive same instance", () => {
      const slotRef = createRef<HTMLButtonElement>();
      const childRef = createRef<HTMLButtonElement>();

      render(
        <Slot ref={slotRef}>
          <button ref={childRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      const instance = screen.getByTestId("target");
      expect(slotRef.current).toBe(instance);
      expect(childRef.current).toBe(instance);
    });

    it("R-03 composes callback and object refs", () => {
      const slotRef = vi.fn();
      const childRef = createRef<HTMLButtonElement>();

      render(
        <Slot ref={slotRef}>
          <button ref={childRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      const instance = screen.getByTestId("target");
      expect(slotRef).toHaveBeenCalledWith(instance);
      expect(childRef.current).toBe(instance);
    });

    it("R-07 does not detach or re-attach composed refs on re-render", () => {
      const slotRef = vi.fn();
      const childRef = vi.fn();

      const ui = (
        <Slot ref={slotRef}>
          <button ref={childRef}>target</button>
        </Slot>
      );
      const { rerender } = render(ui);
      expect(slotRef).toHaveBeenCalledTimes(1);
      expect(childRef).toHaveBeenCalledTimes(1);

      rerender(ui);
      rerender(ui);

      expect(slotRef).toHaveBeenCalledTimes(1);
      expect(childRef).toHaveBeenCalledTimes(1);
    });

    it("R-05 runs callback ref cleanup functions on unmount", () => {
      const slotCleanup = vi.fn();
      const childCleanup = vi.fn();
      const slotRef = vi.fn(() => slotCleanup);
      const childRef = vi.fn(() => childCleanup);

      const view = render(
        <Slot ref={slotRef}>
          <button ref={childRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      view.unmount();

      expect(slotCleanup).toHaveBeenCalledOnce();
      expect(childCleanup).toHaveBeenCalledOnce();
    });

    it("R-06 callback refs receive null on detach", () => {
      const slotRef = vi.fn();
      const childRef = vi.fn();

      const view = render(
        <Slot ref={slotRef}>
          <button ref={childRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      view.unmount();

      expect(slotRef).toHaveBeenLastCalledWith(null);
      expect(childRef).toHaveBeenLastCalledWith(null);
    });

    it("R-04 clears object refs on unmount", () => {
      const slotRef = createRef<HTMLButtonElement>();
      const childRef = createRef<HTMLButtonElement>();

      const view = render(
        <Slot ref={slotRef}>
          <button ref={childRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      expect(slotRef.current).toBe(screen.getByTestId("target"));
      expect(childRef.current).toBe(screen.getByTestId("target"));

      view.unmount();

      expect(slotRef.current).toBeNull();
      expect(childRef.current).toBeNull();
    });
  });

  describe("child validation", () => {
    it("V-01 throws a stable error when there is no child", () => {
      expect(() => render(<Slot />)).toThrow(slotError);
    });

    it("V-02 throws a stable error for multiple children", () => {
      expect(() =>
        render(
          <Slot>
            <button>one</button>
            <button>two</button>
          </Slot>,
        ),
      ).toThrow(slotError);
    });

    it.each(["text", 123])("V-03 rejects child %s", (child) => {
      expect(() => render(<Slot>{child as ReactNode}</Slot>)).toThrow(
        slotError,
      );
    });

    it("V-04 rejects fragment children", () => {
      expect(() =>
        render(
          <Slot>
            <>
              <button>inside</button>
            </>
          </Slot>,
        ),
      ).toThrow(slotError);
    });

    it("V-05 renders a valid single element", () => {
      render(
        <Slot>
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(document.body.contains(screen.getByTestId("target"))).toBe(true);
    });
    describe("nested composition", () => {
      it("N-01 applies ordinary props from outer to inner with target winning", () => {
        render(
          <Slot title="outer">
            <Slot title="inner">
              <button data-testid="target" title="target">
                target
              </button>
            </Slot>
          </Slot>,
        );

        expect(screen.getByTestId("target").getAttribute("title")).toBe(
          "target",
        );
      });

      it("N-02 runs handlers from target outward", () => {
        const order: string[] = [];
        const targetHandler = vi.fn(() => order.push("target"));
        const innerHandler = vi.fn(() => order.push("inner"));
        const outerHandler = vi.fn(() => order.push("outer"));

        render(
          <Slot onClick={outerHandler}>
            <Slot onClick={innerHandler}>
              <button data-testid="target" onClick={targetHandler}>
                target
              </button>
            </Slot>
          </Slot>,
        );

        fireEvent.click(screen.getByTestId("target"));

        expect(order).toEqual(["target", "inner", "outer"]);
      });

      it("N-03 concatenates classes from outer to target", () => {
        render(
          <Slot className="outer">
            <Slot className="inner">
              <button data-testid="target" className="target">
                target
              </button>
            </Slot>
          </Slot>,
        );

        expect(screen.getByTestId("target").className).toBe(
          "outer inner target",
        );
      });

      it("N-04 merges styles from outer to target", () => {
        render(
          <Slot style={{ color: "red", padding: "1px" }}>
            <Slot style={{ color: "green" }}>
              <button
                data-testid="target"
                style={{ color: "blue", margin: "2px" }}
              >
                target
              </button>
            </Slot>
          </Slot>,
        );

        const target = screen.getByTestId("target") as HTMLButtonElement;
        expect(target.style.color).toBe("blue");
        expect(target.style.padding).toBe("1px");
        expect(target.style.margin).toBe("2px");
      });
    });
  });
});
