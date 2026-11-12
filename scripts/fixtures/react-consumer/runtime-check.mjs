import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Slot } from "@universal-slots/react";

const child = () => createElement("button", { className: "child" }, "go");

// Default policy: slot class first, then child class.
assert.equal(
  renderToString(createElement(Slot, { className: "slot" }, child())),
  '<button class="slot child">go</button>',
);

// A configured policy reaches core through the packaged React entry point.
assert.equal(
  renderToString(
    createElement(
      Slot,
      {
        className: "slot",
        composition: { mergeClass: (source, target) => `${target}|${source}` },
      },
      child(),
    ),
  ),
  '<button class="child|slot">go</button>',
);

// `composition` is consumed by Slot and never reaches the DOM.
assert.ok(
  !renderToString(createElement(Slot, { composition: {} }, child())).includes(
    "composition",
  ),
);

console.log("External React ESM runtime check passed.");
