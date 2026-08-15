import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const releaseTag = process.argv[2];

if (!releaseTag) throw new Error("Pass the GitHub release tag to verify-release-tag.mjs.");

const packageManifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const expectedTag = `v${packageManifest.version}`;
if (releaseTag !== expectedTag) {
  throw new Error(`Release tag ${releaseTag} does not match package version ${expectedTag}.`);
}

process.stdout.write(
  `Release tag ${releaseTag} matches @calmcraft/cli@${packageManifest.version}.\n`,
);
