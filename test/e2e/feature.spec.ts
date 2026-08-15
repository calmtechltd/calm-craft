import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { startViewCommand } from "../../src/cli/command";
import type { LocalSession } from "../../src/server";
import {
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../helpers/git-fixture";

let session: LocalSession;
let relationshipSession: LocalSession;
let relationshipRepository: string;

test.beforeAll(async () => {
  session = await startViewCommand(
    {
      command: "view",
      source: process.cwd(),
      diff: false,
      openBrowser: false,
    },
    {
      assetsRoot: new URL("../../dist/ui", import.meta.url).pathname,
      io: { stdout: () => undefined, stderr: () => undefined },
    },
  );

  relationshipRepository = await createGitFixture();
  const sourceRoot = resolve(import.meta.dirname, "../fixtures/spec-estate/specs");
  const fixturePaths = [
    "billing/invoices/invoice-delivery.md",
    "billing/invoices/invoice-delivery.flow.yaml",
    "billing/invoices/invoice-delivery.flow.mmd",
    "support/cases/case-routing.md",
  ];
  await Promise.all(
    fixturePaths.map(async (path) =>
      writeFixtureFile(
        relationshipRepository,
        `specs/${path}`,
        await readFile(resolve(sourceRoot, path), "utf8"),
      ),
    ),
  );
  await fixtureGit(relationshipRepository, ["add", "specs"]);
  await fixtureGit(relationshipRepository, ["commit", "-m", "Add relationship fixture"]);
  relationshipSession = await startViewCommand(
    {
      command: "view",
      source: relationshipRepository,
      diff: false,
      openBrowser: false,
    },
    {
      assetsRoot: new URL("../../dist/ui", import.meta.url).pathname,
      io: { stdout: () => undefined, stderr: () => undefined },
    },
  );
});

test.afterAll(async () => {
  await session?.close();
  await relationshipSession?.close();
  if (relationshipRepository) await removeGitFixture(relationshipRepository);
});

test("feature contract, flow, source, reload, and history remain connected", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(session.url);
  await page.getByRole("button", { name: /Repository Sources/u }).click();
  await expect(
    page.getByRole("heading", { name: "Repository Sources", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Open the current checkout" })).toBeVisible();
  await page.getByRole("link", { name: /B1 Open the current checkout/u }).click();
  await expect(page).toHaveURL(/\/behaviour\/B1$/u);
  await page.reload();
  await expect(page.getByRole("link", { name: /B1 Open the current checkout/u })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.getByRole("button", { name: /Flows 1/u }).click();
  await expect(page.getByRole("link", { name: /F1 · Repository Session/u })).toBeVisible();
  await page
    .getByRole("link", { name: /F1.T12 Base Unavailable Resolve Comparison Base/u })
    .click();
  await expect(page.getByRole("region", { name: "F1.T12 details" })).toContainText(
    "different base reference",
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/behaviour\/B1$/u);

  await page.getByRole("button", { name: "Open flow contract" }).click();
  const source = page.getByRole("dialog", { name: "Source evidence" });
  await expect(source).toContainText("version: 1");
  await expect(source).toContainText("Repository Session");
  await page.getByRole("button", { name: "Close source evidence" }).click();

  await page.setViewportSize({ width: 680, height: 820 });
  await page.getByRole("button", { name: /Decisions 2/u }).click();
  await expect(page.getByRole("table", { name: /Source selection/u })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("relationships, backlinks, and malformed neighbours remain navigable", async ({ page }) => {
  await page.goto(relationshipSession.url);
  await page.getByRole("button", { name: /Invoice Delivery/u }).click();
  await page.getByRole("link", { name: /Case Routing Case routing/u }).click();
  await expect(page.getByRole("heading", { name: "Case Routing", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Feature findings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Route a complete case" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Keep healthy behaviour after the error" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Invoice Delivery Case routing/u })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Invoice Delivery", exact: true })).toBeVisible();
});
