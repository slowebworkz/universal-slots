# UniversalSlots

Universal slot composition technology for modern UI frameworks.

UniversalSlots aims to define a framework-neutral composition contract and provide framework adapters that implement it without pretending that every framework has identical slot or projection semantics.

> **Status:** Early planning / scaffold. Public APIs and behavior are not yet stable.

## Goals

- Define portable slot-composition semantics.
- Provide framework adapters and capability declarations.
- Establish shared conformance tests for adapters.
- Preserve framework-native behavior where appropriate.
- Avoid depending on praxis-kit; it may consume UniversalSlots as an independent project.

## Development

Requirements: Node.js 22+ and pnpm.

```sh
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm typecheck
```

See [ROADMAP.md](./ROADMAP.md) for the proposed project plan.
