import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Check against the same TypeScript the workspace resolves, not a floating range.
const typescriptVersion = createRequire(import.meta.url)(
  "typescript/package.json",
).version;
const artifactDir = join(rootDir, "artifacts");
const tarballPrefix = "universal-slots-core-";
const run = (command, args, cwd, label) => {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
};

const artifacts = (await readdir(artifactDir)).filter(
  (name) => name.startsWith(tarballPrefix) && name.endsWith(".tgz"),
);
if (artifacts.length !== 1) {
  throw new Error(
    `Expected exactly one ${tarballPrefix}*.tgz in artifacts; found ${artifacts.length}. ` +
      "Run pnpm pack:core first.",
  );
}

const tarballPath = join(artifactDir, artifacts[0]);
const archive = spawnSync("tar", ["-tzf", tarballPath], { encoding: "utf8" });
if (archive.error) throw archive.error;
if (archive.status !== 0) {
  throw new Error(`Unable to inspect package tarball: ${archive.stderr}`);
}

const archiveFiles = archive.stdout.split(/\r?\n/).filter(Boolean);
for (const expected of [
  "package/package.json",
  "package/LICENSE",
  "package/dist/index.js",
  "package/dist/index.d.ts",
]) {
  if (!archiveFiles.includes(expected)) {
    throw new Error(`Package tarball is missing ${expected}.`);
  }
}
const unexpectedFiles = archiveFiles.filter(
  (name) =>
    !name.endsWith("/") &&
    name !== "package/package.json" &&
    name !== "package/LICENSE" &&
    !name.startsWith("package/dist/"),
);
if (unexpectedFiles.length > 0) {
  throw new Error(
    `Package tarball contains unexpected files: ${unexpectedFiles.join(", ")}`,
  );
}

const manifestResult = spawnSync(
  "tar",
  ["-xOzf", tarballPath, "package/package.json"],
  { encoding: "utf8" },
);
if (manifestResult.error) throw manifestResult.error;
if (manifestResult.status !== 0) {
  throw new Error(
    `Unable to read packed package manifest: ${manifestResult.stderr}`,
  );
}
const manifest = JSON.parse(manifestResult.stdout);
for (const section of [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
]) {
  for (const [dependency, version] of Object.entries(manifest[section] ?? {})) {
    if (/^(workspace:|catalog:|link:|file:)/.test(version)) {
      throw new Error(
        `Packed dependency ${dependency} has unresolved protocol ${version}.`,
      );
    }
  }
}
for (const target of [
  manifest.exports?.["."]?.types,
  manifest.exports?.["."]?.import,
]) {
  const archivePath = `package/${target?.replace(/^\.\//, "")}`;
  if (typeof target !== "string" || !archiveFiles.includes(archivePath)) {
    throw new Error(
      `Packed package export target is missing from the tarball: ${target}`,
    );
  }
}

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
  console.log(`\nExternal consumer verification passed for ${artifacts[0]}.`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
