import { createRef } from "react";
import type { ComponentProps } from "react";

import { Slot } from "./index.js";

type LinkProps = ComponentProps<"a"> & {
  href: string;
};

function Link({ href, ...props }: LinkProps) {
  return <a href={href} {...props} />;
}

/**
 * Compile-time consumer fixture for the public React API.
 * Included in package typechecking; it is not a runtime test.
 */
export function SlotConsumerTypes() {
  const anchorRef = createRef<HTMLAnchorElement>();
  const forwardedRef = createRef<HTMLAnchorElement>();

  return (
    <>
      <Slot aria-label="profile link">
        <Link href="/profile">Profile</Link>
      </Slot>
      <Slot ref={forwardedRef} aria-label="forwarded profile link">
        <Link href="/profile">Forwarded profile</Link>
      </Slot>
      <Slot ref={anchorRef} title="Documentation">
        <a href="/docs" ref={anchorRef}>
          Documentation
        </a>
      </Slot>
    </>
  );
}
