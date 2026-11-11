# Security Policy

## Supported versions

UniversalSlots is pre-release (`0.x`). Security fixes are applied to the latest
published version of `@universal-slots/core` and `@universal-slots/react` only.

## Reporting a vulnerability

Please do not report security vulnerabilities in public issues, discussions, or
pull requests.

Report them privately through GitHub's
[private vulnerability reporting](https://github.com/slowebworkz/universal-slots/security/advisories/new)
for this repository.

Please include:

- the affected package and version
- a description of the issue and its impact
- steps or a minimal reproduction
- any suggested mitigation, if you have one

## What to expect

- We aim to acknowledge reports within 5 business days.
- We will keep you informed as we investigate and work on a fix.
- Once a fix is released, we will publish a security advisory and credit the
  reporter unless they prefer to remain anonymous.

## Scope

In scope: the published `@universal-slots/*` packages and this repository's
source and build tooling.

Out of scope: vulnerabilities in third-party dependencies (report those
upstream; Dependabot alerts are enabled for this repository) and issues in
applications that consume UniversalSlots.
