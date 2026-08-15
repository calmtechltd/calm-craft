import { expect, test } from "@playwright/test";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

import { startViewCommand } from "../../src/cli/command";
import type { LocalSession } from "../../src/server";
import { parseFlowContract } from "../../src/specs/flow-contract";
import { renderFlowMermaid } from "../../src/specs/flow-mermaid";
import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../helpers/git-fixture";

let repositoryRoot: string;
let primaryRepositoryRoot: string;
let reviewSession: LocalSession;
let missingBaseSession: LocalSession;

function detailFlow(changed: boolean): string {
  return `version: 1
flows:
  - id: F1
    name: Detail Review
    start: ready
    states:
      - id: ready
        kind: screen
        label: ${changed ? "Ready for Review" : "Ready"}
      - id: done
        kind: terminal
        label: Done
        outcome: ${changed ? "The semantic review is complete." : "The review is complete."}
    transitions:
      - id: F1.T1
        from: ready
        event: ${changed ? "Approve" : "Continue"}
        to: done
        guard: ${changed ? "The evidence is valid." : "The evidence exists."}
        covers: [B1]
`;
}

function detailSpec(changed: boolean): string {
  const relationship = changed ? " [Original fixture](./original.md) remains connected." : "";
  return `---
id: fixture-detail
area: Fixture
status: ${changed ? "implemented" : "future"}
---

# Detail Review

The detail explains semantic evidence.${relationship}

## Behaviours

### B1 — ${changed ? "Review exact evidence 🟢 implemented" : "Inspect evidence 🔵 future"}

The reviewer ${changed ? "can explain each semantic change" : "sees the proposed change"}.

## Rules (Invariants)

- ${changed ? "Every claim retains exact source evidence." : "Evidence remains available."}

## Decision Tables

| Evidence | Result |
| -------- | ------ |
| ${changed ? "Exact" : "Present"} | ${changed ? "Explain" : "Review"} |

## User Flows

- **F1 — Detail Review:** [contract](./detail-review.flow.yaml) · [diagram](./detail-review.flow.mmd) — covers B1

## Open Questions

- ${changed ? "**Settled:** Exact source is required." : "**Blocks B1:** Which evidence is required?"}

## Future Considerations

_None._

## Out of Scope

_None._
`;
}

async function writeDetailFixture(root: string, changed: boolean): Promise<void> {
  const flow = detailFlow(changed);
  await writeFixtureFile(root, "specs/core/detail-review.md", detailSpec(changed));
  await writeFixtureFile(root, "specs/core/detail-review.flow.yaml", flow);
  await writeFixtureFile(
    root,
    "specs/core/detail-review.flow.mmd",
    renderFlowMermaid(parseFlowContract(flow), "detail-review.flow.yaml"),
  );
}

test.beforeAll(async () => {
  primaryRepositoryRoot = await createGitFixture();
  await writeDetailFixture(primaryRepositoryRoot, false);
  await writeFixtureFile(
    primaryRepositoryRoot,
    "specs/core/rename-old.md",
    canonicalSpec("fixture-rename-old", "Rename Evidence", "The same rename evidence remains"),
  );
  await fixtureGit(primaryRepositoryRoot, ["add", "specs"]);
  await fixtureGit(primaryRepositoryRoot, ["commit", "-m", "Add semantic detail fixtures"]);
  repositoryRoot = `${primaryRepositoryRoot}-linked`;
  await fixtureGit(primaryRepositoryRoot, [
    "worktree",
    "add",
    "-b",
    "feature/mixed-review",
    repositoryRoot,
  ]);
  await writeDetailFixture(repositoryRoot, true);
  await unlink(join(repositoryRoot, "specs/core/rename-old.md"));
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/rename-new.md",
    canonicalSpec("fixture-rename-new", "Rename Evidence", "The same rename evidence remains"),
  );
  await writeFixtureFile(
    repositoryRoot,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Committed Review", "Committed branch intent"),
  );
  await fixtureGit(repositoryRoot, ["add", "specs"]);
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
  if (primaryRepositoryRoot) await removeGitFixture(primaryRepositoryRoot);
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
  await expect(
    page.getByRole("region", { name: "Typed before and after comparison" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open feature contract" }).click();
  await expect(page.getByRole("heading", { name: "Staged Review", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 680, height: 820 });
  await page.getByRole("link", { name: "Branch Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Branch Review" })).toBeVisible();
  await expect(page.locator(".vite-error-overlay")).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});

test("semantic detail explains every contract category without losing review context", async ({
  page,
}) => {
  await page.goto(reviewSession.url);
  const detailFeature = page.getByRole("link", { name: /Detail Review/u }).first();
  await detailFeature.click();

  const comparison = page.getByRole("region", { name: "Typed before and after comparison" });
  await expect(comparison).toBeVisible();
  const rail = page.getByRole("navigation", { name: "Branch changes" });
  await Promise.all(
    ["Behaviours", "Invariants", "Decision rows", "Questions", "Relationships", "User flows"].map(
      (category) => expect(rail).toContainText(category),
    ),
  );

  await rail
    .getByRole("link", { name: /Behaviours/u })
    .first()
    .click();
  await expect(comparison).toContainText("The reviewer sees the proposed change.");
  await expect(comparison).toContainText("The reviewer can explain each semantic change.");
  await page.getByRole("button", { name: /Show source diff/u }).click();
  const source = page.getByRole("region", { name: "Raw source diff" });
  await expect(source).toBeVisible();
  await expect(page.locator('pre[aria-label="Before raw source"]')).toContainText(
    "Inspect evidence",
  );
  await expect(page.locator('pre[aria-label="After raw source"]')).toContainText(
    "Review exact evidence",
  );
  await expect(source.locator(".source-focus-line")).toHaveCount(2);

  const currentUrl = page.url();
  await page.keyboard.press("j");
  await expect(page).not.toHaveURL(currentUrl);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  await page.getByRole("link", { name: "Back to Branch Review" }).click();
  await expect(page.getByRole("heading", { name: "Branch Review" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Detail Review/u }).first()).toBeFocused();

  await page
    .getByRole("link", { name: /Detail Review/u })
    .first()
    .click();
  await page
    .getByRole("navigation", { name: "Branch changes" })
    .getByRole("link", { name: /Rename Suggested/u })
    .click();
  await expect(page.getByRole("region", { name: "Inferred rename confidence" })).toContainText(
    "Inferred, not proven",
  );

  await page.keyboard.press("1");
  await expect(page.getByRole("button", { name: /1 Committed/u })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page).toHaveURL(/provenance=staged%2Cunstaged%2Cuntracked/u);
});

test("missing base explains the repair command while Atlas remains usable", async ({ page }) => {
  await page.goto(missingBaseSession.url);
  await expect(
    page.getByRole("heading", { name: "Choose a comparison base to review this branch." }),
  ).toBeVisible();
  await expect(page.getByText("calmcraft generate --diff --base <ref>")).toBeVisible();
  await expect(page.getByText("does-not-exist", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Atlas" }).click();
  await expect(page.getByRole("heading", { name: "Atlas" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Staged Review/u })).toBeVisible();
});
