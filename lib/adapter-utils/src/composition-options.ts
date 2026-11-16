import { isNonNullish } from "remeda";

import type {
  EventCompositionPolicy,
  MergeEventPolicy,
  MergeValuePolicy,
} from "@universal-slots/core";

/** Event-handler prop naming convention shared by React and Preact. */
export type EventKey = `on${Capitalize<string>}`;

/**
 * Classifies event-handler props: `on` followed by a capital letter.
 * Mirrors the {@link EventKey} type at runtime.
 */
export function isEventHandler(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

/** Optional framework-neutral policies that customize Slot composition. */
export interface SlotCompositionOptions {
  /** Override how distinct recognized event handlers are composed. */
  mergeEvent?: MergeEventPolicy;
  /** Built-in event behavior; an explicit `mergeEvent` takes precedence. */
  eventPolicy?: EventCompositionPolicy;
  /** Override class/className value handling for framework-specific values. */
  mergeClass?: MergeValuePolicy;
  /** Override style value handling for framework-specific style models. */
  mergeStyle?: MergeValuePolicy;
}

/**
 * Picks only the known policies, so untyped input cannot override event
 * classification or other core options.
 */
export function pickCompositionPolicies(
  composition: SlotCompositionOptions | undefined,
): SlotCompositionOptions {
  return {
    ...(isNonNullish(composition?.mergeEvent) && {
      mergeEvent: composition.mergeEvent,
    }),
    ...(isNonNullish(composition?.eventPolicy) && {
      eventPolicy: composition.eventPolicy,
    }),
    ...(isNonNullish(composition?.mergeClass) && {
      mergeClass: composition.mergeClass,
    }),
    ...(isNonNullish(composition?.mergeStyle) && {
      mergeStyle: composition.mergeStyle,
    }),
  };
}
