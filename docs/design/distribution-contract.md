# Single-package distribution contract

**Status:** Proposed contract for US-009b.6.1
**Public package:** `universal-slots`

This document proposes the initial public package boundary and distribution
shape for review. Once agreed, it will guide the assembly work in
US-009b.6.2. It does not change workspace manifests or build scripts.

## 1. Public package identity

- Publish one package named `universal-slots`.
- The root `package.json` is the public package manifest and the source of
  truth for the published version; its `private: true` setting must be removed
  when the package is made publishable.
- The initial package is ESM-only (`type: module`). CommonJS support is not
  part of the initial contract.
- Preserve the repository's current minimum Node.js engine declaration:
  `>=22.22.2`.
- Use the MIT license.
- Declare `sideEffects: false`, consistent with the current Core and React
  workspace packages.
- Do not add a root `.` export, `main`, or root `types` entrypoint; consumers
  use the explicit subpath exports below.
- Do not publish `@universal-slots/core` or `@universal-slots/react` as
  separate packages. Their package names remain internal workspace
  identifiers only.

The root package is the only release and versioning unit. Core and React
workspace versions must not drive the public package version or require
coordinated releases.

## 2. Public import surface

The initial public API consists of two explicit subpath entrypoints:

| Import                  | Contents                                                                 |
| ----------------------- | ------------------------------------------------------------------------ |
| `universal-slots/core`  | Framework-neutral composition runtime and public composition types       |
| `universal-slots/react` | React `Slot`, React composition options, and React target/type utilities |

The package does not provide a root `universal-slots` entrypoint in this
release. Consumers must choose the framework-neutral or framework-specific
subpath explicitly.

The initial export map is:

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
    }
  }
}
```

Only these documented subpaths are public. Internal files, workspace package
names, source paths, tests, and build helpers are not exported. Future adapter
subpaths (for example `./preact`, `./lit`, or `./web`) are added only when
those adapters have their own supported implementation and conformance
coverage.

## 3. Internal workspace boundaries

Keep framework-neutral Core and framework adapters as separate development
and build workspaces, but do not make them separately publishable products.

The target workspace locations are:

```text
lib/
├── core/
└── react/
```

- `lib/core` owns framework-neutral composition policies and public Core
  source.
- `lib/react` owns React-specific element, event, and ref behavior.
- Both are private internal workspaces. Their package manifests may retain
  internal workspace names for dependency resolution, but they are not
  published.
- `packages/` remains reserved for a future genuinely independent package
  only if a concrete need arises.
- Internal workspace dependencies and source aliases are development
  mechanisms. They must not leak into the public manifest or packed output.

The move from the current transitional `packages/core` and `packages/react`
locations is performed with the assembly implementation in US-009b.6.2, not
by this contract-only change.

## 4. Distribution layout and internal references

The single package assembles the internal build outputs into this public
layout:

```text
dist/
├── core/
│   ├── index.js
│   ├── index.d.ts
│   └── ...
└── react/
    ├── index.js
    ├── index.d.ts
    └── ...
```

The React adapter currently imports Core through the internal workspace
specifier `@universal-slots/core`. The assembly step must rewrite that
specifier in both emitted JavaScript and declaration files to the public
self-reference `universal-slots/core`. The packed package must not contain
runtime or declaration references to `@universal-slots/core`, `workspace:`,
or private workspace source paths.

The export map must point only to generated files under `dist/`. Source files,
tests, consumer fixtures, workspace configuration, and build tooling are not
part of the published runtime.

## 5. Public manifest dependencies

The root public manifest owns the union of dependencies required by the
public subpaths.

| Section            | Dependency     | Initial range | Reason                                                      |
| ------------------ | -------------- | ------------- | ----------------------------------------------------------- |
| `dependencies`     | `type-fest`    | `^5.10.0`     | Public Core declarations import its types                   |
| `dependencies`     | `remeda`       | `^2.59.0`     | React adapter imports runtime utilities                     |
| `peerDependencies` | `react`        | `^19.0.0`     | Required when using the React subpath                       |
| `peerDependencies` | `@types/react` | `^19.0.0`     | Required for TypeScript consumers of the React declarations |

React and `@types/react` are optional peers at the package level because a
Core-only consumer must not need to install React. A consumer using
`universal-slots/react` is responsible for installing a compatible React 19
runtime; a TypeScript consumer of that subpath also needs compatible React
type declarations.

`react-dom` is not a public dependency or peer: the adapter does not import it.
Testing libraries, TypeScript, Vitest, Playwright, ESLint, Prettier, Turbo,
and other development tools remain development dependencies and are not
included as public runtime dependencies.

The initial peer metadata marks both `react` and `@types/react` as optional.
The React subpath documentation must state the corresponding consumer
requirements.

## 6. Packed file allowlist

The published package contains only:

- `dist/`
- `LICENSE`
- `README.md`
- `docs/design/polymorphic-composition.md`
- `docs/design/react-slot-semantics.md`
- `docs/design/typescript-composition.md`

The package must not include source workspaces, tests, consumer fixtures,
scripts, build configuration, roadmap/planning files, local tarballs, or
repository-only development documentation.

The README must link only to documentation included in the package (or to
stable external repository URLs once those are established).

## 7. Versioning and packaging

- The root `package.json` version is the only published version.
- One root build assembles Core and React in dependency order.
- One root pack command produces one `universal-slots-<version>.tgz` artifact
  in the ignored `artifacts/` directory.
- The packed manifest contains concrete public dependencies and peer
  dependencies; it contains no `workspace:`, `catalog:`, `link:`, or `file:`
  dependency protocols.
- Core and React are not packed or published as independent release artifacts.

The implementation and verification of assembly, packing, strict package
validation, and clean external-consumer installation belong to
US-009b.6.2 and US-009b.6.3. Publication automation and release policy beyond
the single root version are addressed in US-009b.6.3.

## 8. Acceptance checks for this contract

Before implementation proceeds, the following decisions must remain true:

- A consumer installs one package: `universal-slots`.
- Core and React are selected through `universal-slots/core` and
  `universal-slots/react`.
- No public root export or independent `@universal-slots/*` package is
  introduced.
- Internal workspaces live under `lib/` and remain private.
- The root version is the only public version.
- The packed package contains the two subpath outputs and their declared
  dependencies, with no workspace-only references.
