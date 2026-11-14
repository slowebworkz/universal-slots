import { describe, expectTypeOf, it } from "vitest";

import type { MergeCompositionProps } from "./types.js";

// Requires exactOptionalPropertyTypes: excluded from tsconfig.non-exact.json.
describe("MergeCompositionProps with exactOptionalPropertyTypes", () => {
  it("distinguishes absent optional values from explicit undefined", () => {
    type OptionalTarget = MergeCompositionProps<
      { title: string },
      { title?: string | undefined }
    >;

    expectTypeOf<OptionalTarget["title"]>().toEqualTypeOf<string | undefined>();
  });
});
