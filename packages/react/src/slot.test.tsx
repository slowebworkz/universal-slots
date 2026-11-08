// @vitest-environment jsdom

// These contract tests are skipped until US-005 implements Slot; their assertions
// remain in place and are typechecked in the meantime.

import { createRef, type MouseEvent, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

describe("Slot conformance", () => {
  describe("prop precedence", () => {
    it.skip("P-01 forwards a slot prop absent from the child", () => {
      render(
        <Slot title="from-slot">
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").getAttribute("title")).toBe(
        "from-slot",
      );
    });

    it.skip("P-02 lets the child win for an ordinary conflicting prop", () => {
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

    it.skip("P-03 preserves an explicit child false value", () => {
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

    it.skip("P-04 forwards a slot prop when the child prop is absent", () => {
      render(
        <Slot aria-label="slot label">
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").getAttribute("aria-label")).toBe(
        "slot label",
      );
    });

    it.skip("P-04a child undefined overrides slot", () => {
      render(
        <Slot title="slot title">
          <button data-testid="target" title={undefined}>
            target
          </button>
        </Slot>,
      );

      expect(screen.getByTestId("target").hasAttribute("title")).toBe(false);
    });

    it.skip("P-05 preserves the child element's own children", () => {
      render(
        <Slot>
          <button data-testid="target">child content</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").textContent).toBe("child content");
    });
  });

  describe("event handlers", () => {
    it.skip("E-01 invokes child handler before slot handler", () => {
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

    it.skip("E-02 slot handler runs after child preventDefault", () => {
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

    it.skip("E-03/E-03a slot handler forwards without child handler", () => {
      const slotHandler = vi.fn();

      render(
        <Slot onClick={slotHandler}>
          <button data-testid="target">target</button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(slotHandler).toHaveBeenCalledOnce();
    });

    it.skip("E-03b child handler works without slot handler", () => {
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

    it.skip("E-03c undefined child handler blocks slot handler", () => {
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

    it.skip("E-05 composes custom on[A-Z] callbacks", () => {
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

    it.skip("E-04 does not compose non-event function props", () => {
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
    it.skip("C-01 concatenates slot class before child class", () => {
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

    it.skip("C-02 preserves a single non-empty class value", () => {
      render(
        <Slot className="slot-class">
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(screen.getByTestId("target").className).toBe("slot-class");
    });
  });

  describe("style", () => {
    it.skip("S-01 merges distinct style keys", () => {
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

    it.skip("S-02 gives child style precedence on conflicts", () => {
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

    it.skip("S-03 does not mutate either style object", () => {
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
    it.skip("R-01 callback refs receive same instance", () => {
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

    it.skip("R-02 object refs receive same instance", () => {
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

    it.skip("R-03 composes callback and object refs", () => {
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

    it.skip("R-05 runs callback ref cleanup functions on unmount", () => {
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

    it.skip("R-06 callback refs receive null on detach", () => {
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
  });

  describe("child validation", () => {
    it.skip("V-01 throws a stable error when there is no child", () => {
      expect(() => render(<Slot />)).toThrow(slotError);
    });

    it.skip("V-02 throws a stable error for multiple children", () => {
      expect(() =>
        render(
          <Slot>
            <button>one</button>
            <button>two</button>
          </Slot>,
        ),
      ).toThrow(slotError);
    });

    it.skip.each(["text", 123])("V-03 rejects child %s", (child) => {
      expect(() => render(<Slot>{child as ReactNode}</Slot>)).toThrow(
        slotError,
      );
    });

    it.skip("V-04 rejects fragment children", () => {
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

    it.skip("V-05 renders a valid single element", () => {
      render(
        <Slot>
          <button data-testid="target">target</button>
        </Slot>,
      );

      expect(document.body.contains(screen.getByTestId("target"))).toBe(true);
    });
  });
});
