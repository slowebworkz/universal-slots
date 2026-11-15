import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");
const workspaces = [
  { name: "core", source: join(rootDir, "lib/core/dist") },
  { name: "adapter-utils", source: join(rootDir, "lib/adapter-utils/dist") },
  { name: "react", source: join(rootDir, "lib/react/dist") },
  { name: "preact", source: join(rootDir, "lib/preact/dist") },
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const workspace of workspaces) {
  const entrypoints = ["index.js", "index.d.ts"];
  for (const entrypoint of entrypoints) {
    await readFile(join(workspace.source, entrypoint)).catch(() => {
      throw new Error(
        `Missing ${workspace.name} build output ${entrypoint}; build the workspace first.`,
      );
    });
  }

  await cp(workspace.source, join(distDir, workspace.name), {
    recursive: true,
  });
}

// Internal workspaces are developed against private package names. Rewrite
// those specifiers in emitted JavaScript and declarations. Core is public, so
// it maps to the root export map's self-reference. Adapter utilities are
// private: they have no export-map entry, so adapters reach them through a
// relative path inside the published `dist` tree.
const adapterUtilsEntry = join(distDir, "adapter-utils", "index.js");
for (const workspace of ["adapter-utils", "react", "preact"]) {
  const files = await listFiles(join(distDir, workspace));
  for (const path of files) {
    if (!/\.(?:js|mjs|cjs|d\.ts)$/.test(path)) continue;
    const source = await readFile(path, "utf8");
    let output = source.replaceAll(
      "@universal-slots/core",
      "universal-slots/core",
    );
    if (workspace !== "adapter-utils") {
      const relativeEntry = relative(dirname(path), adapterUtilsEntry)
        .split("\\")
        .join("/");
      output = output.replaceAll(
        "@universal-slots/adapter-utils",
        relativeEntry.startsWith(".") ? relativeEntry : `./${relativeEntry}`,
      );
    }
    if (output !== source) await writeFile(path, output);
  }
}

const emittedFiles = await listFiles(distDir);
for (const path of emittedFiles) {
  if (!/\.(?:js|mjs|cjs|d\.ts)$/.test(path)) continue;
  const source = await readFile(path, "utf8");
  if (
    source.includes("@universal-slots/core") ||
    source.includes("@universal-slots/adapter-utils") ||
    /(?:workspace:|catalog:|link:|file:)/.test(source)
  ) {
    throw new Error(
      `Unresolved workspace reference in ${relative(rootDir, path)}.`,
    );
  }
}

console.log(
  "\nAssembled public package outputs in dist/core, dist/react, dist/preact, and private dist/adapter-utils.",
);
