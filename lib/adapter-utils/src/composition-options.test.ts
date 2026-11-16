import { describe, expect, it } from "vitest";

import {
  isEventHandler,
  pickCompositionPolicies,
} from "./composition-options.js";

describe("isEventHandler", () => {
  it("matches on followed by a capital letter only", () => {
    expect(isEventHandler("onClick")).toBe(true);
    expect(isEventHandler("onclick")).toBe(false);
    expect(isEventHandler("on")).toBe(false);
    expect(isEventHandler("button")).toBe(false);
  });
});

describe("pickCompositionPolicies", () => {
  it("keeps only the defined known policies", () => {
    const mergeEvent = () => undefined;
    const input = {
      mergeEvent,
      mergeStyle: undefined,
      isEventHandler: () => true,
    };

    expect(
      pickCompositionPolicies(
        input as unknown as Parameters<typeof pickCompositionPolicies>[0],
      ),
    ).toStrictEqual({ mergeEvent });
    expect(pickCompositionPolicies(undefined)).toStrictEqual({});
  });
});
