import type { ReactNode } from "react";

/**
 * Internal test target for US-004.
 *
 * This placeholder is intentionally not re-exported from the package entry point.
 * US-005 will replace it with the actual slot substitution implementation.
 */
export function Slot({
  children,
}: Record<string, unknown> & { children?: ReactNode }) {
  return children ?? null;
}
