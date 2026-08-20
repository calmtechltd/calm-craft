import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const temporaryRoot = await mkdtemp(join(tmpdir(), "calmcraft-release-package-"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedPath(path) {
  const exact = new Set([
    "package/.claude-plugin/plugin.json",
    "package/CHANGELOG.md",
    "package/LICENSE",
    "package/README.md",
    "package/SECURITY.md",
    "package/SUPPORT.md",
    "package/dist/cli/index.js",
    "package/dist/cli/index.js.map",
    "package/dist/ui/index.html",
    "package/package.json",
    "package/plugin.json",
    "package/references/conventions-question-bank.md",
    "package/references/spec-format.md",
  ]);
  return (
    exact.has(path) ||
    /^package\/dist\/ui\/assets\/index-[A-Za-z0-9_-]+\.(?:css|js)$/u.test(path) ||
    /^package\/dist\/ui\/assets\/geist(?:-mono)?-[A-Za-z0-9_-]+\.woff2$/u.test(path) ||
    /^package\/skills\/[a-z0-9-]+\/SKILL\.md$/u.test(path) ||
    /^package\/skills\/[a-z0-9-]+\/[A-Za-z0-9._-]+\.md$/u.test(path) ||
    /^package\/skills\/[a-z0-9-]+\/scripts\/[A-Za-z0-9._-]+\.py$/u.test(path)
  );
}

try {
  const packResult = await execFileAsync(
    "pnpm",
    ["pack", "--json", "--pack-destination", temporaryRoot],
    { cwd: root, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 },
  );
  const metadata = JSON.parse(packResult.stdout);
  const tarball = isAbsolute(metadata.filename)
    ? metadata.filename
    : join(temporaryRoot, metadata.filename);
  const listResult = await execFileAsync("tar", ["-tf", tarball], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  const paths = listResult.stdout.trim().split(/\r?\n/u).filter(Boolean).toSorted();
  const unexpected = paths.filter((path) => !expectedPath(path));
  assert(unexpected.length === 0, `Unexpected package paths:\n${unexpected.join("\n")}`);
  assert(paths.includes("package/dist/cli/index.js"), "The package has no CLI bundle.");
  assert(paths.includes("package/dist/ui/index.html"), "The package has no browser entry point.");
  assert(
    paths.filter((path) => /package\/dist\/ui\/assets\/geist.+\.woff2$/u.test(path)).length === 2,
    "The package must bundle both Geist faces so it renders without a network.",
  );
  assert(
    paths.filter((path) => /package\/dist\/ui\/assets\/index-.+\.js$/u.test(path)).length === 1,
    "The package must contain exactly one current browser JavaScript asset.",
  );
  assert(
    paths.filter((path) => /package\/dist\/ui\/assets\/index-.+\.css$/u.test(path)).length === 1,
    "The package must contain exactly one current browser stylesheet.",
  );

  const extractionRoot = join(temporaryRoot, "extracted");
  await chmod(temporaryRoot, 0o700);
  await mkdir(extractionRoot);
  await execFileAsync("tar", ["-xf", tarball, "-C", extractionRoot]);
  const cliPath = join(extractionRoot, "package", "dist", "cli", "index.js");
  const cli = await readFile(cliPath, "utf8");
  const cliMode = (await stat(cliPath)).mode & 0o777;
  assert(cli.startsWith("#!/usr/bin/env node\n"), "The packaged CLI has no Node.js shebang.");
  assert((cliMode & 0o111) !== 0, `The packaged CLI is not executable (${cliMode.toString(8)}).`);

  const packagedManifest = JSON.parse(
    await readFile(join(extractionRoot, "package", "package.json"), "utf8"),
  );
  for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"]) {
    assert(!packagedManifest.scripts?.[lifecycle], `Forbidden lifecycle script: ${lifecycle}.`);
  }
  assert(packagedManifest.bin?.calmcraft === "dist/cli/index.js", "Unexpected CLI executable.");
  assert(packagedManifest.license === "MIT", "The packaged license is not MIT.");
  assert(packagedManifest.publishConfig?.provenance === true, "npm provenance is disabled.");

  const skills = paths.filter((path) => path.endsWith("/SKILL.md"));
  const assets = (await readdir(join(extractionRoot, "package", "dist", "ui", "assets"))).length;
  process.stdout.write(
    `Verified ${metadata.name}@${metadata.version}: ${paths.length} files, ${skills.length} skills, ${assets} browser assets, executable mode ${cliMode.toString(8)}.\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
