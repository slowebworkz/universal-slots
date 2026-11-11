import type { Simplify } from "type-fest";

import type {
  OptionalKeys,
  OptionalResultKeys,
  PresentPropertyValue,
  RequiredResultKeys,
} from "./property-keys.js";
import type { MergeCompositionValue } from "./property-values.js";

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
  | Source[Key];

type MergedProperty<
  Source extends object,
  Target extends object,
  Key extends PropertyKey,
  EventKeys extends PropertyKey,
> = Key extends keyof Source
  ? Key extends keyof Target
    ? Key extends OptionalKeys<Target>
      ? MergeOptionalTargetProperty<Source, Target, Key, EventKeys>
      : MergeCompositionValue<Source[Key], Target[Key], Key, EventKeys>
    : Source[Key]
  : Key extends keyof Target
    ? Target[Key]
    : never;

type MergeCompositionPropsMember<
  Source extends object,
  Target extends object,
  EventKeys extends PropertyKey,
> = Simplify<
  {
    [Key in RequiredResultKeys<Source, Target>]: MergedProperty<
      Source,
      Target,
      Key,
      EventKeys
    >;
  } & {
    [Key in OptionalResultKeys<Source, Target>]?: MergedProperty<
      Source,
      Target,
      Key,
      EventKeys
    >;
  }
>;

/**
 * Type-level projection of the shared composition policy.
 *
 * Source-only properties remain available. Required ordinary conflicts use the
 * target value; optional target properties retain the source value as a
 * fallback. Class values project to strings when both inputs are strings,
 * style objects are shallowly merged, and adapter-classified event keys retain
 * both callable contracts.
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
