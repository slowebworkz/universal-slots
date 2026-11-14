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

This runs strict `publint` against the root package. External consumer runtime
and declaration checks are covered by US-009b.6.3.

## Public imports

```ts
import { mergeCompositionProps } from "universal-slots/core";
import { Slot } from "universal-slots/react";
```

The React subpath requires a compatible React 19 peer dependency. Core-only
consumers do not need to install React.
