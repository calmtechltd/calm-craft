import { test, expect } from "@playwright/test";

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
let session: LocalSession;
let coldStartDuration = 0;

test.beforeAll(async () => {
  repositoryRoot = await createGitFixture();
  await Promise.all(
    Array.from({ length: 299 }, (_, offset) => {
      const index = offset + 1;
      const module = `module-${index % 6}`;
      const area = `area-${index % 12}`;
      const source = canonicalSpec(
        `fixture-feature-${index}`,
        `Fixture Feature ${index}`,
        `Generated public intent number ${index}.`,
      );
      return writeFixtureFile(
        repositoryRoot,
        `specs/${module}/${area}/feature-${index}.md`,
        source,
      );
    }),
  );
  await fixtureGit(repositoryRoot, ["add", "specs"]);
  await fixtureGit(repositoryRoot, ["commit", "-m", "Add generated Atlas estate"]);
  const coldStart = performance.now();
  session = await startViewCommand(
    {
      command: "view",
      source: repositoryRoot,
      diff: false,
      openBrowser: false,
    },
    {
      assetsRoot: new URL("../../dist/ui", import.meta.url).pathname,
      io: { stdout: () => undefined, stderr: () => undefined },
    },
  );
  coldStartDuration = performance.now() - coldStart;
});

test.afterAll(async () => {
  await session?.close();
  if (repositoryRoot) await removeGitFixture(repositoryRoot);
});

test("packed Atlas opens, filters, selects, themes, and adapts at 300 specs", async ({ page }) => {
  test.slow();
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const started = Date.now();
  await page.goto(session.url);
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  expect(coldStartDuration).toBeLessThan(4_000);
  expect(Date.now() - started).toBeLessThan(4_000);
  await expect(page.getByLabel("300 specifications")).toBeVisible();
  await expect(page.locator("[data-spec-id]")).toHaveCount(120);
  await expect(page).not.toHaveURL(/token=/u);

  const search = page.getByRole("searchbox", { name: "Search specifications" });
  await search.fill("Fixture Feature 299");
  const result = page.getByRole("button", { name: /Fixture Feature 299/u });
  await expect(result).toBeVisible();
  await result.focus();
  await result.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Fixture Feature 299", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Back to Atlas", exact: true }).click();
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.setViewportSize({ width: 680, height: 820 });
  await expect(page.getByRole("navigation", { name: "Primary views" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});
