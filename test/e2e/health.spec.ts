import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { startViewCommand } from "../../src/cli/command";
import type { LocalSession } from "../../src/server";
import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../helpers/git-fixture";

const MALFORMED = `# Recoverable Contract

Healthy sections remain readable around this error.

## Behaviours

### B1 - Missing status

The malformed heading becomes a precise finding.

## Rules (Invariants)

- Healthy intent remains visible.

## Decision Tables

_None._

## User Flows

_None._

## Open Questions

- **Blocks B1:** Which heading is canonical?

## Future Considerations

_None._

## Out of Scope

_None._
`;

let repositoryRoot: string;
let session: LocalSession;

async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}

test.beforeAll(async () => {
  repositoryRoot = await createGitFixture();
  await writeFixtureFile(repositoryRoot, "specs/core/legacy.md", MALFORMED);
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/healthy.md",
    canonicalSpec("fixture-healthy", "Healthy Feature", "Healthy intent remains navigable."),
  );
  await fixtureGit(repositoryRoot, ["add", "specs"]);
  await fixtureGit(repositoryRoot, ["commit", "-m", "Add health baseline"]);
  await fixtureGit(repositoryRoot, ["switch", "-c", "feature/health-review"]);
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/legacy.md",
    canonicalSpec("fixture-legacy", "Recovered Contract", "The old parser issue is resolved."),
  );
  await writeFixtureFile(repositoryRoot, "specs/core/recoverable.md", MALFORMED);
  await fixtureGit(repositoryRoot, ["add", "specs"]);
  await fixtureGit(repositoryRoot, ["commit", "-m", "Change contract health"]);
  session = await startViewCommand(
    {
      command: "view",
      source: repositoryRoot,
      diff: true,
      base: "main",
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
  if (repositoryRoot) await removeGitFixture(repositoryRoot);
});

test("packaged Health keeps malformed and healthy contracts connected", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(session.url);
  await expectAccessible(page);
  await page.getByRole("link", { name: "Health" }).click();
  await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
  await expect(page.getByText(/spec has no YAML frontmatter/u).first()).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Use light theme" }).click();

  const stateFilter = page.getByRole("combobox", { name: "Filter findings by review state" });
  await stateFilter.selectOption("introduced");
  await expect(page.locator(".health-row").first()).toContainText("Introduced here");
  await page
    .getByRole("link", { name: /spec has no YAML frontmatter/u })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "The spec has no YAML frontmatter." }),
  ).toBeFocused();
  await expect(page.getByLabel("Finding detail")).toContainText("Add YAML frontmatter");
  await expect(page).toHaveURL(/health\/finding\/.*state=introduced/u);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "The spec has no YAML frontmatter." }),
  ).toBeFocused();

  await page.getByRole("link", { name: "Open feature context" }).click();
  await expect(page.getByRole("heading", { name: "Recoverable Contract" })).toBeVisible();
  await expect(page.locator(".feature-finding-detail")).toBeFocused();
  await expect(page.locator(".feature-finding-detail")).toContainText("line 1");
  await page.getByRole("button", { name: "Open finding source" }).click();
  await expect(page.getByRole("dialog", { name: "Source evidence" })).toContainText(
    "# Recoverable Contract",
  );
  await page.getByRole("button", { name: "Close source evidence" }).click();
  await expect(page.getByRole("button", { name: "Open finding source" })).toBeFocused();
  await expectAccessible(page);

  await page.keyboard.press("Meta+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Search commands" })).toBeFocused();
  await expectAccessible(page);
  await page.getByRole("combobox", { name: "Search commands" }).fill("Healthy Feature");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Healthy Feature" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("button", { name: "Open command palette" }).click();
  await page.getByRole("combobox", { name: "Search commands" }).fill("Has findings");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Has findings" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Has findings" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expectAccessible(page);

  await page.getByRole("button", { name: "Open command palette" }).click();
  await page.getByRole("combobox", { name: "Search commands" }).fill("Open Health");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
  await stateFilter.selectOption("resolved");
  await expect(page.locator(".health-row").first()).toContainText("Resolved here");

  await page.emulateMedia({ reducedMotion: "reduce" });
  const transitionDuration = await page
    .locator(".health-row")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transitionDuration)).toBeLessThan(0.001);

  await page.setViewportSize({ width: 680, height: 820 });
  await expect(page.getByRole("navigation", { name: "Primary views" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Health" })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});
