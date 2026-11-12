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
