import { expect, test } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runCli } from "../../src/cli/command";
import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../helpers/git-fixture";

const assetsRoot = fileURLToPath(new URL("../../dist/ui", import.meta.url));

let repositoryRoot: string;
let estateFile: string;
let reviewFile: string;
let missingBaseFile: string;

test.beforeAll(async () => {
  repositoryRoot = await createGitFixture();
  await fixtureGit(repositoryRoot, ["switch", "-c", "feature/generated-review"]);
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Reviewed Feature", "Generated review source"),
  );
  await fixtureGit(repositoryRoot, ["add", "specs/core/original.md"]);
  await fixtureGit(repositoryRoot, ["commit", "-m", "Change the reviewed feature"]);

  estateFile = `${repositoryRoot}/estate.html`;
  reviewFile = `${repositoryRoot}/review.html`;
  missingBaseFile = `${repositoryRoot}/missing-base.html`;
  const io = { stdout: () => undefined, stderr: () => undefined };
  const code = await Promise.all([
    runCli(["generate", repositoryRoot, "--out", estateFile, "--no-open"], {
      assetsRoot,
      io,
    }),
    runCli(
      [
        "generate",
        repositoryRoot,
        "--diff",
        "--base",
        "main",
        "--provenance",
        "committed",
        "--out",
        reviewFile,
        "--no-open",
      ],
      { assetsRoot, io },
    ),
    runCli(
      [
        "generate",
        repositoryRoot,
        "--diff",
        "--base",
        "missing/base",
        "--out",
        missingBaseFile,
        "--no-open",
      ],
      { assetsRoot, io },
    ),
  ]);
  expect(code).toEqual([0, 0, 0]);
});

test.afterAll(async () => {
  if (repositoryRoot) await removeGitFixture(repositoryRoot);
});

function fileUrl(path: string): string {
  return pathToFileURL(path).href;
}

async function openGenerated(
  page: import("@playwright/test").Page,
  path: string,
): Promise<string[]> {
  const network: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("file:")) network.push(request.url());
  });
  await page.goto(fileUrl(path));
  return network;
}

test("generated estate opens from disk with no server and no Branch Review", async ({ page }) => {
  const network = await openGenerated(page, estateFile);
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Reviewed Feature/u })).toBeVisible();
  await page.getByRole("link", { name: "Branch Review" }).click();
  await expect(
    page.getByRole("heading", { name: "Generate this file with a branch comparison." }),
  ).toBeVisible();
  await expect(page.getByText("calmcraft generate --diff")).toBeVisible();
  expect(network).toEqual([]);
});

test("generated review bakes the comparison and source evidence into the file", async ({
  page,
}) => {
  const network = await openGenerated(page, reviewFile);
  await expect(page.getByRole("heading", { name: "Branch Review" })).toBeVisible();
  const identity = page.getByRole("region", { name: "Comparison identity" });
  await expect(identity).toContainText("feature/generated-review");
  await expect(identity).toContainText("main");
  await expect(page.getByText(/of \d+ semantic changes shown/u)).toBeVisible();

  await page
    .getByRole("link", { name: /Reviewed Feature/u })
    .first()
    .click();
  await expect(
    page.getByRole("region", { name: "Typed before and after comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Show source diff/u }).click();
  await expect(page.getByRole("region", { name: "Raw source diff" })).toBeVisible();
  await expect(page.locator('pre[aria-label="Before raw source"]')).toContainText("Original");
  await expect(page.locator('pre[aria-label="After raw source"]')).toContainText(
    "Reviewed Feature",
  );
  expect(network).toEqual([]);
});

test("generated missing-base review stays honest and keeps Atlas usable", async ({ page }) => {
  const network = await openGenerated(page, missingBaseFile);
  await expect(
    page.getByRole("heading", { name: "Choose a comparison base to review this branch." }),
  ).toBeVisible();
  await expect(page.getByText("calmcraft generate --diff --base <ref>")).toBeVisible();
  await expect(page.getByText("missing/base", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Atlas" }).click();
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Reviewed Feature/u })).toBeVisible();
  expect(network).toEqual([]);
});
