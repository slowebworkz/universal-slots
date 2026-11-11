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

## Current external-consumer limitation

Both package export maps currently point directly at `src/index.ts`, and their
`build` scripts run TypeScript with `noEmit`. This is suitable for the current
workspace development setup but does not produce distributable JavaScript or
`.d.ts` artifacts. Consequently, the current checks validate workspace package
resolution and public source entry points, not installation from a packed npm
artifact. A future release-readiness task must define emitted build output and
verify it with `pnpm pack` plus a clean external consumer fixture.

## Turbo build outputs

The current `build` scripts are TypeScript validation tasks (`tsc --noEmit`),
not artifact-producing builds. Their Turbo task declares `outputs: []` so the
cache does not expect a `dist/` directory that these scripts never create.
When package builds begin emitting distributable JavaScript and declarations,
update the Turbo outputs and package export maps together.

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
