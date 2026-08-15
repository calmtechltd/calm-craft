import { execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const requestedVersion = process.env.CALMCRAFT_SMOKE_VERSION;
if (
  requestedVersion &&
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(requestedVersion)
) {
  throw new Error(`Invalid CALMCRAFT_SMOKE_VERSION: ${requestedVersion}`);
}
const packageSpecifier = requestedVersion ? `@calmcraft/cli@${requestedVersion}` : process.argv[2];
const expectProvenance = process.argv.includes("--expect-provenance");

if (!packageSpecifier) {
  throw new Error("Pass a registry package version or tarball to installed-package-smoke.mjs.");
}

const root = await mkdtemp(join(tmpdir(), "calmcraft-installed-smoke-"));
const children = new Set();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run(command, arguments_, options = {}) {
  return execFileAsync(command, arguments_, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...options.env, LC_ALL: "C" },
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120_000,
    windowsHide: true,
  });
}

function canonicalSpec(id, title, intent) {
  return `---
id: ${id}
area: Release smoke
status: implemented
---

# ${title}

${intent}

## Behaviours

### B1 — Show the release fixture 🟢 implemented

${intent}

## Rules (Invariants)

- The public package reads the fixture without changing it.

## Decision Tables

_None._

## User Flows

_None._

## Open Questions

_None._

## Future Considerations

_None._

## Out of Scope

_None._
`;
}

async function git(cwd, ...arguments_) {
  return run("git", ["-C", cwd, ...arguments_]);
}

async function writeSpec(repository, intent) {
  const directory = join(repository, "specs", "core");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "release-smoke.md"),
    canonicalSpec("release-smoke", "Installed package", intent),
    "utf8",
  );
}

async function createRepository() {
  const repository = join(root, "repository");
  await mkdir(repository);
  await git(repository, "init", "--initial-branch=main");
  await git(repository, "config", "user.name", "CalmCraft release smoke");
  await git(repository, "config", "user.email", "release-smoke@calmcraft.test");
  await writeSpec(repository, "The installed package opens a local repository.");
  await git(repository, "add", "specs");
  await git(repository, "commit", "-m", "Add release smoke baseline");
  await git(repository, "switch", "-c", "feature/release-smoke");
  await writeSpec(repository, "The installed package reviews a feature branch.");
  await git(repository, "add", "specs");
  await git(repository, "commit", "-m", "Change release smoke intent");
  return repository;
}

