import { spawnSync } from "node:child_process";
import { access, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { exit } from "node:process";
import { fileURLToPath, URL } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const packageDir = join(rootDir, "packages/core");
const artifactDir = join(rootDir, "artifacts");
const tarballPrefix = "universal-slots-core-";

// Packing without build output would produce an empty package; use
// `pnpm pack:core`, which cleans and rebuilds first.
await access(join(packageDir, "dist/index.js")).catch(() => {
  throw new Error("packages/core/dist is missing. Run `pnpm pack:core`.");
});

await mkdir(artifactDir, { recursive: true });

// Avoid leaving multiple artifacts with the same package/version name.
const existingArtifacts = await readdir(artifactDir);
await Promise.all(
  existingArtifacts
    .filter((name) => name.startsWith(tarballPrefix) && name.endsWith(".tgz"))
    .map((name) => rm(join(artifactDir, name), { force: true })),
);

const result = spawnSync("pnpm", ["pack", "--pack-destination", artifactDir], {
  cwd: packageDir,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  exit(result.status ?? 1);
}

const artifacts = (await readdir(artifactDir)).filter(
  (name) => name.startsWith(tarballPrefix) && name.endsWith(".tgz"),
);

if (artifacts.length !== 1) {
  throw new Error(
    `Expected exactly one ${tarballPrefix}*.tgz artifact; found ${artifacts.length}.`,
  );
}

console.log(`\nLocal package artifact: ${join(artifactDir, artifacts[0])}`);
