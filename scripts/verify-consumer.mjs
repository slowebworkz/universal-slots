import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

import { findPackageTarball } from "./package-artifacts.mjs";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const lockfile = await readFile(join(rootDir, "pnpm-lock.yaml"), "utf8");
const tarball = await findPackageTarball(rootDir);
const directories = [];

function readLockedCatalogVersion(packageName) {
  const lines = lockfile.split(/\r?\n/);
  let inDefaultCatalog = false;
  let currentPackage = null;

  for (const line of lines) {
    if (line === "catalogs:") continue;
    // A two-space header opens a catalog; only the default one is read, so
    // entries from named catalogs (for example `typescript7`) never match.
    if (/^ {2}\S.*:$/.test(line)) {
      inDefaultCatalog = line === "  default:";
      currentPackage = null;
      continue;
    }
    if (/^(?:importers|packages|snapshots):$/.test(line)) {
      if (inDefaultCatalog) break;
      continue;
    }
    if (!inDefaultCatalog) continue;

    const packageMatch = line.match(
      /^ {4}(?:'([^']+)'|"([^"]+)"|([^:]+)):\s*$/,
    );
    if (packageMatch) {
      currentPackage = packageMatch[1] ?? packageMatch[2] ?? packageMatch[3];
      continue;
    }

    if (currentPackage === packageName) {
      const versionMatch = line.match(/^ {6}version:\s*(\S+)\s*$/);
      if (versionMatch) return versionMatch[1].replace(/^['"]|['"]$/g, "");
    }
  }

  throw new Error(
    `Could not find the resolved default catalog version for ${packageName} in pnpm-lock.yaml.`,
  );
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed in ${cwd}.`);
  }
}

function typecheck(directory) {
  run(
    "pnpm",
    [
      "exec",
      "tsc",
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "consumer.ts",
    ],
    directory,
  );
}

/**
 * Find every resolved version of a package anywhere in a `pnpm list --json`
 * dependency tree.
 */
function collectVersions(node, packageName, found = new Set()) {
  for (const [name, entry] of Object.entries(node?.dependencies ?? {})) {
    if (name === packageName && entry.version) found.add(entry.version);
    collectVersions(entry, packageName, found);
  }
  return found;
}

/** Fail unless each pinned package resolved to exactly its locked version. */
function assertPinnedVersions(directory, pinned) {
  const result = spawnSync("pnpm", ["list", "--json", "--depth", "Infinity"], {
    cwd: directory,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm list failed in ${directory}: ${result.stderr}`);
  }

  const [tree] = JSON.parse(result.stdout);
  for (const [packageName, version] of Object.entries(pinned)) {
    const resolved = [...collectVersions(tree, packageName)];
    if (resolved.length !== 1 || resolved[0] !== version) {
      throw new Error(
        `Expected ${packageName}@${version} in the consumer, resolved: ${resolved.join(", ") || "none"}.`,
      );
    }
  }
}

async function createConsumer(name, dependencies, files, pinned) {
  const directory = await mkdtemp(join(tmpdir(), `universal-slots-${name}-`));
  directories.push(directory);

  const packageJson = {
    name: `universal-slots-${name}-consumer`,
    private: true,
    type: "module",
    dependencies: {
      "universal-slots": `file:${tarball}`,
      ...dependencies,
    },
  };

  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
  // The packed manifest keeps semver ranges for type-fest and remeda. Pin them
  // to the lockfile versions so the consumer cannot pick another cached match.
  // pnpm reads overrides from pnpm-workspace.yaml, not package.json.
  await writeFile(
    join(directory, "pnpm-workspace.yaml"),
    `overrides:\n${Object.entries(pinned)
      .map(([packageName, version]) => `  "${packageName}": ${version}`)
      .join("\n")}\n`,
  );
  for (const [fileName, contents] of Object.entries(files)) {
    await writeFile(join(directory, fileName), contents);
  }

  // Prefer the local store and metadata cache, but fall back to the registry:
  // a cold cache (a fresh CI runner or a tag-triggered release run) has no
  // cached metadata, and a strict --offline install fails with
  // ERR_PNPM_NO_OFFLINE_META. Direct and shared dependencies are pinned above.
  run(
    "pnpm",
    [
      "install",
      "--prefer-offline",
      "--ignore-scripts",
      "--config.auto-install-peers=false",
    ],
    directory,
  );
  assertPinnedVersions(directory, pinned);
  return directory;
}

