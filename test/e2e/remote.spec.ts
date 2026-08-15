import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../helpers/git-fixture";

let processUnderTest: ChildProcessWithoutNullStreams | undefined;
let workingRepository: string | undefined;
let remoteRoot: string | undefined;
let sessionUrl = "";
let output = "";
let errors = "";
let temporaryDirectory = "";

function waitForSessionUrl(child: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let settled = false;
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for packaged CLI URL.\n${output}\n${errors}`)),
      15_000,
    );
    const inspect = (): void => {
      const match = /http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+/u.exec(output);
      if (!match) return;
      settled = true;
      clearTimeout(timeout);
      resolvePromise(match[0]);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
      inspect();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errors += chunk.toString("utf8");
    });
    child.once("exit", (code) => {
      if (!settled) {
        clearTimeout(timeout);
        reject(new Error(`Packaged CLI exited ${code}.\n${output}\n${errors}`));
      }
    });
  });
}

test.beforeAll(async () => {
  workingRepository = await createGitFixture();
  await fixtureGit(workingRepository, ["switch", "-c", "feature/private-package"]);
  await writeFixtureFile(
    workingRepository,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Private package", "Remote package intent"),
  );
  await fixtureGit(workingRepository, ["add", "specs/core/original.md"]);
  await fixtureGit(workingRepository, ["commit", "-m", "Change private package intent"]);
  await fixtureGit(workingRepository, ["switch", "main"]);
  remoteRoot = await mkdtemp(join(tmpdir(), "calmcraft-e2e-remote-"));
  await fixtureGit(remoteRoot, ["clone", "--bare", workingRepository, "repository.git"]);

  const source = "https://person:super-secret@fixture.invalid/repository.git";
  processUnderTest = spawn(
    process.execPath,
    [
      fileURLToPath(new URL("../../dist/cli/index.js", import.meta.url)),
      "view",
      source,
      "--branch",
      "feature/private-package",
      "--diff",
      "--base",
      "main",
      "--no-open",
    ],
    {
      env: {
        ...process.env,
        GIT_ALLOW_PROTOCOL: "file",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: `url.file://${remoteRoot}/.insteadOf`,
        GIT_CONFIG_VALUE_0: "https://person:super-secret@fixture.invalid/",
      },
      stdio: "pipe",
    },
  );
  sessionUrl = await waitForSessionUrl(processUnderTest);
  const url = new URL(sessionUrl);
  const token = url.searchParams.get("token");
  const response = await fetch(`${url.origin}/api/session?token=${token}`);
  const payload = (await response.json()) as {
    data: { review: { repository: { root: string } } };
  };
  temporaryDirectory = dirname(payload.data.review.repository.root);
});

test.afterAll(async () => {
  if (
    processUnderTest &&
    processUnderTest.exitCode === null &&
    processUnderTest.signalCode === null
  ) {
    const exited = once(processUnderTest, "exit");
    processUnderTest.kill("SIGINT");
    await exited;
  }
  if (workingRepository) await removeGitFixture(workingRepository);
  if (remoteRoot) await rm(remoteRoot, { recursive: true });
});

test("packed CLI opens and cleans up a private-style remote branch review", async ({ page }) => {
  await page.goto(sessionUrl);
  await expect(page.getByRole("heading", { name: "Branch Review" })).toBeVisible();
  await expect(page.getByText("Remote · temporary clone")).toHaveAttribute(
    "title",
    "https://[redacted]@fixture.invalid/repository.git",
  );
  await expect(page.getByText("Private remote · removed on stop")).toBeVisible();
  await expect(page.getByText("origin/main").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Private package/u })).toBeVisible();

  expect(output).not.toContain("super-secret");
  expect(errors).not.toContain("super-secret");
  const exited = processUnderTest ? once(processUnderTest, "exit") : Promise.resolve([undefined]);
  processUnderTest?.kill("SIGINT");
  const [exitCode] = await exited;
  expect(exitCode).toBe(0);
  await expect(access(temporaryDirectory)).rejects.toMatchObject({ code: "ENOENT" });
});
