/**
 * Compile-time consumer fixture for the public React API.
 * Included in package typechecking; it is not a runtime test.
 */
import { createRef } from "react";
import { expectTypeOf } from "vitest";

import { Slot } from "./index.js";

import type { ComponentPropsWithRef, MouseEvent } from "react";
import type {
  ReactCompositionProps,
  ReactEventKey,
  ReactTargetProps,
  ReactTargetRef,
  SlotCompositionOptions,
  SlotProps,
} from "./index.js";

const eventCompositionOptions: SlotCompositionOptions = {
  eventPolicy: "skip-source-on-default-prevented",
};

// ---------------------------------------------------------------------------
// Fixture components and props
// ---------------------------------------------------------------------------

/** A custom link component: anchor props (including `ref`) plus a required `href`. */
type LinkProps = ComponentPropsWithRef<"a"> & {
  href: string;
};

/** React 19 function component that receives `ref` as an ordinary prop. */
function Link({ href, ref, ...props }: LinkProps) {
  return <a href={href} ref={ref} {...props} />;
}

/** Props contributed by the composing component, with a wider `variant`. */
type SourceProps = {
  variant: "primary" | "secondary";
  className: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

/** Props of the rendered target; its narrower `variant` must win on conflict. */
type TargetProps = {
  href: string;
  className: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  variant: "primary";
};

/** A Button-style source whose class and click handler are optional. */
type ButtonSourceProps = {
  variant: "primary" | "secondary";
  size: "small" | "medium" | "large";
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

// ---------------------------------------------------------------------------
// ReactCompositionProps: source + target resolution
// ---------------------------------------------------------------------------

/** A Button composed onto the custom `Link` target. */
type ButtonAsLinkProps = ReactCompositionProps<
  ButtonSourceProps,
  ReactTargetProps<typeof Link>
>;

/** Accepted: every source prop plus the target's required `href`. */
const validButtonAsLink: ButtonAsLinkProps = {
  variant: "primary",
  size: "medium",
  href: "/profile",
  className: "button link",
  onClick: (event) => event.currentTarget.href,
};

/** Rejected: `href` is owned by the target and must stay a string. */
const invalidButtonAsLinkHref: ButtonAsLinkProps = {
  variant: "secondary",
  size: "large",
  // @ts-expect-error target-specific href remains a string
  href: 42,
};
expectTypeOf<ButtonAsLinkProps["href"]>().toEqualTypeOf<string>();

/** Plain source/target pair used to check conflict resolution. */
type ComposedProps = ReactCompositionProps<SourceProps, TargetProps>;

/** Accepted: the target's narrower `variant` and its `href` are satisfied. */
const validComposedProps: ComposedProps = {
  variant: "primary",
  href: "/profile",
  className: "button link",
  onClick: () => undefined,
};

// Pin the resolved types so the `@ts-expect-error` cases below can only fail
// for the stated reason.
expectTypeOf<ComposedProps["variant"]>().toEqualTypeOf<"primary">();
expectTypeOf<ComposedProps["href"]>().toEqualTypeOf<string>();

/** Rejected: the source's `"secondary"` is not allowed through the target. */
const invalidVariant: ComposedProps = {
  ...validComposedProps,
  // @ts-expect-error target wins for ordinary conflicting properties
  variant: "secondary",
};

// @ts-expect-error target-specific properties retain their declared type
const invalidHref: ComposedProps = { ...validComposedProps, href: 42 };

// ---------------------------------------------------------------------------
// Event-key classification
// ---------------------------------------------------------------------------

// Both callable contracts are retained for React event keys: the handlers
// differ only in return type, so the intersection is distinguishable.
type PressSource = { onPress: (event: { x: number }) => void };
type PressTarget = { onPress: (event: { x: number }) => string };
type PressComposed = ReactCompositionProps<PressSource, PressTarget>;
expectTypeOf<PressComposed["onPress"]>().toEqualTypeOf<
  PressSource["onPress"] & PressTarget["onPress"]
>();

// Only `on` + capital is an event key; other names follow ordinary rules.
expectTypeOf<"onClick">().toExtend<ReactEventKey>();
expectTypeOf<"onclick">().not.toExtend<ReactEventKey>();
expectTypeOf<"once">().not.toExtend<ReactEventKey>();

type LowercaseComposed = ReactCompositionProps<
  { onclick: (event: number) => void; once: () => void },
  { onclick: (event: string) => void; once: () => string }
>;
expectTypeOf<LowercaseComposed["onclick"]>().toEqualTypeOf<
  (event: string) => void
>();
expectTypeOf<LowercaseComposed["once"]>().toEqualTypeOf<() => string>();

// ---------------------------------------------------------------------------
// Target props and refs
// ---------------------------------------------------------------------------

/** Intrinsic-element target props. */
type AnchorProps = ReactTargetProps<"a">;
const anchorHref: AnchorProps["href"] = "/docs";
const customLinkHref: ReactTargetProps<typeof Link>["href"] = "/profile";

// @ts-expect-error anchor props do not include the button-only disabled prop
const invalidAnchorProps: ReactTargetProps<"a"> = { disabled: true };

/** An anchor target infers a ref to `HTMLAnchorElement`. */
const inferredAnchorRef: ReactTargetRef<"a"> = createRef<HTMLAnchorElement>();

// ---------------------------------------------------------------------------
// Slot props and composition options
// ---------------------------------------------------------------------------

/** Sink that lets a fixture assert what `SlotProps<typeof Link>` accepts. */
function acceptLinkSlotProps(props: SlotProps<typeof Link>) {
  void props;
}

/**
 * Custom policies for each overridable composition step: event order, class
 * joining and style merging.
 */
const slotCompositionOptions: SlotCompositionOptions = {
  mergeEvent:
    (sourceHandler, targetHandler) =>
    (...args: never[]) => {
      targetHandler(...args);
      sourceHandler(...args);
    },
  mergeClass: (source, target) => `${source ?? ""} ${target ?? ""}`.trim(),
  mergeStyle: (source, target) => Object.assign({}, source, target),
};

/** Accepted: configured composition alongside the target's required `href`. */
const validConfiguredSlotProps: SlotProps<typeof Link> = {
  composition: slotCompositionOptions,
  href: "/profile",
};

const invalidSlotCompositionOptions: SlotCompositionOptions = {
  // @ts-expect-error event policy must be a function
  mergeEvent: "not a policy",
};

const invalidClassPolicy: SlotCompositionOptions = {
  // @ts-expect-error class policy must be a function
  mergeClass: true,
};

const invalidStylePolicy: SlotCompositionOptions = {
  // @ts-expect-error style policy must be a function
  mergeStyle: {},
};

// @ts-expect-error a Link target exposes an anchor ref, not a button ref
acceptLinkSlotProps({ ref: createRef<HTMLButtonElement>() });

// ---------------------------------------------------------------------------
// JSX usage
// ---------------------------------------------------------------------------

/**
 * Renders `Slot` over a custom component target and an intrinsic target, with
 * and without a forwarded ref, to check JSX type inference.
 */
export function SlotConsumerTypes() {
  const anchorRef = createRef<HTMLAnchorElement>();
  return (
    <>
      <Slot aria-label="profile link">
        <Link href="/profile">Profile</Link>
      </Slot>
      <Slot<typeof Link> ref={anchorRef} aria-label="forwarded profile link">
        <Link href="/profile">Forwarded profile</Link>
      </Slot>
      <Slot<"a"> ref={anchorRef} title="Documentation">
        <a href="/docs" ref={anchorRef}>
          Documentation
        </a>
      </Slot>
    </>
  );
}
