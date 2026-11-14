import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");
const workspaces = [
  { name: "core", source: join(rootDir, "lib/core/dist") },
  { name: "react", source: join(rootDir, "lib/react/dist") },
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

// React is developed against the private Core workspace package. Rewrite that
// internal specifier in emitted JavaScript and declarations to the public
// package self-reference exposed by the root export map.
const reactFiles = await listFiles(join(distDir, "react"));
for (const path of reactFiles) {
  if (!/\.(?:js|mjs|cjs|d\.ts)$/.test(path)) continue;
  const source = await readFile(path, "utf8");
  const output = source.replaceAll(
    "@universal-slots/core",
    "universal-slots/core",
  );
  if (output !== source) await writeFile(path, output);
}

const emittedFiles = await listFiles(distDir);
for (const path of emittedFiles) {
  if (!/\.(?:js|mjs|cjs|d\.ts)$/.test(path)) continue;
  const source = await readFile(path, "utf8");
  if (
    source.includes("@universal-slots/core") ||
    /(?:workspace:|catalog:|link:|file:)/.test(source)
  ) {
    throw new Error(
      `Unresolved workspace reference in ${relative(rootDir, path)}.`,
    );
  }
}

console.log("\nAssembled public package outputs in dist/core and dist/react.");
