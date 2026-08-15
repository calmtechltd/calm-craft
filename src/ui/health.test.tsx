/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BranchReview, SemanticChange } from "../diff/model";
import type { RepositorySnapshot } from "../git/model";
import type { SpecDocument, SpecEstate, SpecFinding } from "../specs/model";
import { CalmCraftApp } from "./app";
import { buildHealthItems, healthHref } from "./health";

const currentFinding: SpecFinding = {
  id: "format.heading:current",
  code: "format.heading",
  severity: "warning",
  path: "core/alpha.md",
  message: "A heading does not match the contract format.",
  location: { line: 12, column: 1 },
  hint: "Use a canonical behaviour heading.",
};

const introducedFinding: SpecFinding = {
  id: "flow.destination:introduced",
  code: "flow.destination",
  severity: "error",
  path: "core/alpha.flow.yaml",
  message: "A transition points to a missing state.",
  location: { line: 18, column: 5 },
  hint: "Add the destination state or correct the transition.",
};

const resolvedFinding: SpecFinding = {
  id: "link.target.missing:resolved",
  code: "link.target.missing",
  severity: "warning",
  path: "core/alpha.md",
  message: "A related specification was missing.",
  location: { line: 8, column: 1 },
  hint: "Restore the linked specification.",
};

function spec(findings: SpecFinding[]): SpecDocument {
  return {
    id: "fixture-alpha",
    area: "Fixture",
    status: "partial",
    path: "core/alpha.md",
    module: "core",
    featureArea: "root",
    name: "alpha",
    title: "Feature Alpha",
    descriptionMarkdown: "A healthy feature remains available.",
    descriptionHtml: "<p>A healthy feature remains available.</p>",
    sectionNames: ["Behaviours", "Open Questions"],
    behaviours: [],
    invariants: [],
    decisionTables: [],
    flowReferences: [],
    flows: [],
    openQuestions: [
      {
        markdown: "**Blocks B1:** Which path is canonical?",
        renderedHtml: "<p><strong>Blocks B1:</strong> Which path is canonical?</p>",
        resolved: false,
        blocks: ["B1"],
        location: { line: 24, column: 1 },
      },
    ],
    futureConsiderationsMarkdown: "",
    futureConsiderationsHtml: "",
    outOfScopeMarkdown: "",
    outOfScopeHtml: "",
    links: [],
    forwardLinks: [],
    backlinks: [],
    sourceHash: "alpha-source",
    source: "# Feature Alpha",
    findings,
  };
}

function estate(findings: SpecFinding[]): SpecEstate {
  return {
    root: "/fixture/repository",
    specsRoot: "specs",
    specs: [spec(findings)],
    relationships: [],
    findings,
  };
}

function snapshot(kind: RepositorySnapshot["kind"], findings: SpecFinding[]): RepositorySnapshot {
  return {
    kind,
    revision: kind,
    specsRoot: "specs",
    sourcePaths: ["specs/core/alpha.md"],
    deletedSpecPaths: [],
    untrackedSpecPaths: [],
    repository: {
      root: "/fixture/repository",
      gitDir: "/fixture/repository/.git",
      commonDir: "/fixture/repository/.git",
      branch: "feature/health",
      head: "1234567890abcdef",
      remotes: [],
      worktreeEntries: [],
    },
    estate: estate(findings),
  };
}

function change(
  id: string,
  kind: "validation.introduced" | "validation.resolved",
  finding: SpecFinding,
): SemanticChange {
  return {
    id,
    kind,
    provenance: kind === "validation.introduced" ? "staged" : "committed",
    specId: "fixture-alpha",
    elementId: finding.id,
    before: kind === "validation.resolved" ? finding : undefined,
    after: kind === "validation.introduced" ? finding : undefined,
    evidence: {
      beforePath: kind === "validation.resolved" ? finding.path : undefined,
      afterPath: kind === "validation.introduced" ? finding.path : undefined,
      beforeLocation: kind === "validation.resolved" ? finding.location : undefined,
      afterLocation: kind === "validation.introduced" ? finding.location : undefined,
    },
  };
}

