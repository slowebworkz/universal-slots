# UniversalSlots

Universal slot composition technology for modern UI frameworks.

UniversalSlots defines framework-neutral composition policies and provides framework adapters that implement them without pretending that every framework has identical slot or projection semantics.

> **Status:** Experimental React 19 adapter in development. Public APIs and behavior are not yet stable.

## Goals

- Define portable polymorphic composition semantics.
- Provide framework adapters and capability declarations.
- Establish shared conformance tests for adapters.
- Preserve framework-native behavior where appropriate.
- Avoid depending on praxis-kit; it may consume UniversalSlots as an independent project.

## Development

Requirements: Node.js >=22.13.0 and pnpm 12.

```sh
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm typecheck
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

## React adapter

The initial React adapter exposes a low-level `Slot` composition primitive. The
import below shows the planned public subpath after US-009b.6 consolidation:

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
The adapter currently targets React 19.

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

See [ROADMAP.md](./ROADMAP.md) for the project plan and
[polymorphic composition semantics](./docs/design/polymorphic-composition.md)
for the composition contract.

## Workspace conventions

- The intended public distribution is one root package: `universal-slots`.
- `lib/*` is reserved for private internal workspaces; current Core and React
  workspace packages are transitional implementation/build boundaries.
- `packages/*` is reserved for a future independently publishable product only
  when there is a concrete need for one.
- `apps/*` is intentionally omitted until an actual application is needed.

The current Core and React tarballs are local verification artifacts, not the
planned public release format. Whatever assembles the single package must keep
the rule that a public package never depends on a private workspace package:
internal workspace code is bundled into the published artifact or not shipped.
See the repository roadmap for the single-package release strategy.
