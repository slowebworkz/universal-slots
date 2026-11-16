# Single-package distribution contract

**Status:** Accepted contract for US-009b.6.1
**Public package:** `universal-slots`

This document records the accepted public package boundary and distribution
shape. US-009b.6.2 implements the workspace layout, build assembly, public
manifest, and single-tarball workflow.

## 1. Public package identity

- Publish one package named `universal-slots`.
- `packages/universal-slots/package.json` is the public package manifest and the source of
  truth for the published version.
- The initial package is ESM-only (`type: module`). CommonJS support is not
  part of the initial contract.
- Preserve the repository's current minimum Node.js engine declaration:
  `>=22.22.2`.
- Use the MIT license.
- Declare `sideEffects: false`, consistent with the current Core and adapter
  workspace packages.
- Do not add a root `.` export, `main`, or root `types` entrypoint; consumers
  use the explicit subpath exports below.
- Do not publish `@universal-slots/core`, `@universal-slots/react`, or
  `@universal-slots/preact` as separate packages. Their package names remain
  internal workspace identifiers only.

The `universal-slots` package is the only release and versioning unit. Core and adapter
workspace versions must not drive the public package version or require
coordinated releases.

## 2. Public import surface

The public API currently consists of three explicit subpath entrypoints:

| Import                   | Contents                                                                    |
| ------------------------ | --------------------------------------------------------------------------- |
| `universal-slots/core`   | Framework-neutral composition runtime and public composition types          |
| `universal-slots/react`  | React `Slot`, React composition options, and React target/type utilities    |
| `universal-slots/preact` | Preact `Slot`, Preact composition options, and Preact target/type utilities |

The package does not provide a root `universal-slots` entrypoint. Consumers
must choose the framework-neutral or framework-specific subpath explicitly.
The Preact subpath is experimental and currently targets Preact 11.

The current export map is:

```json
{
  "exports": {
    "./core": {
      "types": "./dist/core/index.d.ts",
      "import": "./dist/core/index.js"
    },
    "./react": {
      "types": "./dist/react/index.d.ts",
      "import": "./dist/react/index.js"
    },
    "./preact": {
      "types": "./dist/preact/index.d.ts",
      "import": "./dist/preact/index.js"
    }
  }
}
```

Only these documented subpaths are public. Internal files, workspace package
names, source paths, tests, and build helpers are not exported. Additional
adapter subpaths (for example `./lit` or `./web`) are added only when those
adapters have their own supported implementation and conformance coverage.

## 3. Internal workspace boundaries

Keep framework-neutral Core and framework adapters as separate development
and build workspaces, but do not make them separately publishable products.

The target workspace locations are:

```text
lib/
├── adapter-utils/
├── conformance/
└── core/
implementations/
├── react/
└── preact/
```

- `lib/core` owns framework-neutral composition policies and public Core
  source.
- `implementations/react` owns React-specific element, event, and ref behavior.
- `implementations/preact` owns Preact-specific VNode, event, and ref behavior.
- All of these are private internal workspaces. Their package manifests may retain
  internal workspace names for dependency resolution, but they are not
  published.
- `packages/universal-slots` is the single publishable package. `packages/`
  holds distribution artifacts only; it duplicates no implementation source and
  assembles the built outputs of `lib/` and `implementations/`.
- Internal workspace dependencies and source aliases are development
  mechanisms. They must not leak into the public manifest or packed output.

The internal workspaces now live at `lib/core`, `implementations/react`, and
`implementations/preact`.
Their manifests remain private workspace manifests and are not included in the
public tarball.

## 4. Distribution layout and internal references

The single package assembles the internal build outputs into this public
layout:

```text
dist/
├── core/
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── react/
│   ├── index.js
│   ├── index.d.ts
│   └── ...
└── preact/
    ├── index.js
    ├── index.d.ts
    └── ...
```

The framework adapters import Core through the internal workspace specifier
`@universal-slots/core`. The assembly step rewrites that specifier in both
emitted JavaScript and declaration files to the public self-reference
`universal-slots/core`. The packed package must not contain
runtime or declaration references to `@universal-slots/core`, `workspace:`,
or private workspace source paths.

