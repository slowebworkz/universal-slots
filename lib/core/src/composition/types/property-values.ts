import type { Simplify } from "type-fest";

import type {
  AllKeys,
  OptionalKeys,
  PresentPropertyValue,
  RequiredKeys,
} from "./property-keys.js";

type FunctionValue = (...args: never[]) => unknown;

/**
 * Preserve both callable contracts when the adapter classifies a key as an
 * event.
 */
export type MergeEventValue<Source, Target> = Source extends FunctionValue
  ? Target extends FunctionValue
    ? Source & Target
    : Target
  : Target;

/** The default runtime joins string class values into one string. */
export type MergeClassValue<Source, Target> = Source extends string
  ? Target extends string
    ? string
    : Source | Target
  : Source | Target;

type MergeOrdinaryObjectValue<
  Source extends object,
  Target extends object,
  Key extends PropertyKey,
> = Key extends keyof Source
  ? Key extends keyof Target
    ? Key extends OptionalKeys<Target>
      ? Source[Key] | PresentPropertyValue<Target, Key>
      : Target[Key]
    : Source[Key]
  : Key extends keyof Target
    ? Target[Key]
    : never;

type MergeOrdinaryObject<
  Source extends object,
  Target extends object,
> = Simplify<
  {
    [
      Key in RequiredKeys<Source> | RequiredKeys<Target>
    ]: MergeOrdinaryObjectValue<Source, Target, Key>;
  } & {
    [
      Key in Exclude<
        AllKeys<Source> | AllKeys<Target>,
        RequiredKeys<Source> | RequiredKeys<Target>
      >
    ]?: MergeOrdinaryObjectValue<Source, Target, Key>;
  }
>;

/** Shallowly merge two style objects, with target values taking precedence. */
type MergeStyleObjects<Source, Target> = Source extends object
  ? Target extends object
    ? Source extends readonly unknown[]
      ? Source | Target
      : Target extends readonly unknown[]
        ? Source | Target
        : Source extends FunctionValue
          ? Source | Target
          : Target extends FunctionValue
            ? Source | Target
            : MergeOrdinaryObject<Source, Target>
    : Source | Target
  : Source | Target;

/**
 * Style values are distributed independently so optional/nullish values and
 * unions retain the runtime fallback cases. Object values use shallow merging.
 */
export type MergeStyleValue<Source, Target> = Source extends unknown
  ? Target extends unknown
    ? Source extends null | undefined
      ? Target
      : Target extends null | undefined
        ? Source
        : MergeStyleObjects<Source, Target>
    : never
  : never;

export type MergeCompositionValue<
  Source,
  Target,
  Key extends PropertyKey,
  EventKeys extends PropertyKey,
> = Key extends EventKeys
  ? MergeEventValue<Source, Target>
  : Key extends "class" | "className"
    ? MergeClassValue<Source, Target>
    : Key extends "style"
      ? MergeStyleValue<Source, Target>
      : Target;
