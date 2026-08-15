/** @vitest-environment jsdom */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { BranchReview, Provenance, SemanticChange } from "../diff/model";
import type { RepositorySnapshot } from "../git/model";
import type { SpecEstate } from "../specs/model";
import { loadSpecEstateFromSources } from "../specs/estate";
import { CalmCraftApp } from "./app";
import { BranchReviewView, groupReviewChanges, semanticChangeLabel } from "./branch-review";

const SPEC = `---
id: fixture-review
area: Billing
status: implemented
---

# Review Changes

Review product intent.

## Behaviours

### B1 — Show the review 🟢 implemented

The reviewer sees the semantic change.

## Rules (Invariants)

- Evidence remains available.

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

let estate: SpecEstate;

function snapshot(kind: RepositorySnapshot["kind"]): RepositorySnapshot {
  return {
    kind,
    revision: kind,
    specsRoot: "specs",
    sourcePaths: ["specs/billing/review-changes.md"],
    deletedSpecPaths: [],
    untrackedSpecPaths: [],
    repository: {
      root: "/fixture/repository",
      gitDir: "/fixture/repository/.git",
      commonDir: "/fixture/repository/.git",
      branch: "feature/review",
      head: "1234567890abcdef",
      remotes: [],
      worktreeEntries: [],
    },
    estate,
  };
}

function change(provenance: Provenance, kind: string, elementId?: string): SemanticChange {
  return {
    id: `${provenance}-${kind}`,
    provenance,
    kind,
    specId: "fixture-review",
    elementId,
    before: "Before",
    after: "After",
    evidence: {
      beforePath: "specs/billing/review-changes.md",
      afterPath: "specs/billing/review-changes.md",
      beforeSource: SPEC,
      afterSource: SPEC,
    },
  };
}

function review(overrides: Partial<BranchReview> = {}): BranchReview {
  const target = snapshot("filesystem");
  return {
    available: true,
    repository: target.repository,
    base: {
      available: true,
      head: target.repository.head,
      selectedBase: "main",
      selectedCommit: "abcdef1234567890",
      mergeBase: "fedcba0987654321",
      source: "explicit",
      attempted: ["main"],
    },
    target,
    baseline: snapshot("commit"),
    pathChanges: [],
    patches: [],
    semanticChanges: [
      change("committed", "behaviour.content-changed", "B1"),
      change("staged", "spec.metadata-changed"),
      change("unstaged", "question.added"),
      change("untracked", "spec.added"),
    ],
    estate,
    ...overrides,
  };
}

describe("Branch Review", () => {
  beforeAll(async () => {
    estate = await loadSpecEstateFromSources(
      "/fixture/repository",
      "specs",
      new Map([["billing/review-changes.md", SPEC]]),
    );
  });

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => cleanup());

  it("shows comparison identity, stable semantic labels, and affected feature links", () => {
    render(
      <BranchReviewView
        initialProvenance={["committed", "staged", "unstaged", "untracked"]}
        review={review()}
        selection={{}}
      />,
    );

    const identity = screen.getByRole("region", { name: "Comparison identity" });
    expect(identity).toHaveTextContent("feature/review");
    expect(identity).toHaveTextContent("main");
    expect(identity).toHaveTextContent("fedcba0987");
    expect(screen.getByText("B1 · Behaviours Content Changed")).toBeVisible();
    expect(screen.getByRole("link", { name: /Review Changes/u })).toHaveAttribute(
      "href",
      expect.stringMatching(/^#\/review\/change\//u),
    );
    expect(semanticChangeLabel(change("committed", "flow.transition.guard-changed", "F1.T1"))).toBe(
      "F1.T1 · User flows Transition Guard Changed",
    );
    expect(
      semanticChangeLabel({
        ...change("committed", "validation.introduced", "content.unsafe-removed:abcd1234"),
        after: { code: "content.unsafe-removed" },
      }),
    ).toBe("Validation Introduced · Content Unsafe Removed");
  });

  it("isolates provenance and groups changes by type or provenance", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/#/review?provenance=committed,staged,unstaged,untracked&group=module",
    );
    render(
      <CalmCraftApp
        session={{
          mode: "review",
          review: review(),
          initialProvenance: ["committed", "staged", "unstaged", "untracked"],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Staged 1 changes/u }));
    await user.click(screen.getByRole("button", { name: /Unstaged 1 changes/u }));
    await user.click(screen.getByRole("button", { name: /Untracked 1 changes/u }));
    expect(screen.getByText("1 of 4 semantic changes shown")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Type" }));
    expect(screen.getByRole("heading", { name: "Behaviours" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Provenance" }));
    expect(screen.getByRole("heading", { name: "Branch commits" })).toBeVisible();
  });

  it("keeps an honest empty state and missing-base repair route", () => {
    const { rerender } = render(
      <BranchReviewView
        initialProvenance={["committed", "staged", "unstaged", "untracked"]}
        review={review({ semanticChanges: [] })}
        selection={{}}
      />,
    );
    expect(screen.getByRole("heading", { name: "No product intent changed" })).toBeVisible();

    const unavailable = review({
      available: false,
      base: {
        available: false,
        head: "1234567890abcdef",
        selectedBase: "missing/base",
        source: "explicit",
        attempted: ["missing/base"],
        reason: "The explicit base does not resolve locally.",
      },
      semanticChanges: [],
    });
    rerender(
      <BranchReviewView
        initialProvenance={["committed", "staged", "unstaged", "untracked"]}
        review={unavailable}
        selection={{}}
      />,
    );
    expect(screen.getByRole("heading", { name: /Choose a comparison base/u })).toBeVisible();
    expect(screen.getByText("calmcraft generate --diff --base <ref>")).toBeVisible();
    expect(
      within(screen.getByText("Tried locally").parentElement!).getByText("missing/base"),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Atlas" })).toHaveAttribute("href", "#/atlas");
  });

  it("groups deterministically without mutating the review", () => {
    const subject = review();
    const selected = new Set<Provenance>(["committed", "staged"]);
    const before = structuredClone(subject.semanticChanges);

    expect(groupReviewChanges(subject, selected, "type").map((group) => group.label)).toEqual([
      "Behaviours",
      "Specification",
    ]);
    expect(subject.semanticChanges).toEqual(before);
  });
});
