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

Strict `publint` and clean external-consumer runtime/type checks are the next
validation stage, US-009b.6.3.