function waitForSession(child, outputState) {
  return new Promise((resolvePromise, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for CalmCraft.\nstdout:\n${outputState.stdout}\nstderr:\n${outputState.stderr}`,
        ),
      );
    }, 30_000);
    const inspect = () => {
      const match = /http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/u.exec(outputState.stdout);
      if (!match || settled) return;
      settled = true;
      clearTimeout(timeout);
      resolvePromise(match[0]);
    };
    child.stdout.on("data", (chunk) => {
      outputState.stdout += chunk.toString("utf8");
      inspect();
    });
    child.stderr.on("data", (chunk) => {
      outputState.stderr += chunk.toString("utf8");
    });
    child.once("exit", (code) => {
      if (settled) return;
      clearTimeout(timeout);
      reject(
        new Error(
          `CalmCraft exited ${code} before starting.\nstdout:\n${outputState.stdout}\nstderr:\n${outputState.stderr}`,
        ),
      );
    });
  });
}

async function startCalmCraft(binary, arguments_, environment = {}) {
  const child = spawn(binary, arguments_, {
    env: { ...process.env, ...environment },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  children.add(child);
  const output = { stdout: "", stderr: "" };
  const url = await waitForSession(child, output);
  const sessionUrl = new URL(url);
  const token = sessionUrl.searchParams.get("token");
  const [documentResponse, sessionResponse] = await Promise.all([
    fetch(url),
    fetch(`${sessionUrl.origin}/api/session?token=${token}`),
  ]);
  assert(
    documentResponse.ok,
    `The installed browser document returned ${documentResponse.status}.`,
  );
  assert(sessionResponse.ok, `The installed session API returned ${sessionResponse.status}.`);
  assert((await documentResponse.text()).includes("<title>CalmCraft Atlas</title>"), "Wrong UI.");
  return { child, output, payload: await sessionResponse.json() };
}

async function stopCalmCraft(active) {
  const exited = once(active.child, "exit");
  active.child.kill(process.platform === "win32" ? undefined : "SIGINT");
  const [code] = await Promise.race([
    exited,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("CalmCraft did not stop within 15 seconds.")), 15_000),
    ),
  ]);
  children.delete(active.child);
  if (process.platform !== "win32") assert(code === 0, `CalmCraft stopped with exit code ${code}.`);
}

async function verifyProvenance() {
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "signatures"], {
    cwd: join(root, "consumer"),
  });
  const result = await run(process.platform === "win32" ? "npm.cmd" : "npm", [
    "view",
    packageSpecifier,
    "dist.attestations",
    "--json",
  ]);
  const attestations = JSON.parse(result.stdout);
  assert(
    attestations?.provenance?.predicateType === "https://slsa.dev/provenance/v1",
    "The registry package has no SLSA provenance attestation.",
  );
  assert(
    typeof attestations.url === "string" &&
      attestations.url.startsWith("https://registry.npmjs.org/-/npm/v1/attestations/"),
    "The package attestation URL is not owned by the npm registry.",
  );
}

async function removeWindowsRemoteClone(path) {
  if (process.platform !== "win32") return;
  const expectedParent = resolve(tmpdir());
  const resolved = resolve(path);
  assert(dirname(resolved) === expectedParent, `Refusing to remove unexpected path: ${resolved}`);
  assert(basename(resolved).startsWith("calmcraft-remote-"), `Unexpected clone path: ${resolved}`);
  try {
    await access(resolved);
    await rm(resolved, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

try {
  const consumer = join(root, "consumer");
  await mkdir(consumer);
  await writeFile(join(consumer, "package.json"), '{"name":"calmcraft-smoke","private":true}\n');
  await run(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "--ignore-scripts", "--save-exact", packageSpecifier],
    { cwd: consumer },
  );
  const installedManifest = JSON.parse(
    await readFile(join(consumer, "node_modules", "@calmcraft", "cli", "package.json"), "utf8"),
  );
  for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"]) {
    assert(!installedManifest.scripts?.[lifecycle], `Installed package has ${lifecycle}.`);
  }
  if (expectProvenance) await verifyProvenance();

  const binary = join(
    consumer,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "calmcraft.cmd" : "calmcraft",
  );
  const repository = await createRepository();
  const local = await startCalmCraft(binary, [
    "view",
    repository,
    "--diff",
    "--base",
    "main",
    "--no-open",
  ]);
  assert(local.payload.data?.mode === "review", "Local smoke did not open Branch Review.");
  assert(local.payload.data.review?.available === true, "Local comparison is unavailable.");
  assert(local.payload.data.review.semanticChanges.length > 0, "Local comparison has no changes.");
  await stopCalmCraft(local);

  const remoteRoot = join(root, "remote");
  await mkdir(remoteRoot);
  await git(remoteRoot, "clone", "--bare", repository, "repository.git");
  const remotePrefix = "https://person:release-secret@fixture.invalid/";
  const filePrefix = pathToFileURL(`${remoteRoot}${sep}`).href;
  const remote = await startCalmCraft(
    binary,
    [
      "view",
      `${remotePrefix}repository.git`,
      "--branch",
      "feature/release-smoke",
      "--diff",
      "--base",
      "main",
      "--no-open",
    ],
    {
      GIT_ALLOW_PROTOCOL: "file",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.${filePrefix}.insteadOf`,
      GIT_CONFIG_VALUE_0: remotePrefix,
    },
  );
  assert(remote.payload.data?.mode === "review", "Remote smoke did not open Branch Review.");
  assert(remote.payload.data.repositorySource?.kind === "remote", "Remote identity is missing.");
  assert(remote.payload.data.review?.available === true, "Remote comparison is unavailable.");
  assert(
    remote.payload.data.review.semanticChanges.length > 0,
    "Remote comparison has no changes.",
  );
  assert(!remote.output.stdout.includes("release-secret"), "Remote credentials reached stdout.");
  assert(!remote.output.stderr.includes("release-secret"), "Remote credentials reached stderr.");
  const temporaryClone = dirname(remote.payload.data.review.repository.root);
  await stopCalmCraft(remote);
  if (process.platform === "win32") await removeWindowsRemoteClone(temporaryClone);
  else {
    try {
      await access(temporaryClone);
      throw new Error(`Remote temporary clone remains after shutdown: ${temporaryClone}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  process.stdout.write(
    `Installed ${installedManifest.name}@${installedManifest.version}; local and remote branch-review smoke checks passed${expectProvenance ? " with provenance" : ""}.\n`,
  );
} finally {
  await Promise.all(
    [...children].map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = once(child, "exit");
      child.kill();
      await Promise.race([
        exited,
        new Promise((resolvePromise) => setTimeout(resolvePromise, 5_000)),
      ]);
    }),
  );
  await rm(root, { recursive: true, force: true });
}
