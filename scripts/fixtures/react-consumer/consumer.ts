import type {
  ReactCompositionProps,
  SlotCompositionOptions,
  SlotProps,
} from "@universal-slots/react";

type ButtonSourceProps = {
  variant: "primary" | "secondary";
  className?: string;
};
type LinkTargetProps = { href: string; className?: string };
type ButtonAsLinkProps = ReactCompositionProps<
  ButtonSourceProps,
  LinkTargetProps
>;

const validComposition: ButtonAsLinkProps = {
  variant: "primary",
  href: "/profile",
  className: "button link",
};

const validOptions: SlotCompositionOptions = {
  mergeClass: (source, target) => `${String(target)} ${String(source)}`,
};

const validSlotProps: SlotProps<"a"> = {
  composition: validOptions,
  href: "/profile",
};

// The projected type must reject a wrong target value. If the declarations
// degraded to `any`, this directive would be unused and the check would fail.
const wrongHref: ButtonAsLinkProps = {
  variant: "secondary",
  // @ts-expect-error href is a string
  href: 42,
};

const wrongPolicy: SlotCompositionOptions = {
  // @ts-expect-error a merge policy must be a function
  mergeEvent: "not a policy",
};

void validComposition;
void validSlotProps;
void wrongHref;
void wrongPolicy;
