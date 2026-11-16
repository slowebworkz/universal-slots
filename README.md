# UniversalSlots

Universal slot composition technology for modern UI frameworks.

UniversalSlots defines framework-neutral composition policies and provides framework adapters that implement them without pretending that every framework has identical slot or projection semantics.

> **Status:** Initial experimental release. Public APIs and behavior are not yet stable; the React adapter supports React 18 and 19, and the Preact adapter targets Preact 11.

## Installation

Install the package once and import the framework-neutral API or the React
adapter through its public subpaths:

```sh
pnpm add universal-slots
```

The Core entrypoint has no React peer requirement:

```ts
import { mergeCompositionProps } from "universal-slots/core";
```

The React entrypoint supports React 18 and React 19. TypeScript consumers
should also have matching React type declarations installed:

```sh
pnpm add "react@^18 || ^19" universal-slots
pnpm add -D "@types/react@^18 || ^19"
```

```tsx
import { Slot } from "universal-slots/react";
```

React is an optional peer dependency of the package, so Core-only consumers do
not need to install React.

## Preact adapter

The experimental Preact adapter targets Preact 11. Install Preact alongside the
package and import the dedicated subpath:

```sh
pnpm add preact@^11 universal-slots
```

```tsx
import { Slot } from "universal-slots/preact";

function Button({ asChild, children, ...props }) {
  return asChild ? (
    <Slot {...props}>{children}</Slot>
  ) : (
    <button {...props}>{children}</button>
  );
}
```

The adapter uses Preact's VNode and ref behavior directly; it does not require
`preact/compat`. It accepts one non-Fragment VNode child. Preact CSS strings and
signal-like class/style values are passed through with target precedence;
object style pairs are shallowly merged. The adapter does not synthesize
combined Signals; supply a custom policy when signal-aware composition is
required. It also exports `PreactTargetProps`, `PreactTargetRef`,
`PreactCompositionProps`, and `PreactEventKey` for typed adapter integrations. See the
[Preact Slot semantics](./docs/design/preact-slot-semantics.md) for the full
behavior and compatibility limits.

## Goals

- Define portable polymorphic composition semantics.
- Provide framework adapters and capability declarations.
- Establish shared conformance tests for adapters.
- Preserve framework-native behavior where appropriate.
- Avoid depending on praxis-kit; it may consume UniversalSlots as an independent project.

## Development

Requirements: Node.js >=22.22.2 and pnpm 12.

```sh
pnpm install
pnpm build
pnpm run pack
pnpm lint
pnpm test
pnpm typecheck
pnpm verify:package
```

## Shared core

The framework-neutral composition policies and framework adapters are developed
as separate internal workspaces. They are intended to ship together in one
public `universal-slots` package, with subpath exports for the framework-neutral
and adapter APIs. Consumers will install one package rather than coordinating
separate Core and adapter releases.

The core implementation has no dependency on Praxis-kit or any UI framework.
Praxis-kit and other component libraries can consume UniversalSlots and adapt
their own higher-level component contracts to these primitives.

The Core API merges props contributed by a composing source with props
owned by the target that remains responsible for rendering. Ordinary target
values take precedence, class strings are concatenated, style objects are
shallowly merged with target values taking precedence, and recognized event
handlers are composed target-first then source by default. The React and
Preact `Slot` adapters also offer an opt-in `eventPolicy` that skips the source
handler when the target prevents default; a custom `mergeEvent` takes precedence.

```ts
import { mergeCompositionProps } from "universal-slots/core";

const merged = mergeCompositionProps(
  { className: "button", title: "source" },
  { className: "link", title: "target" },
  { isEventHandler: (name) => /^on[A-Z]/.test(name) },
);

// merged.className === "button link"
// merged.title === "target"
```

## React adapter

The React adapter exposes a low-level `Slot` composition primitive through the
current public subpath:

```tsx
import { Slot } from "universal-slots/react";

function Button({ asChild, children, ...props }) {
  if (asChild) {
    return <Slot {...props}>{children}</Slot>;
  }

  return <button {...props}>{children}</button>;
}
```

`Slot` composes props and behavior onto one React element while preserving the
target component. It does not implement a higher-level `asChild` API itself.
The adapter supports React 18 and React 19.

Custom component targets must forward contributed props and the injected ref to
the element they render. `Slot` cannot forward through a component that consumes
or discards those values.

For target-specific ref typing, supply the target as the `Slot` generic:

```tsx
<Slot<"a"> ref={anchorRef} aria-label="Profile">
  <a href="/profile">Profile</a>
</Slot>

<Slot<typeof Link> ref={anchorRef} aria-label="Profile">
  <Link href="/profile">Profile</Link>
</Slot>
```

The `Slot` generic is an explicit target type supplied by the caller; it is
not inferred or verified against the JSX child. This is necessary because
ordinary JSX element types do not reliably preserve the concrete target
component information required for ref extraction.

The React adapter also exports `ReactTargetProps`, `ReactTargetRef`, and
`ReactCompositionProps`. These utilities let component libraries build their
own typed composition APIs without introducing consumer-specific dependencies
into UniversalSlots. See
[the TypeScript composition design](./docs/design/typescript-composition.md).

See [polymorphic composition semantics](./docs/design/polymorphic-composition.md)
for the composition contract. Run `pnpm run pack` to create a local tarball.

## Workspace conventions

- The intended public distribution is one root package: `universal-slots`.
- `lib/*` is reserved for private internal workspaces; Core, React, and Preact
  workspace packages are implementation/build boundaries.
- `packages/*` is reserved for a future independently publishable product only
  when there is a concrete need for one.
- `apps/*` is intentionally omitted until an actual application is needed.

Core, React, and Preact are private implementation workspaces. Their build
outputs are assembled into the single public package, and workspace-only
references are rewritten during assembly.
