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
// Check against the same TypeScript the workspace resolves, not a floating range.
const typescriptVersion = createRequire(import.meta.url)(
  "typescript/package.json",
).version;

const tarballPath = await findTarball(
  join(rootDir, "artifacts"),
  "universal-slots-core-",
  "pnpm pack:core",
);

const archiveFiles = listTarball(tarballPath);
assertTarballContents(archiveFiles);
const manifest = readTarballManifest(tarballPath);
assertConcreteDependencies(manifest);
assertExportTargets(manifest, archiveFiles);

const tempDir = await mkdtemp(join(tmpdir(), "universal-slots-core-consumer-"));
try {
  const consumerDir = join(tempDir, "consumer");
  const packageJson = {
    name: "universal-slots-core-consumer-check",
    private: true,
    type: "module",
    scripts: {},
    dependencies: {
      "@universal-slots/core": `file:${tarballPath}`,
    },
    devDependencies: {
      typescript: typescriptVersion,
    },
  };
  await mkdir(consumerDir);
  await writeFile(
    join(consumerDir, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  // Fixture file -> name inside the consumer. The repo-facing tsconfig.json is
  // editor-only, so the consumer receives tsconfig.consumer.json instead.
  const fixtures = [
    ["consumer.ts", "consumer.ts"],
    ["runtime-check.mjs", "runtime-check.mjs"],
    ["tsconfig.consumer.json", "tsconfig.json"],
  ];
  for (const [source, destination] of fixtures) {
    const sourcePath = join(rootDir, "scripts/fixtures/core-consumer", source);
    await writeFile(join(consumerDir, destination), await readFile(sourcePath));
  }

  run(
    "pnpm",
    ["install", "--no-frozen-lockfile"],
    consumerDir,
    "Consumer install",
  );
  run("node", ["runtime-check.mjs"], consumerDir, "Runtime import check");
  run(
    "pnpm",
    ["exec", "tsc", "--noEmit"],
    consumerDir,
    "Consumer TypeScript check",
  );
  console.log(`\nExternal consumer verification passed for ${tarballPath}.`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
