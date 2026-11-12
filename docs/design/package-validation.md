# Package boundary validation

The core policy tests import `mergeCompositionProps` through the public
`@universal-slots/core` source entry point (`packages/core/src/index.ts`). The
React runtime tests import `Slot` through the public React source entry point
(`packages/react/src/index.ts`). The React adapter imports core by the package
specifier `@universal-slots/core`, and its workspace dependency is declared as
`workspace:*`; it does not reach into core's private source paths.

Core's runtime and type source has no React, other framework, or Praxis-kit
imports. Framework event recognition and ref/lifecycle behavior remain in the
React adapter.

## Package distribution status

> **Transitional workspaces.** The intended public release is one
> `universal-slots` package with subpath exports (see the roadmap). The
> `@universal-slots/core` and `@universal-slots/react` workspace packages, their
> tarballs, and the checks below are build and consumer-test boundaries; they
> are not independent release candidates. The single-package assembly (US-009b.6)
> will replace the two-tarball workflow.

Both workspace packages emit distributable output and each has a packed-consumer
verification.

**`@universal-slots/core` produces distributable output.** `pnpm --filter
@universal-slots/core build` runs `tsc -p tsconfig.build.json` and emits ESM
JavaScript and `.d.ts` declarations into `dist/` (test files excluded). Its
export map points strictly at `dist`, and its `files` allowlist is `dist` and
`LICENSE`, so the packed artifact contains no `src`. Workspace-only source
resolution lives outside the published manifest: React's editor and typecheck
`tsconfig.json` maps `@universal-slots/core` to core's source with `paths`, and
the root Vitest config aliases it the same way, so typecheck and tests do not
need a prior build.

**`@universal-slots/react` also produces distributable output.** Its `build` runs `tsc -p tsconfig.build.json`
and emits ESM JavaScript and `.d.ts` declarations into `dist/` (tests and the
`*.consumer-types.tsx` fixture excluded). Its export map points strictly at
`dist`, and its `files` allowlist is `dist` and `LICENSE`. Unlike its typecheck
configuration, the build configuration has no `paths` mapping to core's
source: it resolves `@universal-slots/core` through core's published export
map, so core must be built first (the root `pnpm build` orders this) and the
emitted JavaScript and declarations keep `@universal-slots/core` as a package
specifier. Its dependency on core is declared as `workspace:*`, which `pnpm
pack` rewrites to a concrete version (currently `0.0.0`), and its `react` peer
range comes from the catalog (`^19.0.0`). The packed React depends on
`@universal-slots/core@0.0.0`, which does not exist on the npm registry, so a
consumer must override that dependency to point at core's local tarball.

## Verifying the packed core package

`pnpm pack:core` cleans, rebuilds, and packs core into `artifacts/`. `pnpm
verify:core` then runs `publint --strict`, inspects the tarball (required
files present, nothing outside `dist`, `LICENSE`, and `package.json`, no
unresolved `workspace:` or `catalog:` dependency protocols, export targets
present), installs the tarball into a temporary consumer outside the
workspace, and checks both an ESM runtime import and a TypeScript fixture
(including a negative assertion) against the packaged declarations. See
[package-development.md](../package-development.md).

## Verifying the packed React package

`pnpm pack:react` packs core, then cleans, rebuilds, and packs React. `pnpm
verify:react` runs `publint --strict`, inspects the React tarball with the same
checks as core, and verifies that it depends on exactly the core version that
was packed beside it. It then installs the React tarball into a temporary
consumer outside the workspace. That consumer's `pnpm-workspace.yaml` overrides
`@universal-slots/core` to core's local tarball, because pnpm would otherwise
resolve it from the registry and fail with `ERR_PNPM_FETCH_404`. The check
server-renders `Slot` (default and configured class composition, and
`composition` not leaking to the DOM) and compiles a TypeScript fixture with
negative assertions against the packaged declarations.

Neither verification is part of CI, because both install from the network.

## Turbo build outputs

Core's and React's `build` scripts emit `dist/`, so the Turbo `build` task
declares `outputs: ["dist/**"]`. The root `build` script currently
runs `pnpm -r build` followed by a typecheck rather than `turbo run build`, so
Turbo's cache does not apply to it. When a package's emitted output changes,
update its export map and the Turbo outputs together.

## Runtime guard dependency

The React adapter uses Remeda (`isNullish`, `isNonNullish`) for nullish checks
on refs, composed refs, and composition options. Remeda ships ESM with
`sideEffects: false`, so a bundler keeps only the guards that are imported
(about 230 B gzipped for eight guards). It is declared through the workspace
catalog and listed in the React package's `dependencies`.

The core package keeps its runtime predicates hand-written and native
(`typeof value === "function"`, null/array checks for style objects, and `== null`
fallbacks). It has no runtime guard dependency, so its framework-neutral
composition boundary stays free of third-party runtime code; `type-fest` is
used for types only. Core's style-object check deliberately excludes `null`
and arrays but accepts class instances, which no Remeda guard matches exactly.

React-specific element and ref validation continues to use React's
`isValidElement` plus native ref lifecycle checks. The strict
`instance !== null` checks in the ref lifecycle stay native because they
distinguish `null` from `undefined`. Simple property-presence checks
(`Object.hasOwn`) also remain native.
