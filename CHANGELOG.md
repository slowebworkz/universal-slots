# Changelog

All notable changes to UniversalSlots are documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Release entries
are added when a version is prepared; do not publish a version with only an
`Unreleased` section.

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.2.0] - 2026-11-15

### Added

- Add an experimental Preact 11 adapter at `universal-slots/preact`, with
  Preact-native VNode cloning, ref composition, and signal-aware class/style
  value pass-through.

### Changed

- Support React 18 and React 19 in `universal-slots/react`. The adapter handles
  both ref models, including React 19 callback-ref cleanup functions.

### Fixed

- Widen the optional `react` and `@types/react` peer dependency ranges from
  `^19.0.0` to `^18.0.0 || ^19.0.0`, so React 18 consumers no longer conflict
  with the package. Core-only consumers still do not need React installed.

## [0.1.0] - 2026-11-14

### Added

- Publish the framework-neutral composition API from `universal-slots/core`,
  including `mergeCompositionProps`, configurable class, style, and event
  policies, and the `MergeCompositionProps` type projection.
- Publish the experimental React 19 `Slot` adapter from `universal-slots/react`,
  including composed event handlers and refs, configurable composition
  policies, and React-specific target prop and ref types.
- Provide a single ESM package with separate Core and React subpath exports,
  bundled TypeScript declarations, and optional React peer dependencies.
