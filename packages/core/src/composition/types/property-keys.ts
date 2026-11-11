import type { KeysOfUnion, OptionalKeysOf, RequiredKeysOf } from "type-fest";

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

export type RequiredResultKeys<Source extends object, Target extends object> =
  RequiredKeys<Source> | RequiredKeys<Target>;

export type OptionalResultKeys<
  Source extends object,
  Target extends object,
> = Exclude<
  AllKeys<Source> | AllKeys<Target>,
  RequiredResultKeys<Source, Target>
>;
