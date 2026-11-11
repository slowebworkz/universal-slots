import type {
  ComponentPropsWithRef,
  ComponentPropsWithoutRef,
  ElementType,
} from "react";

import type { MergeCompositionProps } from "@universal-slots/core";

/** Props declared by a React intrinsic element or component target. */
export type ReactTargetProps<Target extends ElementType> =
  ComponentPropsWithoutRef<Target>;

/**
 * Ref accepted by a React target.
 *
 * React 19 function components can expose refs as ordinary component props;
 * this extraction therefore uses ComponentPropsWithRef rather than relying on
 * the pre-19 forwardRef-only model.
 */
export type ReactTargetRef<Target extends ElementType> = Target extends unknown
  ? ComponentPropsWithRef<Target> extends { ref?: infer RefValue }
    ? RefValue
    : never
  : never;

type ReactEventKeys<Props> = {
  [Key in keyof Props]-?: Key extends `on${Capitalize<string>}` ? Key : never;
}[keyof Props];

/** Composition result with React's `on[A-Z]` event-handler convention. */
export type ReactCompositionProps<
  SourceProps extends object,
  TargetProps extends object,
> = MergeCompositionProps<
  SourceProps,
  TargetProps,
  Extract<
    ReactEventKeys<SourceProps> | ReactEventKeys<TargetProps>,
    keyof SourceProps | keyof TargetProps
  >
>;
