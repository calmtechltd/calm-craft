/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { OpenQuestion, SpecDocument, SpecEstate } from "../specs/model";
import {
  buildEstateQuestions,
  parseQuestionsSelection,
  questionsHref,
  QuestionsView,
} from "./questions";

function makeQuestion(line: number, blocks: string[], resolved = false): OpenQuestion {
  return {
    markdown: `Question at line ${line}`,
    renderedHtml: `<p>Question at line ${line}</p>`,
    resolved,
    blocks,
    location: { line, column: 1 },
  };
}

function makeSpec(id: string, module: string, questions: OpenQuestion[]): SpecDocument {
  return {
    id,
    area: module,
    status: "partial",
    path: `${module}/${id}.md`,
    module,
    featureArea: "root",
    name: id,
    title: `Spec ${id}`,
    descriptionMarkdown: "",
    descriptionHtml: "",
    sectionNames: [],
    behaviours: [],
    invariants: [],
    decisionTables: [],
    flowReferences: [],
    flows: [],
    openQuestions: questions,
    futureConsiderationsMarkdown: "",
    futureConsiderationsHtml: "",
    outOfScopeMarkdown: "",
    outOfScopeHtml: "",
    links: [],
    forwardLinks: [],
    backlinks: [],
    sourceHash: `hash-${id}`,
    source: "",
    findings: [],
  };
}

function makeEstate(): SpecEstate {
  return {
    root: "/repo",
    specsRoot: "specs",
    specs: [
      makeSpec("rrule", "core", [makeQuestion(12, ["B1", "B2"]), makeQuestion(30, [])]),
      makeSpec("coverage", "operations", [makeQuestion(24, ["B4"]), makeQuestion(40, [], true)]),
      makeSpec("quiet", "admin", []),
    ],
    relationships: [],
    findings: [],
  };
}

describe("CalmCraft Questions", () => {
  beforeEach(() => window.history.replaceState({}, "", "/"));
  afterEach(() => cleanup());

  it("collects unresolved questions and leaves settled ones out", () => {
    const open = buildEstateQuestions(makeEstate());
    expect(open).toHaveLength(3);
    expect(open.map((item) => item.spec.id)).toEqual(["rrule", "rrule", "coverage"]);

    const settled = buildEstateQuestions(makeEstate(), true);
    expect(settled).toHaveLength(1);
    expect(settled[0]?.question.resolved).toBe(true);
  });

  it("groups by feature and marks the ones holding a behaviour up", () => {
    render(<QuestionsView estate={makeEstate()} selection={{}} />);

    expect(screen.getByRole("heading", { name: "Questions" })).toBeInTheDocument();
    expect(screen.getByText("Showing 3 of 3 open questions across 2 features")).toBeInTheDocument();
    expect(screen.getAllByText("Blocking")).toHaveLength(2);
    expect(screen.getAllByText("Open")).toHaveLength(1);
    expect(screen.getByText("B1")).toBeInTheDocument();
  });

  it("filters to questions that block a behaviour", async () => {
    const user = userEvent.setup();
    render(<QuestionsView estate={makeEstate()} selection={{ blocking: true }} />);

    expect(document.querySelectorAll("[data-question-key]")).toHaveLength(2);
    await user.type(screen.getByRole("searchbox", { name: "Search questions" }), "line 24");
    expect(await screen.findByText("Question at line 24")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-question-key]")).toHaveLength(1);
  });

  it("says so plainly when nothing is undecided", () => {
    const estate = makeEstate();
    render(<QuestionsView estate={{ ...estate, specs: [estate.specs[2]!] }} selection={{}} />);

    expect(screen.getByText("Nothing is undecided")).toBeInTheDocument();
  });

  it("keeps the selection in the route", () => {
    expect(questionsHref()).toBe("#/questions");
    expect(questionsHref({ module: "core", blocking: true })).toBe(
      "#/questions?module=core&blocking=1",
    );
    expect(
      parseQuestionsSelection(new URLSearchParams("module=core&blocking=1&settled=1")),
    ).toEqual({ module: "core", blocking: true, settled: true });
    expect(parseQuestionsSelection(new URLSearchParams("blocking=0"))).toEqual({});
  });
});
