import type { KeysOfUnion, OptionalKeysOf, RequiredKeysOf } from "type-fest";

/** Property names that carry class values (`class` in DOM-like APIs, `className` in React). */
export type ClassKey = "class" | "className";

/** The property name that carries style values. */
export type StyleKey = "style";

/** All keys across every member of a union. */
export type AllKeys<T> = KeysOfUnion<T>;

/** Keys whose values may be omitted from an object. */
export type OptionalKeys<T extends object> = OptionalKeysOf<T>;

/** Keys that must be present on an object. */
export type RequiredKeys<T extends object> = RequiredKeysOf<T>;

/**
 * The value a property can have when it is present.
 *
 * With exactOptionalPropertyTypes, Required removes the implicit undefined
 * introduced by an optional property while retaining an explicitly declared
 * `| undefined`.
 */
export type PresentPropertyValue<
  T extends object,
  Key extends keyof T,
> = Required<Pick<T, Key>>[Key];

/**
 * Keys that are required in the merge result: any key required on the source or
 * the target. A key required on either side is always present after merging.
 */
export type RequiredResultKeys<Source extends object, Target extends object> =
  RequiredKeys<Source> | RequiredKeys<Target>;

/**
 * Keys that are optional in the merge result: every key on either side (across
 * all union members) that is not in {@link RequiredResultKeys}.
 */
export type OptionalResultKeys<
  Source extends object,
  Target extends object,
> = Exclude<
  AllKeys<Source> | AllKeys<Target>,
  RequiredResultKeys<Source, Target>
>;
