import type { IsOptionalKeyOf, Simplify } from "type-fest";

import type {
  ClassKey,
  OptionalResultKeys,
  PresentPropertyValue,
  RequiredResultKeys,
  StyleKey,
} from "./property-keys.js";
import type {
  MergeClassValue,
  MergeCompositionValue,
  MergeExclusiveProperty,
  MergeStyleValue,
} from "./property-values.js";

/**
 * What a source value becomes when the target omits the key.
 *
 * Class and style values still pass through their runtime policies against an
 * absent target, so they are normalized (class) or validated (style). Every
 * other value, including event handlers, is kept unchanged.
 */
type MergeSourceFallback<
  SourceValue,
  Key extends PropertyKey,
> = Key extends ClassKey
  ? MergeClassValue<SourceValue, undefined>
  : Key extends StyleKey
    ? MergeStyleValue<SourceValue, undefined>
    : SourceValue;

/**
 * Merged value for a key present on both sides where the target's property is
 * optional.
 *
 * The target may be absent at runtime, so the result is a union of two cases:
 * the merge of the source value with the target's present value, and the
 * source fallback ({@link MergeSourceFallback}) for when the target omits the
 * key.
 */
type MergeOptionalTargetProperty<
  Source extends object,
  Target extends object,
  Key extends keyof Source & keyof Target,
  EventKeys extends PropertyKey,
> =
  | MergeCompositionValue<
      Source[Key],
      PresentPropertyValue<Target, Key>,
      Key,
      EventKeys
    >
  | MergeSourceFallback<Source[Key], Key>;

/**
 * Merged value for a key present on both sides where the target's property is
 * required. The target is always present, so only the merge result applies.
 */
type MergeRequiredTargetProperty<
  Source extends object,
  Target extends object,
  Key extends keyof Source & keyof Target,
  EventKeys extends PropertyKey,
> = MergeCompositionValue<Source[Key], Target[Key], Key, EventKeys>;

/**
 * Merged value for a key present on both sides.
 *
 * The target's optionality decides whether the source value survives as a
 * fallback: optional targets use {@link MergeOptionalTargetProperty}, required
 * targets use {@link MergeRequiredTargetProperty}.
 */
type MergeSharedProperty<
  Source extends object,
  Target extends object,
  Key extends keyof Source & keyof Target,
  EventKeys extends PropertyKey,
> =
  IsOptionalKeyOf<Target, Key> extends true
    ? MergeOptionalTargetProperty<Source, Target, Key, EventKeys>
    : MergeRequiredTargetProperty<Source, Target, Key, EventKeys>;

/** A side's value for `Key`, or `undefined` when that side lacks the key. */
type ValueOrUndefined<
  Side extends object,
  Key extends PropertyKey,
> = Key extends keyof Side ? Side[Key] : undefined;

/**
 * Exclusive class and style properties still pass through their runtime
 * policies. Other exclusive properties retain their original value.
 */
type MergeExclusiveCompositionProperty<
  Source extends object,
  Target extends object,
  Key extends PropertyKey,
> = Key extends ClassKey
  ? MergeClassValue<
      ValueOrUndefined<Source, Key>,
      ValueOrUndefined<Target, Key>
    >
  : Key extends StyleKey
    ? MergeStyleValue<
        ValueOrUndefined<Source, Key>,
        ValueOrUndefined<Target, Key>
      >
    : MergeExclusiveProperty<Source, Target, Key>;

/**
 * Merged value for a single result key, dispatching on whether the key exists
 * on both sides ({@link MergeSharedProperty}) or one ({@link MergeExclusiveProperty}).
 * Distributes over `Key`.
 */
type MergedProperty<
  Source extends object,
  Target extends object,
  Key extends PropertyKey,
  EventKeys extends PropertyKey,
> = Key extends keyof Source & keyof Target
  ? MergeSharedProperty<Source, Target, Key, EventKeys>
  : MergeExclusiveCompositionProperty<Source, Target, Key>;

/**
 * The required half of the merge result: keys required on the source or the
 * target, each mapped through {@link MergedProperty}.
 */
type RequiredMergedProperties<
  Source extends object,
  Target extends object,
  EventKeys extends PropertyKey,
> = {
  [Key in RequiredResultKeys<Source, Target>]: MergedProperty<
    Source,
    Target,
    Key,
    EventKeys
  >;
};

/**
 * The optional half of the merge result: keys that appear on either side but
 * are required on neither, each mapped through {@link MergedProperty}.
 */
type OptionalMergedProperties<
  Source extends object,
  Target extends object,
  EventKeys extends PropertyKey,
> = {
  [Key in OptionalResultKeys<Source, Target>]?: MergedProperty<
    Source,
    Target,
    Key,
    EventKeys
  >;
};

/**
 * Merge result for one source member and one target member (no unions).
 *
 * Combines the required and optional halves and flattens the intersection
 * with `Simplify` so the result reads as a single object type.
 */
type MergeCompositionPropsMember<
  Source extends object,
  Target extends object,
  EventKeys extends PropertyKey,
> = Simplify<
  RequiredMergedProperties<Source, Target, EventKeys> &
    OptionalMergedProperties<Source, Target, EventKeys>
>;

/**
 * Type-level projection of the shared composition policy.
 *
 * Ordinary exclusive properties remain unchanged; ordinary shared conflicts
 * use the target value, with optional target properties retaining the source
 * value as a fallback. Class and style properties pass through their policies
 * even when present on only one side. Class values project to normalized
 * strings or `undefined`; style values are shallowly merged and reject
 * non-nullish non-object values. Adapter-classified event keys retain both
 * callable contracts when shared.
 *
 * Source and target unions are distributed independently, preserving each
 * member's keys and required/optional property modifiers.
 */
export type MergeCompositionProps<
  Source extends object,
  Target extends object,
  EventKeys extends PropertyKey = never,
> = Source extends unknown
  ? Target extends unknown
    ? MergeCompositionPropsMember<Source, Target, EventKeys>
    : never
  : never;
