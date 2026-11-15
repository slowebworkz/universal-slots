import { describe, expectTypeOf, it } from "vitest";
import type { MouseEvent } from "react";

import type { ReactCompositionProps } from "./types.js";

type ButtonSourceProps = {
  variant: "primary" | "secondary";
  size: "small" | "medium" | "large";
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type LinkTargetProps = {
  href: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type ButtonAsLinkProps = ReactCompositionProps<
  ButtonSourceProps,
  LinkTargetProps
>;

type UnionSourceProps =
  | {
      kind: "press";
      onPress: (payload: { source: "button" }) => void;
    }
  | {
      kind: "activate";
      onActivate: (payload: { source: "menu" }) => void;
    };

type UnionTargetProps =
  | {
      targetKind: "press-target";
      onPress: (payload: { target: "link" }) => void;
    }
  | {
      targetKind: "activate-target";
      onActivate: (payload: { target: "link" }) => void;
    };

type UnionComposition = ReactCompositionProps<
  UnionSourceProps,
  UnionTargetProps
>;

describe("ReactCompositionProps consumer contracts", () => {
  it("models a Button composed with a Link target", () => {
    expectTypeOf<ButtonAsLinkProps["variant"]>().toEqualTypeOf<
      "primary" | "secondary"
    >();
    expectTypeOf<ButtonAsLinkProps["size"]>().toEqualTypeOf<
      "small" | "medium" | "large"
    >();
    expectTypeOf<ButtonAsLinkProps["href"]>().toEqualTypeOf<string>();
    expectTypeOf<ButtonAsLinkProps["className"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  it("preserves both event contracts for matching keys unique to union members", () => {
    type PressSource = Extract<UnionSourceProps, { kind: "press" }>;
    type ActivateSource = Extract<UnionSourceProps, { kind: "activate" }>;

    type PressResult = Extract<
      UnionComposition,
      { kind: "press"; targetKind: "press-target" }
    >["onPress"];
    type ActivateResult = Extract<
      UnionComposition,
      { kind: "activate"; targetKind: "activate-target" }
    >["onActivate"];

    expectTypeOf<PressResult>().toEqualTypeOf<
      PressSource["onPress"] &
        Extract<UnionTargetProps, { targetKind: "press-target" }>["onPress"]
    >();
    expectTypeOf<ActivateResult>().toEqualTypeOf<
      ActivateSource["onActivate"] &
        Extract<
          UnionTargetProps,
          { targetKind: "activate-target" }
        >["onActivate"]
    >();
  });
});
