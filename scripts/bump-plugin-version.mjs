import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifests = [
  "package.json",
  "plugin.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
];
const paths = [...manifests, "src/meta.ts", "CHANGELOG.md"];
const sources = new Map(
  await Promise.all(paths.map(async (path) => [path, await readFile(resolve(root, path), "utf8")])),
);
const previous = JSON.parse(sources.get("package.json")).version;
assert(/^\d+\.\d+\.\d+$/u.test(previous), "Automatic patches require a stable semantic version.");
for (const path of manifests)
  assert.equal(JSON.parse(sources.get(path)).version, previous, `Version mismatch in ${path}.`);
assert(
  sources.get("src/meta.ts").includes(`CALMCRAFT_VERSION = "${previous}"`),
  "CLI version differs from package version.",
);
const parts = previous.split(".").map(Number);
assert(parts.every(Number.isSafeInteger), "Version components must be safe integers.");
assert(Number.isSafeInteger(parts[2] + 1), "Patch version overflow.");
const next = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
for (const path of manifests)
  sources.set(
    path,
    sources.get(path).replace(/("version"\s*:\s*")[^"]+("\s*[,}])/u, `$1${next}$2`),
  );
sources.set(
  "src/meta.ts",
  sources
    .get("src/meta.ts")
    .replace(`CALMCRAFT_VERSION = "${previous}"`, `CALMCRAFT_VERSION = "${next}"`),
);
const changelog = sources.get("CHANGELOG.md");
const heading = changelog.indexOf("\n## ");
assert(heading >= 0, "Changelog has no release heading.");
assert(!changelog.includes(`\n## ${next} `), "Next patch is already present in the changelog.");
const date = new Date().toISOString().slice(0, 10);
sources.set(
  "CHANGELOG.md",
  `${changelog.slice(0, heading)}\n## ${next} — ${date}\n\n- Publish the latest validated plugin changes under a new patch version.\n${changelog.slice(heading)}`,
);
// Validate every source before writing; lockfiles and generated output are untouched.
await Promise.all([...sources].map(([path, source]) => writeFile(resolve(root, path), source)));
process.stdout.write(`${next}\n`);
