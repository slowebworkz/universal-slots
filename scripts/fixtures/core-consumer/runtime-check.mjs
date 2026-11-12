import assert from "node:assert/strict";
import { mergeCompositionProps } from "@universal-slots/core";

const calls = [];
const merged = mergeCompositionProps(
  { className: "source", onClick: () => calls.push("source") },
  { className: "target", onClick: () => calls.push("target") },
  { isEventHandler: (key) => key === "onClick" },
);

assert.equal(merged.className, "source target");
merged.onClick();
assert.deepEqual(calls, ["target", "source"]);
console.log("External ESM runtime import passed.");