function review(): BranchReview {
  const target = snapshot("filesystem", [currentFinding, introducedFinding]);
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
    baseline: snapshot("commit", [currentFinding, resolvedFinding]),
    pathChanges: [],
    patches: [],
    semanticChanges: [
      change("change:introduced", "validation.introduced", introducedFinding),
      change("change:resolved", "validation.resolved", resolvedFinding),
    ],
    estate: target.estate,
  };
}

describe("Health and command navigation", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => cleanup());

  /*
   * Health used to fold every unresolved question into the findings list, so
   * its count answered two different questions at once. Questions moved to
   * their own view; Health now counts only what is actually wrong.
   */
  it("combines current, introduced, and resolved findings without open questions", () => {
    const items = buildHealthItems(review().target.estate, review());
    expect(items.map((item) => item.state)).toEqual(
      expect.arrayContaining(["current", "introduced", "resolved"]),
    );
    expect(items.map((item) => item.finding.code)).not.toContain("question.unresolved");
    expect(items.filter((item) => item.finding.id === introducedFinding.id)).toHaveLength(1);
  });

  it("filters findings and opens exact feature and branch context from a durable route", async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, "", `/${healthHref()}`);
    render(
      <CalmCraftApp
        session={{
          mode: "review",
          review: review(),
          initialProvenance: ["committed", "staged", "unstaged", "untracked"],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Health" })).toBeVisible();
    expect(screen.getByLabelText("3 health items")).toBeVisible();
    const search = screen.getByRole("searchbox", { name: "Search findings" });
    await user.type(search, "missing state");
    expect(await screen.findByText("Showing 1 of 3 health items")).toBeVisible();
    expect(window.location.hash).toContain("search=missing+state");
    await user.clear(search);
    expect(await screen.findByText("Showing 3 of 3 health items")).toBeVisible();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter findings by review state" }),
      "introduced",
    );
    expect(await screen.findByText("Showing 1 of 3 health items")).toBeVisible();
    await user.click(screen.getByRole("link", { name: /transition points to a missing state/u }));
    expect(screen.getByRole("heading", { name: introducedFinding.message })).toHaveFocus();
    expect(screen.getByLabelText("Finding detail")).toHaveTextContent("Line 18, column 5");
    expect(screen.getByRole("link", { name: "Open feature context" })).toHaveAttribute(
      "href",
      expect.stringContaining(`finding=${encodeURIComponent(introducedFinding.id)}`),
    );
    expect(screen.getByRole("link", { name: "Open branch evidence" })).toHaveAttribute(
      "href",
      expect.stringContaining("change%3Aintroduced"),
    );
  });

  it("opens views, features, filters, and findings from the keyboard command palette", async () => {
    const user = userEvent.setup();
    render(
      <CalmCraftApp
        session={{
          mode: "review",
          review: review(),
          initialProvenance: ["committed", "staged", "unstaged", "untracked"],
        }}
      />,
    );

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const input = await screen.findByRole("combobox", { name: "Search commands" });
    await user.type(input, "Feature Alpha");
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Command palette" }), { key: "Enter" });
    expect(await screen.findByRole("heading", { name: "Feature Alpha" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Open command palette" }));
    await user.type(screen.getByRole("combobox", { name: "Search commands" }), "Has findings");
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Command palette" }), { key: "Enter" });
    expect(await screen.findByRole("heading", { name: "Atlas" })).toBeVisible();
    expect(window.location.hash).toContain("findings=1");

    await user.click(screen.getByRole("button", { name: "Open command palette" }));
    await user.type(screen.getByRole("combobox", { name: "Search commands" }), "flow.destination");
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Command palette" }), { key: "Enter" });
    expect(await screen.findByRole("heading", { name: introducedFinding.message })).toHaveFocus();
  });
});
