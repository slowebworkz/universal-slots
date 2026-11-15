import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const changelog = await readFile(
  new URL("../CHANGELOG.md", import.meta.url),
  "utf8",
);

function fail(message) {
  console.error(`Release validation failed: ${message}`);
  process.exit(1);
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const tag = readArgument("--tag");
if (!tag) {
  fail("pass the release tag with --tag (for example, --tag v0.1.0).");
}
if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag)) {
  fail(`tag ${tag} is not a stable SemVer tag in vMAJOR.MINOR.PATCH form.`);
}
if (manifest.name !== "universal-slots") {
  fail(
    `expected the root package name to be universal-slots; got ${manifest.name}.`,
  );
}
if (tag !== `v${manifest.version}`) {
  fail(`tag ${tag} does not match package.json version ${manifest.version}.`);
}

const heading = new RegExp(
  `^## \\[${manifest.version.replaceAll(".", "\\.")}\\] - (\\d{4}-\\d{2}-\\d{2})$`,
  "m",
);
const match = heading.exec(changelog);
if (!match) {
  fail(
    `CHANGELOG.md needs a release heading "## [${manifest.version}] - YYYY-MM-DD".`,
  );
}

const releaseDate = match[1];
if (
  Number.isNaN(Date.parse(`${releaseDate}T00:00:00Z`)) ||
  new Date(`${releaseDate}T00:00:00Z`).toISOString().slice(0, 10) !==
    releaseDate
) {
  fail(`the ${manifest.version} changelog release date is invalid.`);
}

const releaseStart = match.index + match[0].length;
const nextHeading = /^## \[/gm;
nextHeading.lastIndex = releaseStart;
const nextMatch = nextHeading.exec(changelog);
const releaseNotes = changelog
  .slice(releaseStart, nextMatch?.index ?? changelog.length)
  .trim();
if (
  !releaseNotes ||
  !/^### (Added|Changed|Deprecated|Removed|Fixed|Security)$/m.test(
    releaseNotes,
  ) ||
  !/^[-*] .+/m.test(releaseNotes)
) {
  fail(
    `the ${manifest.version} changelog entry needs a category and at least one change bullet.`,
  );
}

process.stdout.write(`${releaseNotes}\n`);
