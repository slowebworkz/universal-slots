import type { IsOptionalKeyOf, Simplify } from "type-fest";

import type {
  ClassKey,
  OptionalResultKeys,
  PresentPropertyValue,
  RequiredResultKeys,
  StyleKey,
} from "./property-keys.js";

/** Any callable value, regardless of parameters or return type. */
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

/**
 * The default runtime keeps valid string classes, joining two strings and
 * ignoring non-string values. A blank string is not a valid class, so the
 * result is `undefined` whenever neither side contributes a non-blank string.
 * Any string input can be blank, so it widens the result to `string | undefined`.
 */
export type MergeClassValue<Source, Target> = Source extends string
  ? string | undefined
  : Target extends string
    ? string | undefined
    : undefined;

/**
 * Value for a key present on only one side. That side's type is kept
 * unchanged; `never` if the key is on neither side.
 */
export type MergeExclusiveProperty<
  Source extends object,
  Target extends object,
  Key extends PropertyKey,
> = Key extends keyof Source
  ? Source[Key]
  : Key extends keyof Target
    ? Target[Key]
    : never;

/**
 * Plain (non-composition-aware) value for one key of a merged style object:
 * target wins, except an optional target keeps the source value as a fallback.
 */
type MergeOrdinaryObjectValue<
  Source extends object,
  Target extends object,
  Key extends PropertyKey,
> = Key extends keyof Source & keyof Target
  ? IsOptionalKeyOf<Target, Key> extends true
    ? Source[Key] | PresentPropertyValue<Target, Key>
    : Target[Key]
  : MergeExclusiveProperty<Source, Target, Key>;

/**
 * Shallow merge of two plain objects, used for style values.
 *
 * Required and optional keys are computed as in the top-level merge, but values
 * use {@link MergeOrdinaryObjectValue} so class, style and event rules do not
 * apply to nested keys. The result is flattened with `Simplify`.
 */
type MergeOrdinaryObject<
  Source extends object,
  Target extends object,
> = Simplify<
  {
    [Key in RequiredResultKeys<Source, Target>]: MergeOrdinaryObjectValue<
      Source,
      Target,
      Key
    >;
  } & {
    [Key in OptionalResultKeys<Source, Target>]?: MergeOrdinaryObjectValue<
      Source,
      Target,
      Key
    >;
  }
>;

/** Object kinds that cannot be shallow-merged key by key. */
type UnmergeableObject = readonly unknown[] | FunctionValue;

/**
 * Shallow-merge two style values already validated by
 * {@link IsMergeableStyleValue}. The `object` checks only narrow the types for
 * {@link MergeOrdinaryObject}; the `never` branches are unreachable.
 */
type MergeStyleObjects<Source, Target> = Source extends object
  ? Target extends object
    ? MergeOrdinaryObject<Source, Target>
    : never
  : never;

/**
 * Whether the runtime style policy accepts a value: nullish values and
 * non-array objects pass; primitives, arrays and functions are rejected with a
 * `TypeError`.
 */
type IsMergeableStyleValue<Value> = Value extends null | undefined
  ? true
  : Value extends object
    ? Value extends UnmergeableObject
      ? false
      : true
    : false;

/**
 * Merge two validated style values: a nullish side yields the other side, and
 * two objects are shallow-merged.
 */
type MergeValidStyleValues<Source, Target> = Source extends null | undefined
  ? Target
  : Target extends null | undefined
    ? Source
    : MergeStyleObjects<Source, Target>;

/**
 * Style values are distributed independently so optional/nullish values and
 * unions retain the runtime fallback cases. Every non-nullish value must be a
 * non-array object, matching the runtime style policy's validation.
 */
export type MergeStyleValue<Source, Target> = Source extends unknown
  ? Target extends unknown
    ? [IsMergeableStyleValue<Source>, IsMergeableStyleValue<Target>] extends [
        true,
        true,
      ]
      ? MergeValidStyleValues<Source, Target>
      : never
    : never
  : never;

/**
 * Merged value for one property, chosen by the key's role.
 *
 * Event keys retain both callables ({@link MergeEventValue}), class keys
 * normalize to `string | undefined` ({@link MergeClassValue}), `style` merges
 * shallowly ({@link MergeStyleValue}), and every other key takes the target
 * value.
 */
export type MergeCompositionValue<
  Source,
  Target,
  Key extends PropertyKey,
  EventKeys extends PropertyKey,
> = Key extends EventKeys
  ? MergeEventValue<Source, Target>
  : Key extends ClassKey
    ? MergeClassValue<Source, Target>
    : Key extends StyleKey
      ? MergeStyleValue<Source, Target>
      : Target;
