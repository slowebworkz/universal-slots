# Package development

The repository builds Core and React as private internal workspaces and
assembles their output into one public `universal-slots` package. Consumers
install one package and select an API through its documented subpath. See the
[distribution contract](./design/distribution-contract.md).

## Build the public package

From the repository root:

```sh
pnpm build
```

The build cleans and builds the internal Core workspace first, builds React
against Core's distributable declarations, then assembles both outputs under
`dist/`:

```text
dist/
├── core/
└── react/
```

The assembly step rewrites React's internal `@universal-slots/core` import to
the public self-reference `universal-slots/core` in JavaScript and declaration
files. The root package export map exposes only `./core` and `./react`.

## Create one local package tarball

```sh
pnpm run pack
```

This rebuilds the package and creates one tarball under the ignored
`artifacts/` directory:

```text
artifacts/universal-slots-0.0.0.tgz
```

The pack step checks that both public entrypoints and their declarations are
present and that the tarball contains only the root manifest, license, README,
allowlisted design documentation, and assembled `dist/` output. Re-running
`pnpm run pack` replaces the previous `universal-slots-*.tgz` artifact.

## Validate the package manifest

```sh
pnpm check:package
```

This runs strict `publint` against the root package.

## Verify the packed package

```sh
pnpm verify:package
```

This builds and packs the public package, runs strict `publint`, then installs
the resulting tarball into isolated temporary consumers using exact package
versions resolved in the repository lockfile. The package's `type-fest` and
`remeda` dependencies are pinned to their locked versions in each consumer, and
the check fails if any other version resolves. The checks run offline, so the
root workspace dependencies must already be present in the pnpm store. The
Core-only consumer verifies class, style, event, and ordinary-prop merging
without React installed. The React consumer renders the packaged `Slot` with
`react-dom/server` and verifies its composed class, style, and event-handler
behavior. Both consumers compile exact public declaration checks. Temporary
projects are removed after the check.

## Public imports

```ts
import { mergeCompositionProps } from "universal-slots/core";
import { Slot } from "universal-slots/react";
```

The React subpath requires a compatible React 19 peer dependency and, for
TypeScript consumers, compatible React 19 type declarations. Core-only
consumers do not need to install React.

## Release preparation

See [the release process](./releasing.md) for the single-package versioning,
changelog, dry-run, npm trusted-publishing, and GitHub Release procedures.
The root package version is authoritative; do not version or publish the
private Core and React workspaces independently.
