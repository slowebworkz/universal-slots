// @vitest-environment jsdom

import { StrictMode, createRef } from "react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Slot } from "./index.js";
import type { SlotCompositionOptions } from "./index.js";

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

function ForwardingLink({
  href,
  ...props
}: ComponentProps<"a"> & { href: string }) {
  return <a href={href} {...props} />;
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

    it("forwards contributed props and refs through a custom target", () => {
      const linkRef = createRef<HTMLAnchorElement>();

      render(
        <Slot aria-label="profile link" ref={linkRef}>
          <ForwardingLink href="/profile" data-testid="target">
            Profile
          </ForwardingLink>
        </Slot>,
      );

      const target = screen.getByTestId("target");
      expect(target.getAttribute("href")).toBe("/profile");
      expect(target.getAttribute("aria-label")).toBe("profile link");
      expect(linkRef.current).toBe(target);
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

    it("uses a custom source-first event policy supplied through composition", () => {
      const order: string[] = [];
      const slotHandler = vi.fn(() => order.push("slot"));
      const childHandler = vi.fn(() => order.push("child"));

      render(
        <Slot
          composition={{
            mergeEvent:
              (sourceHandler, targetHandler) =>
              (...args: never[]) => {
                sourceHandler(...args);
                targetHandler(...args);
              },
          }}
          onClick={slotHandler}
        >
          <button data-testid="target" onClick={childHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(order).toEqual(["slot", "child"]);
    });

    it("supports cancellation-aware child-first event composition", () => {
      const slotHandler = vi.fn();
      const childHandler = vi.fn((event: MouseEvent) => event.preventDefault());

      render(
        <Slot
          composition={{
            mergeEvent:
              (sourceHandler, targetHandler) =>
              (...args: never[]) => {
                const event = args[0] as
                  { defaultPrevented?: boolean } | undefined;

                targetHandler(...args);
                if (!event?.defaultPrevented) {
                  sourceHandler(...args);
                }
              },
          }}
          onClick={slotHandler}
        >
          <button data-testid="target" onClick={childHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(childHandler).toHaveBeenCalledOnce();
      expect(slotHandler).not.toHaveBeenCalled();
    });

    it("applies a custom event policy independently to multiple event props", () => {
      const mergeEvent = vi.fn(
        (
          sourceHandler: (...args: never[]) => unknown,
          targetHandler: (...args: never[]) => unknown,
        ) =>
          (...args: never[]) => {
            targetHandler(...args);
            sourceHandler(...args);
          },
      );
      const slotClick = vi.fn();
      const childClick = vi.fn();
      const slotFocus = vi.fn();
      const childFocus = vi.fn();

      render(
        <Slot
          composition={{ mergeEvent }}
          onClick={slotClick}
          onFocus={slotFocus}
        >
          <button
            data-testid="target"
            onClick={childClick}
            onFocus={childFocus}
          >
            target
          </button>
        </Slot>,
      );

      const target = screen.getByTestId("target");
      fireEvent.click(target);
      fireEvent.focus(target);

      expect(mergeEvent).toHaveBeenCalledTimes(2);
      expect(childClick).toHaveBeenCalledOnce();
      expect(slotClick).toHaveBeenCalledOnce();
      expect(childFocus).toHaveBeenCalledOnce();
      expect(slotFocus).toHaveBeenCalledOnce();
    });

    it("consumes composition options instead of forwarding them to the child", () => {
      const receivedProps: Record<string, unknown>[] = [];

      function CompositionTarget(props: Record<string, unknown>) {
        receivedProps.push(props);
        return <button data-testid="target">target</button>;
      }

      render(
        <Slot composition={{ mergeEvent: (source, target) => target }}>
          <CompositionTarget />
        </Slot>,
      );

      expect(receivedProps.at(-1)).not.toHaveProperty("composition");
    });

    it("preserves a composition prop already supplied by the target", () => {
      const receivedProps: Record<string, unknown>[] = [];
      const targetComposition = { target: true };

      function CompositionTarget(props: Record<string, unknown>) {
        receivedProps.push(props);
        return <button data-testid="target">target</button>;
      }

      render(
        <Slot composition={{ mergeEvent: (source, target) => target }}>
          <CompositionTarget composition={targetComposition} />
        </Slot>,
      );

      expect(receivedProps.at(-1)?.composition).toBe(targetComposition);
    });

    it("does not allow untyped composition options to override event classification", () => {
      const mergeEvent = vi.fn(
        (
          sourceHandler: (...args: never[]) => unknown,
          targetHandler: (...args: never[]) => unknown,
        ) =>
          (...args: never[]) => {
            targetHandler(...args);
            sourceHandler(...args);
          },
      );
      const composition = {
        mergeEvent,
        isEventHandler: () => false,
      } as unknown as SlotCompositionOptions;
      const slotHandler = vi.fn();
      const childHandler = vi.fn();

      render(
        <Slot composition={composition} onClick={slotHandler}>
          <button data-testid="target" onClick={childHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(mergeEvent).toHaveBeenCalledOnce();
      expect(childHandler).toHaveBeenCalledOnce();
      expect(slotHandler).toHaveBeenCalledOnce();
    });

    it("does not invoke a custom policy when both layers use the same handler", () => {
      const sharedHandler = vi.fn();
      const mergeEvent = vi.fn();

      render(
        <Slot composition={{ mergeEvent }} onClick={sharedHandler}>
          <button data-testid="target" onClick={sharedHandler}>
            target
          </button>
        </Slot>,
      );

      fireEvent.click(screen.getByTestId("target"));

      expect(sharedHandler).toHaveBeenCalledOnce();
      expect(mergeEvent).not.toHaveBeenCalled();
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

    it("R-07 keeps composed refs attached when a parent creates a new child element", () => {
      const slotRef = vi.fn();
      const childRef = vi.fn();

      function Parent({ label }: { label: string }) {
        return (
          <Slot ref={slotRef}>
            <button ref={childRef}>{label}</button>
          </Slot>
        );
      }

      const { rerender } = render(<Parent label="first" />);

      expect(slotRef).toHaveBeenCalledTimes(1);
      expect(childRef).toHaveBeenCalledTimes(1);

      rerender(<Parent label="second" />);
      rerender(<Parent label="third" />);

      expect(slotRef).toHaveBeenCalledTimes(1);
      expect(childRef).toHaveBeenCalledTimes(1);
      expect(slotRef).not.toHaveBeenCalledWith(null);
      expect(childRef).not.toHaveBeenCalledWith(null);
    });

    it("R-12 cleans up replaced callback refs before attaching their replacements", () => {
      const oldSlotCleanup = vi.fn();
      const oldChildCleanup = vi.fn();
      const nextSlotCleanup = vi.fn();
      const nextChildCleanup = vi.fn();
      const oldSlotRef = vi.fn(() => oldSlotCleanup);
      const oldChildRef = vi.fn(() => oldChildCleanup);
      const nextSlotRef = vi.fn(() => nextSlotCleanup);
      const nextChildRef = vi.fn(() => nextChildCleanup);

      const { rerender, unmount } = render(
        <Slot ref={oldSlotRef}>
          <button ref={oldChildRef} data-testid="target">
            first
          </button>
        </Slot>,
      );

      const target = screen.getByTestId("target");

      expect(oldSlotRef).toHaveBeenCalledOnce();
      expect(oldChildRef).toHaveBeenCalledOnce();

      rerender(
        <Slot ref={nextSlotRef}>
          <button ref={nextChildRef} data-testid="target">
            second
          </button>
        </Slot>,
      );

      expect(oldSlotCleanup).toHaveBeenCalledOnce();
      expect(oldChildCleanup).toHaveBeenCalledOnce();
      expect(nextSlotRef).toHaveBeenCalledOnce();
      expect(nextChildRef).toHaveBeenCalledOnce();
      expect(nextSlotRef).toHaveBeenCalledWith(target);
      expect(nextChildRef).toHaveBeenCalledWith(target);

      // Replaced refs are cleaned up before their replacements attach.
      const callOrder = (mock: { mock: { invocationCallOrder: number[] } }) =>
        mock.mock.invocationCallOrder[0] ?? Number.NaN;

      expect(callOrder(oldSlotCleanup)).toBeLessThan(callOrder(nextSlotRef));
      expect(callOrder(oldChildCleanup)).toBeLessThan(callOrder(nextChildRef));

      unmount();

      expect(nextSlotCleanup).toHaveBeenCalledOnce();
      expect(nextChildCleanup).toHaveBeenCalledOnce();
    });

    it("R-13 supports callback-ref setup and cleanup under StrictMode", () => {
      const slotCleanup = vi.fn();
      const childCleanup = vi.fn();
      const slotRef = vi.fn(() => slotCleanup);
      const childRef = vi.fn(() => childCleanup);

      const view = render(
        <StrictMode>
          <Slot ref={slotRef}>
            <button ref={childRef} data-testid="target">
              target
            </button>
          </Slot>
        </StrictMode>,
      );

      // StrictMode performs an additional development setup/cleanup cycle.
      expect(slotRef).toHaveBeenCalledTimes(2);
      expect(childRef).toHaveBeenCalledTimes(2);
      expect(slotCleanup).toHaveBeenCalledOnce();
      expect(childCleanup).toHaveBeenCalledOnce();

      view.unmount();

      expect(slotCleanup).toHaveBeenCalledTimes(2);
      expect(childCleanup).toHaveBeenCalledTimes(2);
    });

    it("R-08 invokes an identical callback ref only once and cleans it up once", () => {
      const cleanup = vi.fn();
      const sharedRef = vi.fn(() => cleanup);

      const view = render(
        <Slot ref={sharedRef}>
          <button ref={sharedRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      const target = screen.getByTestId("target");
      expect(sharedRef).toHaveBeenCalledOnce();
      expect(sharedRef).toHaveBeenCalledWith(target);

      view.unmount();

      expect(cleanup).toHaveBeenCalledOnce();
      expect(sharedRef).toHaveBeenCalledOnce();
    });

    it("R-09 assigns and clears an identical object ref only once", () => {
      let current: HTMLButtonElement | null = null;
      const setCurrent = vi.fn((value: HTMLButtonElement | null) => {
        current = value;
      });
      const sharedRef = {
        get current() {
          return current;
        },
        set current(value: HTMLButtonElement | null) {
          setCurrent(value);
        },
      };

      const view = render(
        <Slot ref={sharedRef}>
          <button ref={sharedRef} data-testid="target">
            target
          </button>
        </Slot>,
      );

      expect(current).toBe(screen.getByTestId("target"));
      expect(setCurrent).toHaveBeenCalledOnce();

      view.unmount();

      expect(current).toBeNull();
      expect(setCurrent).toHaveBeenCalledTimes(2);
      expect(setCurrent).toHaveBeenLastCalledWith(null);
    });

    it("R-10 invokes one callback ref once across three nested slots", () => {
      const cleanup = vi.fn();
      const sharedRef = vi.fn(() => cleanup);

      const view = render(
        <Slot ref={sharedRef}>
          <Slot ref={sharedRef}>
            <button ref={sharedRef} data-testid="target">
              target
            </button>
          </Slot>
        </Slot>,
      );

      expect(sharedRef).toHaveBeenCalledOnce();
      expect(sharedRef).toHaveBeenCalledWith(screen.getByTestId("target"));

      view.unmount();

      expect(cleanup).toHaveBeenCalledOnce();
      expect(sharedRef).toHaveBeenCalledOnce();
    });

    it("R-11 assigns and clears one object ref once across three nested slots", () => {
      let current: HTMLButtonElement | null = null;
      const setCurrent = vi.fn((value: HTMLButtonElement | null) => {
        current = value;
      });
      const sharedRef = {
        get current() {
          return current;
        },
        set current(value: HTMLButtonElement | null) {
          setCurrent(value);
        },
      };

      const view = render(
        <Slot ref={sharedRef}>
          <Slot ref={sharedRef}>
            <button ref={sharedRef} data-testid="target">
              target
            </button>
          </Slot>
        </Slot>,
      );

      expect(current).toBe(screen.getByTestId("target"));
      expect(setCurrent).toHaveBeenCalledOnce();

      view.unmount();

      expect(current).toBeNull();
      expect(setCurrent).toHaveBeenCalledTimes(2);
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
  });

  describe("nested composition", () => {
    it("N-05 composes refs across three levels and cleans each up once", () => {
      const outerCleanup = vi.fn();
      const middleCleanup = vi.fn();
      const targetCleanup = vi.fn();
      const outerRef = vi.fn(() => outerCleanup);
      const middleRef = vi.fn(() => middleCleanup);
      const targetRef = vi.fn(() => targetCleanup);

      const view = render(
        <Slot ref={outerRef}>
          <Slot ref={middleRef}>
            <button ref={targetRef} data-testid="target">
              target
            </button>
          </Slot>
        </Slot>,
      );

      const target = screen.getByTestId("target");
      expect(outerRef).toHaveBeenCalledOnce();
      expect(middleRef).toHaveBeenCalledOnce();
      expect(targetRef).toHaveBeenCalledOnce();
      expect(outerRef).toHaveBeenCalledWith(target);
      expect(middleRef).toHaveBeenCalledWith(target);
      expect(targetRef).toHaveBeenCalledWith(target);

      view.unmount();

      expect(outerCleanup).toHaveBeenCalledOnce();
      expect(middleCleanup).toHaveBeenCalledOnce();
      expect(targetCleanup).toHaveBeenCalledOnce();
    });

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

      expect(screen.getByTestId("target").getAttribute("title")).toBe("target");
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

      expect(screen.getByTestId("target").className).toBe("outer inner target");
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
