# Package development

> **Distribution direction:** UniversalSlots is intended to publish as one
> package, `universal-slots`, with Core and framework adapters exposed through
> subpath exports. The separate `@universal-slots/core` and
> `@universal-slots/react` tarballs described below are transitional workspace
> verification artifacts. They are not independent release candidates. US-009b.6
> will replace this two-tarball test workflow with one assembled root tarball.

## Build the workspace

Run the root build command to build workspace packages and then typecheck
the workspace:

```sh
pnpm build
```

## Create a local core tarball

Build and pack `@universal-slots/core` from the repository root:

```sh
pnpm pack:core
```

The command removes stale build output, rebuilds core, and writes one package
tarball to `artifacts/`:

```text
artifacts/universal-slots-core-0.0.0.tgz
```

The directory is ignored by Git. Re-running `pnpm pack:core` removes the
previous core tarball before creating its replacement, so the directory
does not accumulate stale artifacts.

## Create local Core and React tarballs

Build and pack the current Core and React workspace artifacts from the repository root:

```sh
pnpm pack:react
```

The command regenerates the Core tarball first, then cleans and builds React
against Core's distributable output before creating the React tarball. It writes
both artifacts to `artifacts/`:

```text
artifacts/universal-slots-core-0.0.0.tgz
artifacts/universal-slots-react-0.0.0.tgz
```

Re-running `pnpm pack:react` replaces the previous Core and React tarballs, so
the directory does not accumulate stale artifacts. The packed React manifest
rewrites the `workspace:*` Core dependency to its package version
(`@universal-slots/core@0.0.0`), which does not exist on the npm registry. See
the install steps below for how a consumer resolves it to the local Core
tarball.

## Install the tarballs in a consumer

From the root of another pnpm project (for example, praxis-kit), the Core
tarball is enough for `@universal-slots/core`:

```sh
pnpm add /absolute/path/to/universal-slots/artifacts/universal-slots-core-0.0.0.tgz
```

The React tarball depends on `@universal-slots/core@0.0.0`. Running `pnpm add`
for both tarballs is **not** enough: pnpm resolves that dependency from the npm
registry, where it does not exist, and fails with `ERR_PNPM_FETCH_404`. Add an
override to the consumer's `pnpm-workspace.yaml` that points Core at the local
tarball, then install React:

```yaml
overrides:
  "@universal-slots/core": "file:/absolute/path/to/universal-slots/artifacts/universal-slots-core-0.0.0.tgz"
```

```sh
pnpm add /absolute/path/to/universal-slots/artifacts/universal-slots-react-0.0.0.tgz
```

The override must live in `pnpm-workspace.yaml`; a `pnpm.overrides` entry in the
consumer's `package.json` is not picked up by this pnpm version. React also
needs its `react` peer (`^19.0.0`) installed in the consumer.

After rebuilding UniversalSlots, run the install again with the regenerated
tarball paths to update the consumer's dependencies and lockfile.

These two tarballs are transitional local test artifacts, not published releases.
Do not commit them or rely on their `0.0.0` versions as release versions. The
intended public release is one `universal-slots` tarball containing both APIs.

## Verify the packed core package

Run the complete package-consumer check from the repository root:

```sh
pnpm verify:core
```

This command:

1. Cleans, builds, and packs `@universal-slots/core` into `artifacts/`.
2. Runs strict `publint` checks against the built package using the pinned CLI.
3. Inspects the tarball for the package manifest and emitted JavaScript and
   declaration entrypoints, and rejects included source files.
4. Creates a temporary consumer outside the workspace and installs the tarball
   with pnpm.
5. Exercises the ESM entrypoint and compiles a TypeScript fixture against the
   package's public declarations and transitive type dependencies.

The temporary consumer and its lockfile are removed after the check. The
UniversalSlots tarball remains in `artifacts/` for installation into Praxis-kit.

## Verify the packed React package

```sh
pnpm verify:react
```

This command:

1. Packs Core, then cleans, builds, and packs `@universal-slots/react` against
   Core's distributable output.
2. Runs strict `publint` checks against the built React package.
3. Inspects the React tarball (required files, nothing outside `dist`,
   `LICENSE`, and `package.json`, concrete dependency versions, export targets
   present) and checks that it depends on exactly the Core version that was
   packed alongside it.
4. Creates a temporary consumer outside the workspace with a
   `pnpm-workspace.yaml` override that resolves Core to the local tarball, and
   installs the React tarball with the workspace's React, React DOM, and
   `@types/react` versions.
5. Server-renders `Slot` (default class composition, a configured `mergeClass`
   policy, and `composition` not leaking to the DOM) and compiles a TypeScript
   fixture, including negative assertions, against the packaged declarations.

Both verification commands share their tarball-inspection helpers in
`scripts/lib/package-artifact.mjs`. Neither is part of CI yet, because both
install from the network.