try {
  // The versions come from the resolved default catalog in the root lockfile,
  // keeping consumer verification on the exact versions used by this repo.
  const typescript = readLockedCatalogVersion("typescript");
  const pinned = {
    "type-fest": readLockedCatalogVersion("type-fest"),
    remeda: readLockedCatalogVersion("remeda"),
  };
  const coreDir = await createConsumer(
    "core",
    { typescript },
    {
      "runtime.mjs": `
        import { mergeCompositionProps } from "universal-slots/core";

        let reactAvailable = false;
        try {
          import.meta.resolve("react");
          reactAvailable = true;
        } catch {
          // React is intentionally absent from this consumer.
        }
        if (reactAvailable) {
          throw new Error("React was unexpectedly installed in the Core-only consumer.");
        }

        const calls = [];
        const result = mergeCompositionProps(
          {
            className: " source ",
            style: { color: "blue", padding: 4 },
            title: "source",
            onClick: () => calls.push("source"),
          },
          {
            className: "target",
            style: { color: "red", margin: 2 },
            title: "target",
            onClick: () => calls.push("target"),
          },
          { isEventHandler: (key) => key === "onClick" },
        );

        result.onClick();
        if (result.className !== "source target" || result.title !== "target") {
          throw new Error("Core class or ordinary-prop merge check failed.");
        }
        if (
          JSON.stringify(result.style) !==
          JSON.stringify({ color: "red", padding: 4, margin: 2 })
        ) {
          throw new Error("Core style merge check failed.");
        }
        if (calls.join(",") !== "target,source") {
          throw new Error("Core event-handler merge check failed.");
        }
      `,
      "consumer.ts": `
        import { mergeCompositionProps } from "universal-slots/core";
        import type { MergeCompositionProps } from "universal-slots/core";

        type Equal<Left, Right> =
          (<Value>() => Value extends Left ? 1 : 2) extends
          (<Value>() => Value extends Right ? 1 : 2) ? true : false;
        type Expect<Value extends true> = Value;

        type Props = MergeCompositionProps<
          { className: string; style: { color: string; padding: number } },
          { className?: string; style?: { color: "red"; margin: number } }
        >;
        type ExpectedStyle =
          | { color: string; padding: number }
          | { color: "red"; padding: number; margin: number };
        type ClassNameIsExact = Expect<
          Equal<Props["className"], string | undefined>
        >;
        type StyleIsExact = Expect<Equal<Props["style"], ExpectedStyle>>;

        type OrdinaryConflict = MergeCompositionProps<
          { variant: "source" },
          { variant: "target" }
        >;
        const validConflict: OrdinaryConflict = { variant: "target" };
        // @ts-expect-error The target's ordinary conflicting value wins.
        const invalidConflict: OrdinaryConflict = { variant: "source" };

        type InvalidStyle = MergeCompositionProps<
          { style: number },
          { style?: { color: string } }
        >;
        // @ts-expect-error The default style policy rejects numeric values.
        const invalidStyle: InvalidStyle = { style: 1 };

        void mergeCompositionProps;
        void validConflict;
        void invalidConflict;
        void invalidStyle;
        type _Assertions = [ClassNameIsExact, StyleIsExact];
      `,
    },
    pinned,
  );
  run("node", ["runtime.mjs"], coreDir);
  typecheck(coreDir);

  // React consumer uses the exact React and type versions resolved by the repo.
  const reactDir = await createConsumer(
    "react",
    {
      react: readLockedCatalogVersion("react"),
      "react-dom": readLockedCatalogVersion("react-dom"),
      "@types/react": readLockedCatalogVersion("@types/react"),
      "@types/react-dom": readLockedCatalogVersion("@types/react-dom"),
      typescript,
    },
    {
      "runtime.mjs": `
        import React from "react";
        import { renderToStaticMarkup } from "react-dom/server";
        import { Slot } from "universal-slots/react";

        const calls = [];
        function Target({ className, style, onClick }) {
          // Invoke the composed handler while rendering so the call order lands
          // in the static markup; this is a deliberate render-time side effect.
          onClick({});
          return React.createElement(
            "button",
            {
              className,
              style,
              "data-handler-order": calls.join(","),
            },
            "consumer",
          );
        }

        const html = renderToStaticMarkup(
          React.createElement(
            Slot,
            {
              className: "source-class",
              style: { color: "blue", padding: 4 },
              onClick: () => calls.push("source"),
            },
            React.createElement(Target, {
              className: "target-class",
              style: { color: "red", margin: 2 },
              onClick: () => calls.push("target"),
            }),
          ),
        );

        if (!html.includes('class="source-class target-class"')) {
          throw new Error("React Slot class composition failed: " + html);
        }
        if (!html.includes('style="color:red;padding:4px;margin:2px"')) {
          throw new Error("React Slot style composition failed: " + html);
        }
        if (!html.includes('data-handler-order="target,source"')) {
          throw new Error("React Slot handler composition failed: " + html);
        }
      `,
      "consumer.ts": `
        import { mergeCompositionProps } from "universal-slots/core";
        import { Slot } from "universal-slots/react";
        import type { Ref } from "react";
        import type {
          ReactCompositionProps,
          ReactEventKey,
          ReactTargetRef,
          SlotProps,
        } from "universal-slots/react";

        type Equal<Left, Right> =
          (<Value>() => Value extends Left ? 1 : 2) extends
          (<Value>() => Value extends Right ? 1 : 2) ? true : false;
        type Expect<Value extends true> = Value;

        type Source = {
          className: string;
          onPress: (event: { x: number }) => void;
          onclick: (event: number) => void;
        };
        type Target = {
          className?: string;
          onPress: (event: { x: number }) => string;
          onclick: (event: string) => void;
        };
        type Props = ReactCompositionProps<Source, Target>;

        // Class values normalize, and only on + capital keys are events.
        type ClassNameIsExact = Expect<
          Equal<Props["className"], string | undefined>
        >;
        type EventContractsAreKept = Expect<
          Equal<Props["onPress"], Source["onPress"] & Target["onPress"]>
        >;
        type LowercaseIsOrdinary = Expect<
          Equal<Props["onclick"], Target["onclick"]>
        >;
        type EventKeyClassification = [
          Expect<"onClick" extends ReactEventKey ? true : false>,
          Expect<"onclick" extends ReactEventKey ? false : true>,
        ];
        type AnchorRefAcceptance = [
          Expect<Ref<HTMLAnchorElement> extends ReactTargetRef<"a"> ? true : false>,
          Expect<Ref<HTMLButtonElement> extends ReactTargetRef<"a"> ? false : true>,
        ];

        const props: SlotProps<"a"> = {
          href: "/docs",
          children: "Documentation",
        };
        const wrongRef: SlotProps<"a"> = {
          // @ts-expect-error An anchor target exposes an anchor ref, not a button ref.
          ref: null as unknown as Ref<HTMLButtonElement>,
        };

        void mergeCompositionProps;
        void Slot;
        void props;
        void wrongRef;
        type _Assertions = [
          ClassNameIsExact,
          EventContractsAreKept,
          LowercaseIsOrdinary,
          EventKeyClassification,
          AnchorRefAcceptance,
        ];
      `,
    },
    pinned,
  );
  run("node", ["runtime.mjs"], reactDir);
  typecheck(reactDir);

  console.log(
    "\nPacked package passed Core-only and React runtime/declaration checks.",
  );
} finally {
  await Promise.all(
    directories.map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
}
