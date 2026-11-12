import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** Run a command, streaming output, and throw if it fails. */
export function run(command, args, cwd, label) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

/** Return the path of the single `<prefix>*.tgz` in `artifactDir`. */
export async function findTarball(artifactDir, prefix, packCommand) {
  const artifacts = (await readdir(artifactDir)).filter(
    (name) => name.startsWith(prefix) && name.endsWith(".tgz"),
  );
  if (artifacts.length !== 1) {
    throw new Error(
      `Expected exactly one ${prefix}*.tgz in artifacts; found ${artifacts.length}. ` +
        `Run ${packCommand} first.`,
    );
  }
  return join(artifactDir, artifacts[0]);
}

function tar(args, label) {
  const result = spawnSync("tar", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Unable to ${label}: ${result.stderr}`);
  }
  return result.stdout;
}

/** List the file entries of a package tarball. */
export function listTarball(tarballPath) {
  return tar(["-tzf", tarballPath], "inspect package tarball")
    .split(/\r?\n/)
    .filter(Boolean);
}

/** Read the packed `package.json` from a package tarball. */
export function readTarballManifest(tarballPath) {
  return JSON.parse(
    tar(
      ["-xOzf", tarballPath, "package/package.json"],
      "read packed package manifest",
    ),
  );
}

/**
 * Assert a tarball holds the required files and nothing outside the manifest,
 * license, and `dist/`.
 */
export function assertTarballContents(archiveFiles) {
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
}

/** Assert no dependency still uses a workspace-only protocol. */
export function assertConcreteDependencies(manifest) {
  for (const section of [
    "dependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const [name, version] of Object.entries(manifest[section] ?? {})) {
      if (/^(workspace:|catalog:|link:|file:)/.test(version)) {
        throw new Error(
          `Packed dependency ${name} has unresolved protocol ${version}.`,
        );
      }
    }
  }
}

/** Assert the root export's `types` and `import` targets are in the tarball. */
export function assertExportTargets(manifest, archiveFiles) {
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
}