The export map must point only to generated files under `dist/`. Source files,
tests, consumer fixtures, workspace configuration, and build tooling are not
part of the published runtime.

## 5. Public manifest dependencies

The public package manifest owns the union of dependencies required by the
public subpaths.

| Section            | Dependency     | Range     | Reason                                                   |
| ------------------ | -------------- | --------- | -------------------------------------------------------- |
| `dependencies`     | `type-fest`    | `^5.10.0` | Public Core declarations import its types                |
| `dependencies`     | `remeda`       | `^2.59.0` | Core and the framework adapters import runtime utilities |
| `peerDependencies` | `react`        | `^18.0.0  |                                                          | ^19.0.0` | Required when using the React subpath                       |
| `peerDependencies` | `@types/react` | `^18.0.0  |                                                          | ^19.0.0` | Required for TypeScript consumers of the React declarations |
| `peerDependencies` | `preact`       | `^11.0.0` | Required when using the experimental Preact subpath      |

React, `@types/react`, and Preact are optional peers at the package level
because a Core-only consumer must not need to install either framework. A
consumer using `universal-slots/react` is responsible for installing React 18
or React 19; a TypeScript consumer of that subpath also needs matching React
type declarations. A consumer using `universal-slots/preact`
installs Preact 11.

`react-dom` is not a public dependency or peer: the adapter does not import it.
Testing libraries, TypeScript, Vitest, Playwright, ESLint, Prettier, Turbo,
and other development tools remain development dependencies and are not
included as public runtime dependencies.

The peer metadata marks `react`, `@types/react`, and `preact` as optional.
Each framework subpath documents its corresponding consumer requirements.

## 6. Packed file allowlist

The published package contains only:

- `dist/`
- `LICENSE`
- `README.md`
- `docs/design/polymorphic-composition.md`
- `docs/design/react-slot-semantics.md`
- `docs/design/preact-slot-semantics.md`
- `docs/design/typescript-composition.md`

The package must not include source workspaces, tests, consumer fixtures,
scripts, build configuration, roadmap/planning files, local tarballs, or
repository-only development documentation.

The README must link only to documentation included in the package (or to
stable external repository URLs once those are established).

## 7. Versioning and packaging

- The `packages/universal-slots/package.json` version is the only published
  version.
- One root build assembles Core, React, and Preact in dependency order.
- One root pack command produces one `universal-slots-<version>.tgz` artifact
  in the ignored `artifacts/` directory.
- The packed manifest contains concrete public dependencies and peer
  dependencies; it contains no `workspace:`, `catalog:`, `link:`, or `file:`
  dependency protocols.
- Core, React, and Preact are not packed or published as independent release
  artifacts.

The implementation and verification of assembly, packing, strict package
validation, and clean external-consumer installation belong to
US-009b.6.2 and US-009b.6.3. Publication automation and release policy beyond
the single public version are addressed in US-009b.6.4.

## 8. Acceptance checks for this contract

Before implementation proceeds, the following decisions must remain true:

- A consumer installs one package: `universal-slots`.
- Core, React, and Preact are selected through their explicit public subpaths.
- No public root export or independent `@universal-slots/*` package is
  introduced.
- Internal workspaces live under `lib/` and `implementations/` and remain
  private.
- The public package version is the only version.
- The packed package contains the documented subpath outputs and their
  declared dependencies, with no workspace-only references.

## 9. Release and publication policy

`packages/universal-slots/package.json` is the sole version source for the public package.
Core and all framework adapters ship together. The initial public release was
intended to be `0.1.0`; the Core and React adapter were experimental at that
release. The Preact adapter is an experimental addition for a subsequent
package version. Stable release tags use
`vMAJOR.MINOR.PATCH` and must match the public package version and a dated
`CHANGELOG.md` entry.

The release workflow first validates and verifies a pushed version tag without
publishing. A separate manual workflow dispatch against that tag, with its
`publish` input explicitly enabled, publishes the exact verified tarball
using npm trusted publishing and provenance, then creates the GitHub Release
from the matching changelog section. See [the release process](../releasing.md)
for versioning, changelog, permissions, and recovery procedures.
