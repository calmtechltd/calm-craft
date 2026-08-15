/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RepositorySnapshot } from "../git/model";
import type { SpecDocument, SpecEstate, SpecStatus } from "../specs/model";
import { CalmCraftApp, parseAppRoute } from "./app";

function makeSpec(index: number, status: SpecStatus = "implemented"): SpecDocument {
  const module = index % 2 === 0 ? "billing" : "support";
  const featureArea = index % 3 === 0 ? "invoices" : "operations";
  return {
    id: `${module}-${featureArea}-feature-${index}`,
    area: module,
    status,
    path: `${module}/${featureArea}/feature-${index}.md`,
    module,
    featureArea,
    name: `feature-${index}`,
    title: `Feature ${index}`,
    descriptionMarkdown: `Intent for feature ${index}`,
    descriptionHtml: `<p>Intent for feature ${index}</p>`,
    sectionNames: ["Behaviours"],
    behaviours: [
      {
        key: "B1",
        number: 1,
        suffix: "",
        title: `Do the useful thing ${index}`,
        status,
        markdown: `A user can complete feature ${index}.`,
        renderedHtml: `<p>A user can complete feature ${index}.</p>`,
        location: { line: 10, column: 1 },
      },
    ],
    invariants: [],
    decisionTables: [],
    flowReferences: [],
    flows: [],
    openQuestions:
      index === 2
        ? [
            {
              markdown: "Which provider?",
              renderedHtml: "<p>Which provider?</p>",
              resolved: false,
              blocks: ["B1"],
              location: { line: 20, column: 1 },
            },
          ]
        : [],
    futureConsiderationsMarkdown: "",
    futureConsiderationsHtml: "",
    outOfScopeMarkdown: "",
    outOfScopeHtml: "",
    links: [],
    forwardLinks: [],
    backlinks: [],
    sourceHash: `hash-${index}`,
    source: `# Feature ${index}`,
    findings:
      index === 2
        ? [
            {
              id: "finding-2",
              code: "test.finding",
              severity: "warning",
              path: `${module}/${featureArea}/feature-${index}.md`,
              message: "A fixture warning.",
            },
          ]
        : [],
  };
}

function makeEstate(count: number): SpecEstate {
  const specs = Array.from({ length: count }, (_, index) =>
    makeSpec(index, index % 3 === 0 ? "future" : index % 3 === 1 ? "partial" : "implemented"),
  );
  return {
    root: "/private/repository",
    specsRoot: "specs",
    specs,
    relationships: [],
    findings: specs.flatMap((spec) => spec.findings),
  };
}

function makeSnapshot(count = 6): RepositorySnapshot {
  return {
    kind: "filesystem",
    revision: "filesystem",
    specsRoot: "specs",
    sourcePaths: [],
    deletedSpecPaths: [],
    untrackedSpecPaths: [],
    repository: {
      root: "/private/repository",
      gitDir: "/private/repository/.git",
      commonDir: "/private/repository/.git",
      branch: "feature/visual-atlas",
      head: "1234567890abcdef",
      remotes: [],
      worktreeEntries: [
        { path: "specs/billing/operations/feature-2.md", status: "M", tracked: true },
      ],
    },
    estate: makeEstate(count),
  };
}

