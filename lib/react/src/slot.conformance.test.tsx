// @vitest-environment jsdom

import { defineSlotConformance } from "@universal-slots/conformance";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createElement, createRef, Fragment } from "react";
import { afterEach } from "vitest";

import { Slot } from "./index.js";

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(cleanup);

defineSlotConformance({
  name: "React",
  Slot,
  Fragment,
  childError:
    "UniversalSlots Slot expects exactly one non-fragment React element child.",
  h: (type, props, ...children) =>
    (createElement as (...args: unknown[]) => unknown)(
      type,
      props,
      ...children,
    ),
  createRef: () => createRef<unknown>() as { current: unknown },
  mount: (element) => {
    const view = render(element as Parameters<typeof render>[0]);
    return { container: view.container, unmount: view.unmount };
  },
  click: (element) => {
    fireEvent.click(element);
  },
});
