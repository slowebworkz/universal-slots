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
