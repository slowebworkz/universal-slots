import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { exit } from "node:process";
import { fileURLToPath, URL } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const artifactDir = join(rootDir, "artifacts");
const manifest = JSON.parse(
  await readFile(join(rootDir, "package.json"), "utf8"),
);
const tarballPrefix = `${manifest.name}-`;

for (const entrypoint of [
  "core/index.js",
  "core/index.d.ts",
  "react/index.js",
  "react/index.d.ts",
]) {
  await readFile(join(rootDir, "dist", entrypoint)).catch(() => {
    throw new Error(
      `Missing dist/${entrypoint}. Run the package build before packing.`,
    );
  });
}

await mkdir(artifactDir, { recursive: true });
const existingArtifacts = await readdir(artifactDir);
await Promise.all(
  existingArtifacts
    .filter((name) => name.startsWith(tarballPrefix) && name.endsWith(".tgz"))
    .map((name) => rm(join(artifactDir, name), { force: true })),
);

const result = spawnSync("pnpm", ["pack", "--pack-destination", artifactDir], {
  cwd: rootDir,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) exit(result.status ?? 1);

const artifacts = (await readdir(artifactDir)).filter(
  (name) => name.startsWith(tarballPrefix) && name.endsWith(".tgz"),
);
if (artifacts.length !== 1) {
  throw new Error(
    `Expected exactly one ${tarballPrefix}*.tgz artifact; found ${artifacts.length}.`,
  );
}

const tarballPath = join(artifactDir, artifacts[0]);
const listing = spawnSync("tar", ["-tzf", tarballPath], {
  encoding: "utf8",
});
if (listing.error) throw listing.error;
if (listing.status !== 0) {
  throw new Error(`Unable to inspect package tarball: ${listing.stderr}`);
}

const files = listing.stdout.split(/\r?\n/).filter(Boolean);
const required = [
  "package/package.json",
  "package/LICENSE",
  "package/README.md",
  "package/dist/core/index.js",
  "package/dist/core/index.d.ts",
  "package/dist/react/index.js",
  "package/dist/react/index.d.ts",
];
for (const file of required) {
  if (!files.includes(file)) {
    throw new Error(`Packed package is missing ${file}.`);
  }
}

const allowedPrefixes = ["package/dist/"];
const allowedFiles = new Set([
  "package/package.json",
  "package/LICENSE",
  "package/README.md",
  "package/docs/design/polymorphic-composition.md",
  "package/docs/design/react-slot-semantics.md",
  "package/docs/design/typescript-composition.md",
]);
const unexpected = files.filter(
  (file) =>
    !file.endsWith("/") &&
    !allowedFiles.has(file) &&
    !allowedPrefixes.some((prefix) => file.startsWith(prefix)),
);
if (unexpected.length > 0) {
  throw new Error(`Unexpected files in package: ${unexpected.join(", ")}`);
}

const packedManifestResult = spawnSync(
  "tar",
  ["-xOzf", tarballPath, "package/package.json"],
  { encoding: "utf8" },
);
if (packedManifestResult.error) throw packedManifestResult.error;
if (packedManifestResult.status !== 0) {
  throw new Error(
    `Unable to read packed package manifest: ${packedManifestResult.stderr}`,
  );
}
const packedManifest = JSON.parse(packedManifestResult.stdout);
for (const section of [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
]) {
  for (const [name, version] of Object.entries(packedManifest[section] ?? {})) {
    if (/^(workspace:|catalog:|link:|file:)/.test(version)) {
      throw new Error(
        `Packed dependency ${name} has unresolved protocol ${version}.`,
      );
    }
  }
}
for (const exportTargets of Object.values(packedManifest.exports ?? {})) {
  for (const target of Object.values(exportTargets)) {
    if (typeof target !== "string") continue;
    const archivePath = `package/${target.replace(/^\.\//, "")}`;
    if (!files.includes(archivePath)) {
      throw new Error(`Packed export target is missing: ${target}`);
    }
  }
}

console.log(`\nLocal package artifact: ${tarballPath}`);
