import { createRef } from "react";
import type { ComponentPropsWithRef, MouseEvent } from "react";

import { Slot } from "./index.js";
import type {
  ReactCompositionProps,
  ReactTargetProps,
  ReactTargetRef,
  SlotProps,
} from "./index.js";

type LinkProps = ComponentPropsWithRef<"a"> & {
  href: string;
};

function Link({ href, ref, ...props }: LinkProps) {
  return <a href={href} ref={ref} {...props} />;
}

type SourceProps = {
  variant: "primary" | "secondary";
  className: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type TargetProps = {
  href: string;
  className: string;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
  variant: "primary";
};

type ButtonSourceProps = {
  variant: "primary" | "secondary";
  size: "small" | "medium" | "large";
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

type ButtonAsLinkProps = ReactCompositionProps<
  ButtonSourceProps,
  ReactTargetProps<typeof Link>
>;

const validButtonAsLink: ButtonAsLinkProps = {
  variant: "primary",
  size: "medium",
  href: "/profile",
  className: "button link",
  onClick: (event) => event.currentTarget.href,
};

const invalidButtonAsLinkHref: ButtonAsLinkProps = {
  variant: "secondary",
  size: "large",
  // @ts-expect-error target-specific href remains a string
  href: 42,
};

type ComposedProps = ReactCompositionProps<SourceProps, TargetProps>;

const validComposedProps: ComposedProps = {
  variant: "primary",
  href: "/profile",
  className: "button link",
  onClick: () => undefined,
};

const invalidVariant: ComposedProps = {
  ...validComposedProps,
  // @ts-expect-error target wins for ordinary conflicting properties
  variant: "secondary",
};

// @ts-expect-error target-specific properties retain their declared type
const invalidHref: ComposedProps = { ...validComposedProps, href: 42 };

type AnchorProps = ReactTargetProps<"a">;
const anchorHref: AnchorProps["href"] = "/docs";
const customLinkHref: ReactTargetProps<typeof Link>["href"] = "/profile";

// @ts-expect-error anchor props do not include the button-only disabled prop
const invalidAnchorProps: ReactTargetProps<"a"> = { disabled: true };

const inferredAnchorRef: ReactTargetRef<"a"> = createRef<HTMLAnchorElement>();

function acceptLinkSlotProps(props: SlotProps<typeof Link>) {
  void props;
}

// @ts-expect-error a Link target exposes an anchor ref, not a button ref
acceptLinkSlotProps({ ref: createRef<HTMLButtonElement>() });

/**
 * Compile-time consumer fixture for the public React API.
 * Included in package typechecking; it is not a runtime test.
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

// Keep these values referenced so no-unused-vars checks retain the assertions.
void validComposedProps;
void validButtonAsLink;
void invalidButtonAsLinkHref;
void invalidVariant;
void invalidHref;
void anchorHref;
void customLinkHref;
void invalidAnchorProps;
void inferredAnchorRef;
