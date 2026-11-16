# Releasing UniversalSlots

UniversalSlots is released as one npm package: `universal-slots`. The root
`package.json` is the only version source; Core, React, and Preact are released
together through the same package version. Do not publish the private workspace
packages independently.

## Version policy

Use Semantic Versioning for the public `universal-slots` package, whose
manifest is `packages/universal-slots/package.json`:

- Before `1.0.0`, increment the patch for backward-compatible fixes and the
  minor version for new functionality. Breaking changes may occur in a minor
  release while the public contract remains pre-1.0, and must be called out in
  the changelog.
- From `1.0.0` onward, use patch releases for backward-compatible fixes,
  minor releases for backward-compatible functionality, and major releases
  for breaking public API or behavior changes.
- Keep Core and every adapter on the same version. A change to any public
  subpath is a change to the public package.
- The package is pre-1.0 and experimental. Do not bump the version, create a
  tag, or publish as part of ordinary development work; prepare and approve
  each release separately.
- The automated release workflow accepts stable `vMAJOR.MINOR.PATCH` tags
  only. Prerelease identifiers and npm dist-tags such as `next` are not part
  of the automated workflow. Add them only with a separately reviewed
  prerelease policy.

## Changelog policy

Maintain [`CHANGELOG.md`](../CHANGELOG.md) using Keep a Changelog sections:
`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`.

- Add user-visible changes to `Unreleased` as part of the change that
  introduces them.
- Describe changes from a consumer's perspective. Include affected public
  subpaths and migration guidance for breaking changes.
- Before a release, move the applicable entries into a dated version heading
  (`## [X.Y.Z] - YYYY-MM-DD`) and leave a fresh `Unreleased` section above it.
- Do not create an empty release entry. The release validator requires at
  least one change bullet under a recognized category.
- The release workflow uses that version's changelog section as the GitHub
  Release notes. The changelog is authoritative; do not maintain separate,
  divergent release notes.

## Prepare and validate a release

1. Confirm the intended changes are merged to `main` and the required CI
   checks are green.
2. Update the `version` in `packages/universal-slots/package.json`, the sole
   version source. The root `package.json` is a private workspace manifest and
   carries no version. Run `pnpm install` with the pinned pnpm version and
   commit any `pnpm-lock.yaml` change; the importer entry for
   `packages/universal-slots` must stay in sync, because CI installs with
   `--frozen-lockfile`. Do not change internal workspace versions to coordinate
   a release.
3. Move the relevant `Unreleased` entries into the dated version section in
   `CHANGELOG.md`, then start a new empty `Unreleased` section.
4. Commit the version and changelog changes to `main`.
5. Create and push the matching annotated tag, for example `v0.3.0` for
   package version `0.3.0`.
6. Push the tag. The tag-push workflow validates the tag/changelog match,
   executes `pnpm verify:package`, and resolves the exact tarball, but does not
   publish or create a GitHub Release. This is the automated dry run.
7. After reviewing the successful run, manually dispatch the workflow against
   the same tag with `publish` enabled to publish and create the GitHub Release.

The release validator can also be run locally:

```sh
pnpm release:check -- --tag vX.Y.Z
```

Replace `vX.Y.Z` with the exact tag matching the public package version and a
completed changelog entry. The release workflow performs the same validation
before package verification and publication.

## Automated publication and permissions

The workflow is `.github/workflows/release.yml`. A pushed `v*` tag triggers validation and package verification only. A manual
dispatch against that version tag defaults to validation-only; publication and
GitHub Release creation require explicitly enabling its `publish` input. This
separation ensures that pushing a tag never publishes without a second, explicit
release action.

Before enabling publication, configure the GitHub `npm-production`
environment with required reviewers and deployment restrictions appropriate
for production releases. Configure npm trusted publishing for the
`universal-slots` package to trust this GitHub repository, the exact workflow
filename `release.yml`, and the environment name `npm-production`. The
environment name must match in both GitHub and npm. Do not configure a
long-lived npm token in GitHub Actions.

npm trusted publishing requires npm CLI 11.5.1 or later and Node.js 22.14.0
or later. The workflow keeps the repository's Node.js 22.22.2 baseline and
installs the exact npm CLI version 11.15.0 during every release verification
run, including tag-push dry runs. It installs that version into a separate
directory on `PATH` instead of upgrading the runner's bundled npm in place,
because the in-place upgrade fails on Node 22 runners. It verifies the
installed version before continuing. The protected publication job installs and verifies the same
version again on its own runner. Update that pin deliberately and keep it at
or above npm's published trusted-publishing minimum. Neither job configures
`registry-url` or a `NODE_AUTH_TOKEN`; the public npm CLI package is installed
from the default public registry, and the publish operation authenticates
through OIDC.

Release permissions are separated by job. The verification job has
`contents: read` only. The npm publication job has `id-token: write` only and is gated by the
`npm-production` environment approval.
The GitHub Release job runs only after npm publication succeeds and has
`contents: write` only. This keeps OIDC credentials out of verification and
GitHub Release creation, and keeps repository write permission out of npm
publication.

The workflow also fails unless the tagged commit is an ancestor of
`origin/main`, so a tag created on an unmerged commit cannot be verified or
published. Its actions are pinned to full commit SHAs, and the resolved
tarball path reaches shell commands through an environment variable rather
than direct interpolation. Update the pinned SHAs deliberately when upgrading
an action. CI and CodeQL workflows follow the same full-SHA pinning policy.

Protect the `main` branch and restrict creation of `v*` tags to release
maintainers. Require successful CI before merging release preparation changes.
The workflow does not bypass repository branch/tag protections or decide
whether a release is appropriate.

The automated workflow publishes the exact tarball produced by
`pnpm verify:package`; it does not rebuild a separate artifact between
verification and publication. It publishes only the root `universal-slots`
package. Every publication remains an explicitly approved action.

## Recovery

If verification fails, do not publish. Fix the source or release metadata,
update the changelog, and rerun the dry run. If npm publication succeeds but
GitHub Release creation fails, do not attempt to republish the same version;
create the GitHub Release for the already-published tag after confirming the
npm package contents and provenance.

The verified tarball and release notes are kept as a workflow artifact for seven
days, named by run ID only. Re-running failed jobs reuses that artifact, so a
failed GitHub Release job can be re-run without republishing. If the artifact
has expired after npm publication succeeded, create the GitHub Release manually
from the changelog section; do not dispatch the workflow again, because npm will
reject the duplicate version.
