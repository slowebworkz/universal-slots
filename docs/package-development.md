# Package development

The repository builds Core, React, and Preact as private internal workspaces and
assembles their output into one public `universal-slots` package. Consumers
install one package and select an API through its documented subpath. See the
[distribution contract](./design/distribution-contract.md).

## Build the public package

From the repository root:

```sh
pnpm build
```

The build cleans and builds the internal Core workspace first, then builds the
React and Preact adapters against Core's distributable declarations. It
assembles them under `packages/universal-slots/dist/`:

```text
packages/universal-slots/dist/
├── core/           public: universal-slots/core
├── react/          public: universal-slots/react
├── preact/         public: universal-slots/preact
└── adapter-utils/  private implementation detail
```

`core`, `react`, and `preact` are the three public entrypoints. `adapter-utils`
is a fourth, private directory: the React and Preact builds import it by
relative path, so it must ship, but it has no export-map entry and is not a
supported API. Do not import it from consumer code.

The assembly step rewrites each adapter's internal `@universal-slots/core`
import to the public self-reference `universal-slots/core` in JavaScript and
declaration files. The package export map exposes `./core`, `./react`,
and `./preact`.

## Create one local package tarball

```sh
pnpm run pack
```

This rebuilds the package and creates one tarball under the ignored
`artifacts/` directory:

```text
artifacts/universal-slots-<version>.tgz
```

The pack step checks that all three public entrypoints and their declarations
are present and that the tarball contains only the package manifest, license, README,
allowlisted design documentation, and the assembled `dist/` output. Re-running
`pnpm run pack` replaces the previous `universal-slots-*.tgz` artifact.

## Validate the package manifest

```sh
pnpm check:package
```

This runs strict `publint` against `packages/universal-slots`.

## Verify the packed package

```sh
pnpm verify:package
```

To check the advertised minimum Preact release instead of the locked one, run
`pnpm verify:package:preact-min`. It sets `VERIFY_PREACT_VERSION=11.0.0` for the
Preact consumer.

This builds and packs the public package, runs strict `publint`, then installs
the resulting tarball into isolated Core-only, React, and Preact consumers
using exact package versions resolved in the repository lockfile, with the
React 18 compatibility consumer pinned to React 18.3.1 and matching type
packages. The package's
`type-fest` and `remeda` dependencies are pinned to their locked versions in
each consumer, and the check fails if any pinned version differs. Installation
prefers the local pnpm store but can fall back to the registry when metadata or
packages are not cached. The Core-only consumer verifies class, style, event, and ordinary-prop merging
without React or Preact installed. The React 19 consumer renders the packaged
`Slot` with `react-dom/server`; a separate React 18 consumer verifies legacy
element-ref extraction and ref lifecycle in jsdom. The Preact consumer renders
its packaged `Slot` in jsdom without React installed. The React and Preact consumers verify class, style, and event-handler behavior.
All consumers compile public declaration checks. Temporary projects are
removed after the check.

## Public imports

```ts
import { mergeCompositionProps } from "universal-slots/core";
import { Slot } from "universal-slots/react";
import { Slot as PreactSlot } from "universal-slots/preact";
```

The React subpath supports React 18 and React 19. TypeScript consumers should
install matching React 18 or React 19 type declarations. The experimental
Preact subpath targets Preact 11 and requires the `preact` peer. Core-only
consumers do not need to install either framework.

## Release preparation

See [the release process](./releasing.md) for the single-package versioning,
changelog, dry-run, npm trusted-publishing, and GitHub Release procedures.
The version in `packages/universal-slots/package.json` is authoritative; do not version or publish the
private Core and adapter workspaces independently.
