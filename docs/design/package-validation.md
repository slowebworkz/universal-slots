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

The two packages are at different stages.

**`@universal-slots/core` produces distributable output.** `pnpm --filter
@universal-slots/core build` runs `tsc -p tsconfig.build.json` and emits ESM
JavaScript and `.d.ts` declarations into `dist/` (test files excluded). Its
export map points strictly at `dist`, and its `files` allowlist is `dist` and
`LICENSE`, so the packed artifact contains no `src`. Workspace-only source
resolution lives outside the published manifest: React's `tsconfig.json` maps
`@universal-slots/core` to core's source with `paths`, and the root Vitest
config aliases it the same way, so typecheck and tests do not need a prior
build.

**`@universal-slots/react` is not independently packaged.** It has no `exports`,
`main`, or `types` fields and no emit step: its `build` script runs
`tsc --noEmit`. Within the workspace it is consumed through its source entry
point (`packages/react/src/index.ts`) only. Its dependency on core is declared
as `workspace:*`, which `pnpm pack` rewrites to a concrete version, so packing
React is only meaningful once core is published or installed from a tarball.
Giving React an emitted `dist`, an export map, and its own packed-consumer
verification is future release-readiness work.

## Verifying the packed core package

`pnpm pack:core` cleans, rebuilds, and packs core into `artifacts/`. `pnpm
verify:core` then runs `publint --strict`, inspects the tarball (required
files present, nothing outside `dist`, `LICENSE`, and `package.json`, no
unresolved `workspace:` or `catalog:` dependency protocols, export targets
present), installs the tarball into a temporary consumer outside the
workspace, and checks both an ESM runtime import and a TypeScript fixture
(including a negative assertion) against the packaged declarations. See
[package-development.md](../package-development.md). This covers core only; no
equivalent check exists for React yet, and the check is not part of CI.

## Turbo build outputs

Core's `build` emits `dist/`, so the Turbo `build` task declares
`outputs: ["dist/**"]`. React's `build` is still a TypeScript validation task
(`tsc --noEmit`) and produces no outputs. The root `build` script currently
runs `pnpm -r build` followed by a typecheck rather than `turbo run build`, so
Turbo's cache does not apply to it. When React begins emitting a distributable
build, update its export map and any additional Turbo outputs together.

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
