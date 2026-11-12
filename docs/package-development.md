# Package development

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

## Install the tarball in a consumer

From the root of another pnpm project (for example, praxis-kit), install
the generated file using its absolute path:

```sh
pnpm add /absolute/path/to/universal-slots/artifacts/universal-slots-core-0.0.0.tgz
```

After rebuilding UniversalSlots, run `pnpm add` again with the regenerated
tarball path to update the consumer's dependency and lockfile.

The tarball is a local test artifact, not a published release. Do not commit
it or rely on its `0.0.0` version as a release version.
