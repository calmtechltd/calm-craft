import { expect, test } from "@playwright/test";

import { startViewCommand } from "../../src/cli/command";
import type { LocalSession } from "../../src/server";
import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../helpers/git-fixture";

let repositoryRoot: string;
let reviewSession: LocalSession;
let missingBaseSession: LocalSession;

test.beforeAll(async () => {
  repositoryRoot = await createGitFixture();
  await fixtureGit(repositoryRoot, ["switch", "-c", "feature/mixed-review"]);
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Committed Review", "Committed branch intent"),
  );
  await fixtureGit(repositoryRoot, ["add", "specs/core/original.md"]);
  await fixtureGit(repositoryRoot, ["commit", "-m", "Change committed product intent"]);

  await writeFixtureFile(
    repositoryRoot,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Staged Review", "Committed branch intent"),
  );
  await fixtureGit(repositoryRoot, ["add", "specs/core/original.md"]);
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Staged Review", "Unstaged product intent"),
  );
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/untracked.md",
    canonicalSpec("fixture-untracked", "Untracked Feature", "Untracked product intent"),
  );

  const options = {
    command: "view" as const,
    source: repositoryRoot,
    diff: true,
    openBrowser: false,
  };
  const dependencies = {
    assetsRoot: new URL("../../dist/ui", import.meta.url).pathname,
    io: { stdout: () => undefined, stderr: () => undefined },
  };
  reviewSession = await startViewCommand(
    {
      ...options,
      base: "main",
      provenance: ["committed", "staged", "unstaged", "untracked"],
    },
    dependencies,
  );
  missingBaseSession = await startViewCommand({ ...options, base: "does-not-exist" }, dependencies);
});

test.afterAll(async () => {
  await reviewSession?.close();
  await missingBaseSession?.close();
  if (repositoryRoot) await removeGitFixture(repositoryRoot);
});

test("packaged Branch Review isolates provenance, groups intent, and opens affected features", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(reviewSession.url);
  await expect(page.getByRole("heading", { name: "Branch Review" })).toBeVisible();
  const identity = page.getByRole("region", { name: "Comparison identity" });
  await expect(identity).toContainText("feature/mixed-review");
  await expect(identity).toContainText("main");
  await expect(identity).toContainText("Merge-base");
  await expect(identity).toContainText("Current filesystem");

  const committed = page.getByRole("button", { name: /Committed \d+ changes/u });
  const staged = page.getByRole("button", { name: /Staged \d+ changes/u });
  const unstaged = page.getByRole("button", { name: /Unstaged \d+ changes/u });
  const untracked = page.getByRole("button", { name: /Untracked \d+ changes/u });
  await expect(committed).toHaveAttribute("aria-pressed", "true");
  await expect(staged).toHaveAttribute("aria-pressed", "true");
  await expect(unstaged).toHaveAttribute("aria-pressed", "true");
  await expect(untracked).toHaveAttribute("aria-pressed", "true");

  await committed.click();
  await unstaged.click();
  await untracked.click();
  await page.getByRole("button", { name: "Provenance" }).click();
  await expect(page.getByRole("heading", { name: "Staged changes" })).toBeVisible();
  await expect(page.getByText(/of \d+ semantic changes shown/u)).toBeVisible();

  await committed.click();
  await unstaged.click();
  await untracked.click();
  await page.getByRole("button", { name: "Type" }).click();
  await expect(page.getByRole("heading", { name: "Behaviours" })).toBeVisible();
  await page
    .getByRole("link", { name: /Staged Review/u })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Staged Review", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 680, height: 820 });
  await page.getByRole("link", { name: "Branch Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Branch Review" })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("missing base explains the repair command while Atlas remains usable", async ({ page }) => {
  await page.goto(missingBaseSession.url);
  await expect(
    page.getByRole("heading", { name: "Choose a comparison base to review this branch." }),
  ).toBeVisible();
  await expect(page.getByText("calmcraft view --diff --base <ref>")).toBeVisible();
  await expect(page.getByText("does-not-exist", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Atlas" }).click();
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Staged Review/u })).toBeVisible();
});
