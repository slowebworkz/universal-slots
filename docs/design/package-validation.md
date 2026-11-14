# Package boundary validation

The public distribution is one `universal-slots` package with two explicit
subpath exports: `universal-slots/core` and `universal-slots/react`. Core and
React remain private implementation workspaces under `lib/`; neither is an
independent release candidate. See the
[single-package distribution contract](./distribution-contract.md).

## Workspace boundaries

- `lib/core` owns framework-neutral composition policies and public Core
  source.
- `lib/react` owns React-specific element, event, and ref behavior.
- React depends on Core through the private `@universal-slots/core` workspace
  package during development and build.
- The root package owns the union of public runtime dependencies and optional
  React peer dependencies.

Core's runtime and type source has no React, other framework, or Praxis-kit
imports. Framework event recognition and ref/lifecycle behavior remain in the
React adapter.

## Build assembly

`pnpm build` builds Core before React, then runs
`scripts/assemble-package.mjs`. The assembler copies the emitted workspace
outputs into `dist/core` and `dist/react` and rewrites the React output's
`@universal-slots/core` specifier to the public self-reference
`universal-slots/core` in both JavaScript and declaration files. It rejects
unresolved workspace protocol references in the assembled output.

The root export map points only to the generated JavaScript and declaration
entrypoints. The root manifest declares the concrete union of runtime
dependencies (`type-fest` and `remeda`) and optional React peers. Internal
workspace manifests are private and are not included in the public package.

## Package contents

`pnpm run pack` creates one `universal-slots-<version>.tgz` artifact. The root
manifest's `files` allowlist includes only `dist`, `LICENSE`, `README.md`, and
the three public design documents. The pack script inspects the resulting
tarball and fails if required entrypoints are missing or unexpected files are
included.

`pnpm verify:package` runs strict `publint` and verifies the packed tarball in
isolated external consumers. Consumer dependency versions are read from the
resolved default catalog in `pnpm-lock.yaml`, and installation runs offline. The
package's own `type-fest` and `remeda` dependencies keep their semver ranges, but
each consumer pins them to the locked versions with `pnpm-workspace.yaml`
overrides and fails if a different version resolves.
The Core-only consumer checks class, style, event, and ordinary-prop merging
without React installed, plus exact declaration assertions and negative cases.
The React consumer renders the packaged `Slot` with `react-dom/server` and
checks composed class, style, and event-handler output, then compiles the public
declarations. These checks are the first implementation slice of US-009b.6.3;
release automation and publication policy remain separate work.
