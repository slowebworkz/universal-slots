import { describe, expectTypeOf, it } from "vitest";

import type { MergeCompositionProps } from "./types.js";

type SourceProps = {
  id: string;
  title: "source";
  className: string;
  style: {
    color: "red";
    padding: number;
  };
  onActivate: (value: { type: "activate" }) => void;
  sourceOnly?: boolean;
};

type TargetProps = {
  title: "target";
  className: string;
  style: {
    color: "blue";
    margin: number;
  };
  onActivate: (value: { type: "activate" }) => void;
  href: string;
  targetOptional?: number;
};

type Result = MergeCompositionProps<SourceProps, TargetProps, "onActivate">;

type Empty = Record<never, never>;

describe("MergeCompositionProps", () => {
  it("preserves source-only and target-only properties", () => {
    expectTypeOf<Result["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Result["href"]>().toEqualTypeOf<string>();
  });

  it("uses target values for ordinary conflicts", () => {
    expectTypeOf<Result["title"]>().toEqualTypeOf<"target">();
  });

  it("represents class concatenation as a string or undefined", () => {
    expectTypeOf<Result["className"]>().toEqualTypeOf<string | undefined>();
  });

  it("projects class normalization for mixed and exclusive values", () => {
    type Mixed = MergeCompositionProps<
      { className: string },
      { className: number }
    >;
    type SourceOnlyString = MergeCompositionProps<{ class: string }, Empty>;
    type SourceOnlyInvalid = MergeCompositionProps<
      { className: number },
      Empty
    >;
    type TargetOnlyString = MergeCompositionProps<Empty, { className: string }>;
    type TargetOnlyInvalid = MergeCompositionProps<
      Empty,
      { className: number }
    >;

    expectTypeOf<Mixed["className"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<SourceOnlyString["class"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<SourceOnlyInvalid["className"]>().toEqualTypeOf<undefined>();
    expectTypeOf<TargetOnlyString["className"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<TargetOnlyInvalid["className"]>().toEqualTypeOf<undefined>();
  });

  it("merges style object keys with target precedence", () => {
    expectTypeOf<Result["style"]>().toEqualTypeOf<{
      color: "blue";
      padding: number;
      margin: number;
    }>();
  });

  it("rejects non-nullish style values that the runtime rejects", () => {
    type Primitive = MergeCompositionProps<
      { style: { color: string } },
      { style: string }
    >;
    type ArrayValue = MergeCompositionProps<
      { style: { color: string } },
      { style: string[] }
    >;
    type FunctionValue = MergeCompositionProps<
      { style: { color: string } },
      { style: () => void }
    >;
    type InvalidSourceOnly = MergeCompositionProps<{ style: number }, Empty>;
    type ValidWithNullishTarget = MergeCompositionProps<
      { style: { color: string } },
      { style: null }
    >;

    expectTypeOf<Primitive["style"]>().toBeNever();
    expectTypeOf<ArrayValue["style"]>().toBeNever();
    expectTypeOf<FunctionValue["style"]>().toBeNever();
    expectTypeOf<InvalidSourceOnly["style"]>().toBeNever();
    expectTypeOf<ValidWithNullishTarget["style"]>().toEqualTypeOf<{
      color: string;
    }>();
  });

  it("projects optional style objects without losing mergeable keys", () => {
    type OptionalStyle = MergeCompositionProps<
      { style?: { color: string; padding: number } },
      { style?: { color: string; margin: number } }
    >;

    expectTypeOf<OptionalStyle["style"]>().toEqualTypeOf<
      | { color: string; padding: number; margin: number }
      | { color: string; padding: number }
      | { color: string; margin: number }
      | undefined
    >();
  });

  it("preserves both event-handler call contracts", () => {
    expectTypeOf<Result["onActivate"]>().toEqualTypeOf<
      SourceProps["onActivate"] & TargetProps["onActivate"]
    >();
  });

  it("preserves optional properties", () => {
    expectTypeOf<Result["sourceOnly"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Result["targetOptional"]>().toEqualTypeOf<
      number | undefined
    >();
  });

  it("does not treat arbitrary functions as event handlers by default", () => {
    type FunctionProps = {
      renderItem: () => string;
    };
    type Merged = MergeCompositionProps<
      FunctionProps,
      { renderItem: () => number }
    >;

    expectTypeOf<Merged["renderItem"]>().toEqualTypeOf<() => number>();
  });

  it("preserves every source union member", () => {
    type SourceUnion =
      | { kind: "link"; href: string }
      | { kind: "action"; onActivate: () => void };
    type Merged = MergeCompositionProps<SourceUnion, { id: string }>;

    expectTypeOf<Merged>().toEqualTypeOf<
      | { kind: "link"; href: string; id: string }
      | { kind: "action"; onActivate: () => void; id: string }
    >();
  });

  it("preserves every target union member", () => {
    type TargetUnion =
      { kind: "link"; href: string } | { kind: "button"; disabled: boolean };
    type Merged = MergeCompositionProps<{ id: string }, TargetUnion>;

    expectTypeOf<Merged>().toEqualTypeOf<
      | { id: string; kind: "link"; href: string }
      | { id: string; kind: "button"; disabled: boolean }
    >();
  });

  it("distributes across source and target unions", () => {
    type Merged = MergeCompositionProps<
      { sourceKind: "a"; value: string } | { sourceKind: "b"; count: number },
      | { targetKind: "x"; value: boolean }
      | { targetKind: "y"; enabled: boolean }
    >;

    expectTypeOf<Merged>().toEqualTypeOf<
      | { sourceKind: "a"; value: boolean; targetKind: "x" }
      | { sourceKind: "a"; value: string; targetKind: "y"; enabled: boolean }
      | { sourceKind: "b"; count: number; value: boolean; targetKind: "x" }
      | {
          sourceKind: "b";
          count: number;
          targetKind: "y";
          enabled: boolean;
        }
    >();
  });

  it("retains source values for optional nested style keys", () => {
    type OptionalNestedStyle = MergeCompositionProps<
      { style: { color: string; padding: number } },
      { style: { color?: number; margin: number } }
    >;

    expectTypeOf<OptionalNestedStyle["style"]>().toEqualTypeOf<{
      color: string | number;
      padding: number;
      margin: number;
    }>();
  });

  it("retains a required source value when the target property is optional", () => {
    type OptionalTarget = MergeCompositionProps<
      { title: "source" },
      { title?: "target" }
    >;

    expectTypeOf<OptionalTarget>().toEqualTypeOf<{
      title: "source" | "target";
    }>();
  });

  it("preserves optional source-only properties", () => {
    type Merged = MergeCompositionProps<{ hint?: string }, { id: string }>;

    expectTypeOf<Merged>().toEqualTypeOf<{ id: string; hint?: string }>();
  });

  it("preserves optional target-only properties", () => {
    type Merged = MergeCompositionProps<{ id: string }, { count?: number }>;

    expectTypeOf<Merged>().toEqualTypeOf<{ id: string; count?: number }>();
  });

  it("keeps a property optional when both sides are optional", () => {
    type Merged = MergeCompositionProps<
      { title?: "source" },
      { title?: "target" }
    >;

    expectTypeOf<Merged>().toEqualTypeOf<{ title?: "source" | "target" }>();
  });

  it("keeps explicit undefined when both sides declare it", () => {
    type Merged = MergeCompositionProps<
      { title?: "source" | undefined },
      { title?: "target" | undefined }
    >;

    expectTypeOf<Merged>().toEqualTypeOf<{
      title?: "source" | "target" | undefined;
    }>();
  });

  it("keeps explicit undefined when only the source declares it", () => {
    type Merged = MergeCompositionProps<
      { title?: "source" | undefined },
      { title?: "target" }
    >;

    expectTypeOf<Merged>().toEqualTypeOf<{
      title?: "source" | "target" | undefined;
    }>();
  });

  it("merges optional nested style keys on both sides", () => {
    type Merged = MergeCompositionProps<
      { style: { color?: string; padding: number } },
      { style: { color?: number; margin: number } }
    >;

    expectTypeOf<Merged["style"]>().toEqualTypeOf<{
      color?: string | number;
      padding: number;
      margin: number;
    }>();
  });

  it("returns the other side unchanged when one input is an empty object", () => {
    expectTypeOf<MergeCompositionProps<Empty, { id: string }>>().toEqualTypeOf<{
      id: string;
    }>();
    expectTypeOf<MergeCompositionProps<{ id: string }, Empty>>().toEqualTypeOf<{
      id: string;
    }>();
    expectTypeOf<MergeCompositionProps<Empty, Empty>>().toEqualTypeOf<Empty>();
  });

  it("collapses to never when either input is never", () => {
    expectTypeOf<MergeCompositionProps<never, { id: string }>>().toBeNever();
    expectTypeOf<MergeCompositionProps<{ id: string }, never>>().toBeNever();
  });

  it("distributes discriminated unions per member", () => {
    type Merged = MergeCompositionProps<
      { kind: "a"; a: string } | { kind: "b"; b: number },
      { enabled: boolean }
    >;

    expectTypeOf<Merged>().toEqualTypeOf<
      | { kind: "a"; a: string; enabled: boolean }
      | { kind: "b"; b: number; enabled: boolean }
    >();
  });

  it("normalizes the class fallback when an optional target omits the key", () => {
    type Merged = MergeCompositionProps<
      { className: number },
      { className?: string }
    >;
    type StringSource = MergeCompositionProps<
      { className: string },
      { className?: number }
    >;

    expectTypeOf<Merged["className"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<StringSource["className"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  it("validates the style fallback when an optional target omits the key", () => {
    type InvalidSource = MergeCompositionProps<
      { style: number },
      { style?: { color: string } }
    >;
    type ValidSource = MergeCompositionProps<
      { style: { padding: number } },
      { style?: { color: string } }
    >;

    expectTypeOf<InvalidSource["style"]>().toBeNever();
    expectTypeOf<ValidSource["style"]>().toEqualTypeOf<
      { padding: number } | { padding: number; color: string }
    >();
  });

  it("keeps the source fallback unchanged for ordinary and event keys", () => {
    type Merged = MergeCompositionProps<
      { title: number; onPress: () => void },
      { title?: string; onPress?: (event: string) => void },
      "onPress"
    >;

    expectTypeOf<Merged["title"]>().toEqualTypeOf<number | string>();
    expectTypeOf<Merged["onPress"]>().toEqualTypeOf<
      (() => void) | ((() => void) & ((event: string) => void))
    >();
  });
});
