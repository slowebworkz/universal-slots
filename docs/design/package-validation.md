# Package boundary validation

The public distribution is one `universal-slots` package with three explicit
subpath exports: `universal-slots/core`, `universal-slots/react`, and
`universal-slots/preact`. Core and the framework adapters remain private
implementation workspaces under `lib/` and `implementations/`; none is an independent release
candidate. See the
[single-package distribution contract](./distribution-contract.md).

## Workspace boundaries

- `lib/core` owns framework-neutral composition policies and public Core
  source.
- `implementations/react` owns React-specific element, event, and ref behavior.
- `implementations/preact` owns Preact-specific VNode, event, and ref behavior.
- React and Preact depend on Core through the private
  `@universal-slots/core` workspace package during development and build.
- The `packages/universal-slots` package owns the union of public runtime dependencies and optional
  React and Preact peer dependencies.

Core's runtime and type source has no React, Preact, or Praxis-kit imports.
Framework event recognition and ref/lifecycle behavior remain in their
respective adapters.

## Build assembly

`pnpm build` builds Core before React and Preact, then runs
`scripts/assemble-package.mjs`. The assembler copies the emitted workspace
outputs into `dist/core`, `dist/react`, and `dist/preact` and rewrites each
adapter's `@universal-slots/core` specifier to the public self-reference
`universal-slots/core` in both JavaScript and declaration files. It rejects
unresolved workspace protocol references in the assembled output.

The package export map points only to the generated JavaScript and declaration
entrypoints. The package manifest declares the concrete union of runtime
dependencies (`type-fest` and `remeda`) and optional React and Preact peers.
Internal workspace manifests are private and are not included in the public package.

## Package contents

`pnpm run pack` creates one `universal-slots-<version>.tgz` artifact. The package
manifest's `files` allowlist includes only `dist`, `LICENSE`, `README.md`, and
the three public design documents. The pack script inspects the resulting
tarball and fails if required entrypoints are missing or unexpected files are
included.

`pnpm verify:package` runs strict `publint` and verifies the packed tarball in
isolated external consumers. Consumer dependency versions are read from the
resolved default catalog in `pnpm-lock.yaml`; installation prefers the local
pnpm store but can fall back to the registry when packages or metadata are not
cached. The package's own `type-fest` and `remeda` dependencies keep their
semver ranges, but each consumer pins them to the locked versions with
`pnpm-workspace.yaml` overrides and fails if a different version resolves.

The Core-only consumer checks class, style, event, and ordinary-prop merging
without React or Preact installed, plus exact declaration assertions and
negative cases. The React consumer renders the packaged `Slot` with
`react-dom/server` and checks composed class, style, and event-handler output.
The Preact consumer renders the packaged `Slot` into a jsdom document without
React installed and checks class, style, and event composition. All consumers
compile public declaration checks. The Preact consumer check is part of US-010.
Release policy, tag validation, and publication automation are covered by
US-009b.6.4; see [the release process](../releasing.md).
