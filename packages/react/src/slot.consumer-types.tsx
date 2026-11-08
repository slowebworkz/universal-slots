import { createRef, type ReactNode } from "react";

import { Slot } from "./index.js";

type LinkProps = {
  href: string;
  children?: ReactNode;
};

function Link({ href, children }: LinkProps) {
  return <a href={href}>{children}</a>;
}

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
      <Slot ref={anchorRef} title="Documentation">
        <a href="/docs" ref={anchorRef}>
          Documentation
        </a>
      </Slot>
    </>
  );
}