describe("CalmCraft Atlas", () => {
  beforeEach(() => {
    window.localStorage?.clear();
    window.history.replaceState({}, "", "/");
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => cleanup());

  it("parses durable feature context and rejects malformed route encoding", () => {
    expect(parseAppRoute("#/atlas?status=future&findings=1")).toEqual({
      view: "atlas",
      selection: { status: "future", findings: true },
    });
    expect(parseAppRoute("#/review")).toEqual({ view: "review", selection: {} });
    expect(
      parseAppRoute(
        "#/review/change/change%3A123?feature=fixture&provenance=committed,staged&group=type&source=1",
      ),
    ).toEqual({
      view: "review",
      selection: {
        change: "change:123",
        feature: "fixture",
        provenance: ["committed", "staged"],
        group: "type",
        sourceDiff: true,
      },
    });
    expect(parseAppRoute("#/feature/example/behaviour/B2a")).toEqual({
      view: "feature",
      id: "example",
      selection: {
        behaviour: "B2a",
        flow: undefined,
        state: undefined,
        transition: undefined,
        finding: undefined,
        question: undefined,
      },
    });
    expect(parseAppRoute("#/feature/example?flow=F1&transition=F1.T2")).toEqual({
      view: "feature",
      id: "example",
      selection: {
        behaviour: undefined,
        flow: "F1",
        state: undefined,
        transition: "F1.T2",
        finding: undefined,
        question: undefined,
      },
    });
    expect(parseAppRoute("#/feature/%")).toEqual({ view: "atlas", selection: {} });
  });

  it("orients the repository and communicates status without colour alone", () => {
    render(<CalmCraftApp session={{ mode: "estate", snapshot: makeSnapshot() }} />);

    expect(screen.getByText("repository")).toBeInTheDocument();
    expect(screen.getByText("feature/visual-atlas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Atlas" })).toBeInTheDocument();
    expect(screen.getAllByText("Implemented").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partial").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Future").length).toBeGreaterThan(0);
    expect(screen.getByText("Changed")).toBeInTheDocument();
  });

  it("makes remote source and temporary-storage cleanup visible", () => {
    render(
      <CalmCraftApp
        session={{
          mode: "estate",
          snapshot: makeSnapshot(),
          repositorySource: {
            kind: "remote",
            displayUrl: "https://example.test/calm/private-specs.git",
            branch: "feature/private-review",
            storage: "temporary",
            cleanup: "removed-on-stop",
          },
        }}
      />,
    );

    expect(screen.getByText("Remote · temporary clone")).toHaveAttribute(
      "title",
      "https://example.test/calm/private-specs.git",
    );
    expect(screen.getByText("Private remote · removed on stop")).toBeInTheDocument();
  });

  it("searches and filters by status, module, blockers, findings, and changed state", async () => {
    const user = userEvent.setup();
    render(<CalmCraftApp session={{ mode: "estate", snapshot: makeSnapshot() }} />);

    await user.type(screen.getByRole("searchbox", { name: "Search specifications" }), "feature 2");
    expect(screen.getByText("Showing 1 of 6 specifications")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by module" }), "billing");
    expect(await screen.findByText("Showing 3 of 6 specifications")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by status" }),
      "implemented",
    );
    expect(screen.getByText("Showing 1 of 6 specifications")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Has blockers" }));
    expect(screen.getByText("Showing 1 of 6 specifications")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Has findings" }));
    expect(screen.getByText("Showing 1 of 6 specifications")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Changed here" }));
    expect(screen.getByText("Showing 1 of 6 specifications")).toBeInTheDocument();
  });

  it("opens a specification with pointer or keyboard and preserves a local URL", async () => {
    const user = userEvent.setup();
    render(<CalmCraftApp session={{ mode: "estate", snapshot: makeSnapshot() }} />);
    const first = screen.getByRole("button", { name: /Feature 0/i });

    first.focus();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(await screen.findByRole("dialog", { name: "Command palette" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Search commands" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Command palette" }), { key: "Escape" });
    await waitFor(() => expect(first).toHaveFocus());
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).not.toBe(first);
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: /^Feature 2$/u })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back to Atlas" }));
    await user.click(screen.getByRole("button", { name: /Feature 4/i }));
    expect(screen.getByRole("heading", { name: /^Feature 4$/u })).toBeInTheDocument();
    expect(window.location.hash).toContain("/feature/billing-operations-feature-4");
    expect(window.location.href).not.toContain("token=");
  });

  /*
   * The estate used to render 120 rows behind a Show more button because there
   * was no windowing. Rows now carry `content-visibility`, so the browser skips
   * off-screen work and the whole match set can render at once. The budget is
   * unchanged: filtering a 1,000-spec estate stays under 750ms.
   */
  it("renders every match while filtering a 1,000-spec estate", { timeout: 20_000 }, async () => {
    const renderStarted = performance.now();
    render(<CalmCraftApp session={{ mode: "estate", snapshot: makeSnapshot(1_000) }} />);
    const renderCost = performance.now() - renderStarted;

    expect(document.querySelectorAll("[data-spec-id]")).toHaveLength(1_000);
    expect(screen.queryByRole("button", { name: /Show \d+ more/u })).not.toBeInTheDocument();
    /* jsdom lays out every row; a browser skips the off-screen ones entirely. */
    expect(renderCost).toBeLessThan(1_500);
    const started = performance.now();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search specifications" }), {
      target: { value: "feature 999" },
    });
    expect(await screen.findByText("Showing 1 of 1000 specifications")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-spec-id]")).toHaveLength(1);
    expect(performance.now() - started).toBeLessThan(750);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(await screen.findByText("Showing 1000 of 1000 specifications")).toBeInTheDocument();
    const filterStarted = performance.now();
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), {
      target: { value: "future" },
    });
    expect(await screen.findByText("Showing 334 of 1000 specifications")).toBeInTheDocument();
    expect(performance.now() - filterStarted).toBeLessThan(750);
  });
});
