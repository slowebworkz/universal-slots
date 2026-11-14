# Releasing UniversalSlots

UniversalSlots is released as one npm package: `universal-slots`. The root
`package.json` is the only version source; Core and React are released together
through the same package version. Do not publish the private workspace
packages independently.

## Version policy

Use Semantic Versioning for the root package:

- Before `1.0.0`, increment the patch for backward-compatible fixes and the
  minor version for new functionality. Breaking changes may occur in a minor
  release while the public contract remains pre-1.0, and must be called out in
  the changelog.
- From `1.0.0` onward, use patch releases for backward-compatible fixes,
  minor releases for backward-compatible functionality, and major releases
  for breaking public API or behavior changes.
- Keep Core and every adapter on the same version. A change to any public
  subpath is a change to the root package.
- The intended first public release is `0.1.0`, reflecting the experimental
  status of the current API and React 19 adapter. Do not create that version or
  publish it as part of ordinary development work; prepare and approve the
  first release separately.
- The automated release workflow accepts stable `vMAJOR.MINOR.PATCH` tags
  only. Prerelease identifiers and npm dist-tags such as `next` are not part
  of the initial automated workflow. Add them only with a separately reviewed
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
2. Update the root `package.json` version and `pnpm-lock.yaml` importer
   metadata using the pinned pnpm version. Do not change internal workspace
   versions to coordinate a release.
3. Move the relevant `Unreleased` entries into the dated version section in
   `CHANGELOG.md`, then start a new empty `Unreleased` section.
4. Commit the version and changelog changes to `main`.
5. Create and push the matching annotated tag, for example `v0.1.0` for
   package version `0.1.0`.
6. Push the tag. The tag-push workflow validates the tag/changelog match,
   executes `pnpm verify:package`, and resolves the exact tarball, but does not
   publish or create a GitHub Release. This is the automated dry run.
7. After reviewing the successful run, manually dispatch the workflow against
   the same tag with `publish` enabled to publish and create the GitHub Release.

The release validator can also be run locally:

```sh
pnpm release:check -- --tag vX.Y.Z
```

Replace `vX.Y.Z` with the exact tag matching the root package version and a
completed changelog entry. The release workflow performs the same validation
before package verification and publication.

## Automated publication and permissions

The workflow is `.github/workflows/release.yml`. A pushed `v*` tag triggers validation and package verification only. A manual
dispatch against that version tag defaults to validation-only; publication and
GitHub Release creation require explicitly enabling its `publish` input. This
separation ensures that pushing a tag never publishes without a second, explicit
release action.

Before enabling publication, configure npm trusted publishing for the
`universal-slots` package to trust this GitHub repository and the exact
workflow filename `release.yml`. Do not configure a long-lived npm token in
GitHub Actions. The workflow requests the GitHub OIDC `id-token` permission and
publishes the verified tarball with npm provenance. It also needs the normal
GitHub `contents: write` permission to create the GitHub Release.

The workflow also fails unless the tagged commit is an ancestor of
`origin/main`, so a tag created on an unmerged commit cannot be verified or
published. Its actions are pinned to full commit SHAs, and the resolved tarball
path reaches shell commands through an environment variable rather than direct
interpolation. Update the pinned SHAs deliberately when upgrading an action.

Protect the `main` branch and restrict creation of `v*` tags to release
maintainers. Require successful CI before merging release preparation changes.
The workflow does not bypass repository branch/tag protections or decide
whether a release is appropriate.

The automated workflow publishes the exact tarball produced by
`pnpm verify:package`; it does not rebuild a separate artifact between
verification and publication. It publishes only the root `universal-slots`
package. The first public publication remains an explicitly approved action.

## Recovery

If verification fails, do not publish. Fix the source or release metadata,
update the changelog, and rerun the dry run. If npm publication succeeds but
GitHub Release creation fails, do not attempt to republish the same version;
create the GitHub Release for the already-published tag after confirming the
npm package contents and provenance.
