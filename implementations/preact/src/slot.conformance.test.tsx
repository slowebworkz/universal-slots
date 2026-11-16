// @vitest-environment jsdom

import { defineSlotConformance } from "@universal-slots/conformance";
import { createRef, Fragment, h, render } from "preact";
import { afterEach } from "vitest";

import { Slot } from "./index.js";

const containers: HTMLElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) {
    render(null, container);
    container.remove();
  }
});

defineSlotConformance({
  name: "Preact",
  Slot,
  Fragment,
  childError:
    "UniversalSlots Preact Slot expects exactly one non-fragment VNode child.",
  h: (type, props, ...children) =>
    h(type as Parameters<typeof h>[0], props ?? {}, ...(children as never[])),
  createRef: () => createRef<unknown>() as { current: unknown },
  mount: (element) => {
    const container = document.createElement("div");
    document.body.append(container);
    containers.push(container);
    render(element as Parameters<typeof render>[0], container);
    return { container, unmount: () => render(null, container) };
  },
  click: (element) => {
    (element as HTMLElement).click();
  },
});
