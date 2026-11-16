import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const manifestPath = (rootDir) =>
  join(rootDir, "packages/universal-slots/package.json");

export async function removePackageTarballs(rootDir) {
  const manifest = JSON.parse(await readFile(manifestPath(rootDir), "utf8"));
  const artifactDir = join(rootDir, "artifacts");
  const prefix = `${manifest.name}-`;
  const entries = await readdir(artifactDir).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  await Promise.all(
    entries
      .filter((name) => name.startsWith(prefix) && name.endsWith(".tgz"))
      .map((name) => rm(join(artifactDir, name), { force: true })),
  );
}

export async function findPackageTarball(rootDir) {
  const manifest = JSON.parse(await readFile(manifestPath(rootDir), "utf8"));
  const artifactDir = join(rootDir, "artifacts");
  const prefix = `${manifest.name}-`;
  const entries = await readdir(artifactDir).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(`Missing ${artifactDir}. Run pnpm run pack first.`);
    }
    throw error;
  });
  const artifacts = entries.filter(
    (name) => name.startsWith(prefix) && name.endsWith(".tgz"),
  );

  if (artifacts.length !== 1) {
    throw new Error(
      `Expected exactly one ${prefix}*.tgz artifact; found ${artifacts.length}.`,
    );
  }

  return join(artifactDir, artifacts[0]);
}
