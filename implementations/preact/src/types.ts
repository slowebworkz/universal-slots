import type {
  ComponentChild,
  ComponentClass,
  ComponentProps,
  ComponentType,
  CSSProperties,
  JSX,
  Ref,
  Signalish,
} from "preact";

import type {
  EventKey,
  SlotCompositionOptions,
} from "@universal-slots/adapter-utils";
import type { MergeCompositionProps } from "@universal-slots/core";

/** A Preact intrinsic element or component that can receive composed props. */
// `any` is the wildcard required to accept all component prop contracts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PreactAnyComponent = ComponentType<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PreactAnyComponentClass = ComponentClass<any>;
// Preact's RenderableProps defaults function-component refs to `any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PreactDefaultComponentRef = Ref<any>;

export type PreactElementType =
  PreactAnyComponent | keyof JSX.IntrinsicElements;

/** Props declared by a Preact intrinsic element or component target. */
export type PreactTargetProps<Target extends PreactElementType> =
  ComponentProps<Target>;

/** Ref accepted by a Preact target, falling back to an unconstrained Preact ref. */
export type PreactTargetRef<Target extends PreactElementType> =
  Target extends unknown
    ? "ref" extends keyof PreactTargetProps<Target>
      ? PreactTargetProps<Target> extends { ref?: infer RefValue }
        ? RefValue
        : never
      : Target extends PreactAnyComponentClass
        ? Ref<InstanceType<Target>>
        : Target extends PreactAnyComponent
          ? PreactDefaultComponentRef
          : Ref<unknown>
    : never;

/** Preact event-handler props use the `on` followed by a capital convention. */
export type PreactEventKey = EventKey;

type PreactEventKeys<Props> = Props extends unknown
  ? {
      [Key in keyof Props]-?: Key extends PreactEventKey ? Key : never;
    }[keyof Props]
  : never;

type PreactClassValue = Signalish<string | undefined>;
type PreactStyleValue = Signalish<string | CSSProperties | undefined>;

type ReplacePreactValues<Value> = Value extends unknown
  ? {
      [Key in keyof Value]: Key extends "class" | "className"
        ? PreactClassValue
        : Key extends "style"
          ? PreactStyleValue
          : Value[Key];
    }
  : never;

/**
 * Composition result using Preact's event-key, signal-like class, and style
 * value models. The runtime adapter merges string class pairs and style-object
 * pairs; non-nullish target signal-like values otherwise take precedence.
 */
export type PreactCompositionProps<
  SourceProps extends object,
  TargetProps extends object,
> = ReplacePreactValues<
  MergeCompositionProps<
    SourceProps,
    TargetProps,
    PreactEventKeys<SourceProps> | PreactEventKeys<TargetProps>
  >
>;

/** Optional adapter-specific policies exposed by the Preact Slot primitive. */
export type PreactSlotCompositionOptions = SlotCompositionOptions;

/** Props accepted by the low-level Preact Slot primitive. */
export type SlotProps<Target extends PreactElementType = PreactElementType> =
  Record<string, unknown> & {
    children?: ComponentChild;
    composition?: PreactSlotCompositionOptions;
    ref?: PreactTargetRef<Target>;
  };
