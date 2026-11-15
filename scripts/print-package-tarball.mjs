import { fileURLToPath, URL } from "node:url";

import { findPackageTarball } from "./package-artifacts.mjs";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
console.log(await findPackageTarball(rootDir));
