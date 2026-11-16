import { Component, h } from "preact";
import type { CSSProperties, Ref, Signalish } from "preact";

import { Slot } from "./slot.js";
import type {
  PreactCompositionProps,
  PreactEventKey,
  PreactTargetProps,
  PreactTargetRef,
  SlotProps,
} from "./types.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;

type Source = {
  className: string;
  style: { color: string; padding: string };
  onPress: (event: { value: number }) => void;
  onclick: (event: number) => void;
};
type Target = {
  className?: string;
  style?: CSSProperties;
  onPress: (event: { value: number }) => string;
  onclick: (event: string) => void;
};
type Props = PreactCompositionProps<Source, Target>;

type ClassNameAcceptsSignal = Expect<
  Signalish<string | undefined> extends Props["className"] ? true : false
>;
type StyleAcceptsCssString = Expect<
  string extends Props["style"] ? true : false
>;
type StyleAcceptsSignal = Expect<
  Signalish<string | CSSProperties | undefined> extends Props["style"]
    ? true
    : false
>;
type EventContractsAreKept = Expect<
  Equal<Props["onPress"], Source["onPress"] & Target["onPress"]>
>;
type LowercaseIsOrdinary = Expect<Equal<Props["onclick"], Target["onclick"]>>;
type EventKeyClassification = [
  Expect<"onClick" extends PreactEventKey ? true : false>,
  Expect<"onclick" extends PreactEventKey ? false : true>,
];
type AnchorRefAcceptance = [
  Expect<Ref<HTMLAnchorElement> extends PreactTargetRef<"a"> ? true : false>,
  Expect<Ref<HTMLButtonElement> extends PreactTargetRef<"a"> ? false : true>,
];
function FunctionTarget(props: { href: string }) {
  return h("a", props, "target");
}
class ClassTarget extends Component<{ href: string }> {
  render() {
    return h("a", { href: this.props.href }, "target");
  }
}
type FunctionTargetRefAcceptance = Expect<
  Ref<HTMLAnchorElement> extends PreactTargetRef<typeof FunctionTarget>
    ? true
    : false
>;
type ClassTargetRefAcceptance = Expect<
  Ref<InstanceType<typeof ClassTarget>> extends PreactTargetRef<
    typeof ClassTarget
  >
    ? true
    : false
>;
type AnchorProps = PreactTargetProps<"a">;
type AnchorHasHref = Expect<"href" extends keyof AnchorProps ? true : false>;

const props: SlotProps<"a"> = {
  href: "/docs",
  children: h("a", { href: "/docs" }, "Documentation"),
  ref: (element) => {
    if (element) element.focus();
  },
};
const wrongRef: SlotProps<"a"> = {
  // @ts-expect-error An anchor target must not accept a button ref.
  ref: null as unknown as Ref<HTMLButtonElement>,
};
// @ts-expect-error Preact class values are strings or signal-like strings.
const invalidClass: Props["className"] = 42;
// @ts-expect-error Preact style values are CSS strings, objects, or signals.
const invalidStyle: Props["style"] = 42;

void Slot;
void props;
void wrongRef;
void invalidClass;
void invalidStyle;
type _Assertions = [
  ClassNameAcceptsSignal,
  StyleAcceptsCssString,
  StyleAcceptsSignal,
  EventContractsAreKept,
  LowercaseIsOrdinary,
  EventKeyClassification,
  AnchorRefAcceptance,
  FunctionTargetRefAcceptance,
  ClassTargetRefAcceptance,
  AnchorHasHref,
];
