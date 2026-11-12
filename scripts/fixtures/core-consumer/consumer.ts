import { mergeCompositionProps } from "@universal-slots/core";
import type { MergeCompositionProps } from "@universal-slots/core";

type Source = { className: string; sourceOnly: boolean };
type Target = { className?: string; targetOnly: number };
type Result = MergeCompositionProps<Source, Target>;

const typedResult: Result = {
  className: "combined",
  sourceOnly: true,
  targetOnly: 1,
};

const merged = mergeCompositionProps(
  { className: "source", sourceOnly: true },
  { className: "target", targetOnly: 1 },
  { isEventHandler: () => false },
);

// The projected type must reject a wrong target-only value. If the declarations
// degraded to `any`, this directive would be unused and the check would fail.
const wrongTargetOnly: Result = {
  className: "combined",
  sourceOnly: true,
  // @ts-expect-error targetOnly is a number
  targetOnly: "wrong",
};

void typedResult;
void wrongTargetOnly;
void merged;
