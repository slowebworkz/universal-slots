import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertConcreteDependencies,
  assertExportTargets,
  assertTarballContents,
  findTarball,
  listTarball,
  readTarballManifest,
  run,
} from "./lib/package-artifact.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactDir = join(rootDir, "artifacts");

// Check against the same toolchain the workspace resolves, not floating ranges.
const fromRoot = createRequire(import.meta.url);
const fromReact = createRequire(join(rootDir, "packages/react/package.json"));
const versions = {
  typescript: fromRoot("typescript/package.json").version,
  react: fromReact("react/package.json").version,
  "react-dom": fromReact("react-dom/package.json").version,
  "@types/react": fromReact("@types/react/package.json").version,
};

const corePath = await findTarball(
  artifactDir,
  "universal-slots-core-",
  "pnpm pack:react",
);
const reactPath = await findTarball(
  artifactDir,
  "universal-slots-react-",
  "pnpm pack:react",
);

const reactFiles = listTarball(reactPath);
assertTarballContents(reactFiles);
const reactManifest = readTarballManifest(reactPath);
assertConcreteDependencies(reactManifest);
assertExportTargets(reactManifest, reactFiles);

// The packed React must depend on exactly the core version that was packed
// alongside it, otherwise the two local tarballs are not a matching pair.
const coreVersion = readTarballManifest(corePath).version;
const declaredCore = reactManifest.dependencies?.["@universal-slots/core"];
if (declaredCore !== coreVersion) {
  throw new Error(
    `Packed React depends on @universal-slots/core ${declaredCore}, ` +
      `but the packed core tarball is ${coreVersion}.`,
  );
}

const tempDir = await mkdtemp(
  join(tmpdir(), "universal-slots-react-consumer-"),
);
try {
  const consumerDir = join(tempDir, "consumer");
  const packageJson = {
    name: "universal-slots-react-consumer-check",
    private: true,
    type: "module",
    scripts: {},
    dependencies: {
      "@universal-slots/react": `file:${reactPath}`,
      react: versions.react,
      "react-dom": versions["react-dom"],
    },
    devDependencies: {
      "@types/react": versions["@types/react"],
      typescript: versions.typescript,
    },
  };
  await mkdir(consumerDir);
  await writeFile(
    join(consumerDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  // The packed React depends on `@universal-slots/core@<version>`, which only
  // exists as a local tarball. pnpm resolves it from the registry (404) unless
  // it is overridden, so point it at the core tarball.
  await writeFile(
    join(consumerDir, "pnpm-workspace.yaml"),
    `overrides:\n  "@universal-slots/core": "file:${corePath}"\n`,
  );

  // Fixture file -> name inside the consumer. The repo-facing tsconfig.json is
  // editor-only, so the consumer receives tsconfig.consumer.json instead.
  const fixtures = [
    ["consumer.ts", "consumer.ts"],
    ["runtime-check.mjs", "runtime-check.mjs"],
    ["tsconfig.consumer.json", "tsconfig.json"],
  ];
  for (const [source, destination] of fixtures) {
    const sourcePath = join(rootDir, "scripts/fixtures/react-consumer", source);
    await writeFile(join(consumerDir, destination), await readFile(sourcePath));
  }

  run(
    "pnpm",
    ["install", "--no-frozen-lockfile"],
    consumerDir,
    "Consumer install",
  );
  run("node", ["runtime-check.mjs"], consumerDir, "Runtime render check");
  run(
    "pnpm",
    ["exec", "tsc", "--noEmit"],
    consumerDir,
    "Consumer TypeScript check",
  );
  console.log(
    `\nExternal React consumer verification passed for ${reactPath}.`,
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
