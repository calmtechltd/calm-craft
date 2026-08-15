/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { BranchReview, Provenance, SemanticChange } from "../diff/model";
import type { RepositorySnapshot } from "../git/model";
import type { SpecEstate } from "../specs/model";
import { loadSpecEstateFromSources } from "../specs/estate";
import { CalmCraftApp } from "./app";
import { SemanticValue } from "./branch-change";
import { reviewHref } from "./review-route";

const SPEC = `---
id: fixture-detail
area: Payments
status: implemented
---

# Detail Review

Explain every product change.

## Behaviours

### B1 — Review evidence 🟢 implemented

The reviewer sees exact evidence.

## Rules (Invariants)

- Evidence remains available.

## Decision Tables

| State | Result |
| ----- | ------ |
| Ready | Review |

## User Flows

_None._

## Open Questions

- Which evidence is required?

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
    sourcePaths: ["specs/payments/detail-review.md"],
    deletedSpecPaths: [],
    untrackedSpecPaths: [],
    repository: {
      root: "/fixture/repository",
      gitDir: "/fixture/repository/.git",
      commonDir: "/fixture/repository/.git",
      branch: "feature/detail",
      head: "1234567890abcdef",
      remotes: [],
      worktreeEntries: [],
    },
    estate,
  };
}

function change(
  id: string,
  provenance: Provenance,
  kind: string,
  before: unknown,
  after: unknown,
): SemanticChange {
  return {
    id,
    provenance,
    kind,
    specId: "fixture-detail",
    elementId: kind.startsWith("behaviour") ? "B1" : undefined,
    before,
    after,
    evidence: {
      beforePath: "specs/payments/detail-review.md",
      afterPath: "specs/payments/detail-review.md",
      beforeLocation: { line: 12, column: 1 },
      afterLocation: { line: 12, column: 1 },
      beforeSource: SPEC.replace("exact evidence", "source evidence"),
      afterSource: SPEC,
    },
  };
}

function review(changes: SemanticChange[]): BranchReview {
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
    semanticChanges: changes,
    estate,
  };
}

describe("semantic change detail", () => {
  beforeAll(async () => {
    estate = await loadSpecEstateFromSources(
      "/fixture/repository",
      "specs",
      new Map([["payments/detail-review.md", SPEC]]),
    );
  });

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => cleanup());

  it("renders typed values for every semantic contract category", () => {
    const examples: Array<{ change: SemanticChange; expected: string }> = [
      {
        change: change("behaviour", "committed", "behaviour.content-changed", undefined, {
          key: "B1",
          title: "Review evidence",
          status: "implemented",
          renderedHtml: "<p>Behaviour intent</p>",
        }),
        expected: "Behaviour intent",
      },
      {
        change: change("invariant", "committed", "invariant.added", undefined, {
          markdown: "Evidence remains available.",
          renderedHtml: "<p>Invariant intent</p>",
        }),
        expected: "Invariant intent",
      },
      {
        change: change("decision", "committed", "decision-row.added", undefined, {
          cells: ["Ready", "Review"],
        }),
        expected: "Ready",
      },
      {
        change: change("question", "committed", "question.resolved", undefined, {
          markdown: "Which evidence?",
          renderedHtml: "<p>Which evidence?</p>",
          resolved: true,
          blocks: ["B1"],
        }),
        expected: "Resolved",
      },
      {
        change: change("relationship", "committed", "relationship.added", undefined, {
          sourceId: "fixture-detail",
          targetId: "fixture-target",
          label: "Uses target",
        }),
        expected: "Uses target",
      },
      {
        change: change("flow", "committed", "flow.transition.guard-changed", undefined, {
          id: "F1.T1",
          from: "ready",
          event: "Approve",
          to: "done",
          guard: "The evidence is valid.",
          covers: ["B1"],
        }),
        expected: "Approve",
      },
      {
        change: change("finding", "committed", "validation.introduced", undefined, {
          severity: "warning",
          code: "flow.coverage.missing",
          message: "B1 is not covered.",
        }),
        expected: "B1 is not covered.",
      },
    ];

    for (const example of examples) {
      const { unmount } = render(
        <SemanticValue change={example.change} value={example.change.after} />,
      );
      expect(screen.getByText(example.expected)).toBeVisible();
      unmount();
    }
  });

  it("moves through changes, filters provenance, and opens exact source from durable URLs", async () => {
    const user = userEvent.setup();
    const changes = [
      change("change:behaviour", "committed", "behaviour.status-changed", "future", "implemented"),
      {
        ...change(
          "change:rename",
          "staged",
          "spec.rename-suggested",
          { id: "old-detail", path: "payments/old.md" },
          { id: "fixture-detail", path: "payments/detail-review.md" },
        ),
        elementId: "old-detail",
        inferred: true,
      },
      change(
        "change:flow",
        "unstaged",
        "flow.transition.guard-changed",
        "Evidence exists.",
        "Evidence is valid.",
      ),
    ];
    const selection = {
      change: changes[0]!.id,
      feature: "fixture-detail",
      provenance: ["committed", "staged", "unstaged"] as Provenance[],
      group: "type" as const,
    };
    window.history.replaceState({}, "", `/${reviewHref(selection)}`);
    render(
      <CalmCraftApp
        session={{
          mode: "review",
          review: review(changes),
          initialProvenance: ["committed", "staged", "unstaged", "untracked"],
        }}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "B1 · Behaviours Status Changed",
    });
    expect(heading).toHaveFocus();
    expect(
      screen.getByRole("region", { name: "Typed before and after comparison" }),
    ).toHaveTextContent(/future.*implemented/u);

    fireEvent.keyDown(window, { key: "j" });
    expect(
      await screen.findByRole("heading", { name: "old-detail · Specification Rename Suggested" }),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Inferred rename confidence" })).toHaveTextContent(
      "Inferred, not proven",
    );

    fireEvent.keyDown(window, { key: "d" });
    const source = await screen.findByRole("region", { name: "Raw source diff" });
    expect(source).toHaveTextContent("Line 12");
    expect(screen.getByLabelText("Before raw source")).toBeVisible();
    expect(window.location.hash).toContain("source=1");

    await user.click(screen.getByRole("button", { name: /2 Staged/u }));
    expect(
      await screen.findByRole("heading", { name: "B1 · Behaviours Status Changed" }),
    ).toBeVisible();
    expect(window.location.hash).toContain("provenance=committed%2Cunstaged");

    const back = screen.getByRole("link", { name: "Back to Branch Review" });
    expect(back).toHaveAttribute("href", expect.stringContaining("feature=fixture-detail"));
    expect(back).toHaveAttribute("href", expect.stringContaining("group=type"));
  });
});
