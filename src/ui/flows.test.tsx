/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Flow, SpecDocument, SpecEstate } from "../specs/model";
import { buildMappedFlows, flowsHref, FlowsView, parseFlowsSelection } from "./flows";

function makeFlow(id: string, states: number, transitions: number, covers: string[]): Flow {
  return {
    id,
    name: `${id} journey`,
    start: "s1",
    states: Array.from({ length: states }, (_, index) => ({
      id: `s${index + 1}`,
      kind: "screen" as const,
      label: `State ${index + 1}`,
    })),
    transitions: Array.from({ length: transitions }, (_, index) => ({
      id: `${id}.T${index + 1}`,
      from: "s1",
      event: `Event ${index + 1}`,
      to: "s2",
      covers: index === 0 ? covers : [],
    })),
  };
}

function makeSpec(id: string, module: string, behaviourKeys: string[], flow?: Flow): SpecDocument {
  return {
    id,
    area: module,
    status: "implemented",
    path: `${module}/${id}.md`,
    module,
    featureArea: "root",
    name: id,
    title: `Spec ${id}`,
    descriptionMarkdown: "",
    descriptionHtml: "",
    sectionNames: [],
    behaviours: behaviourKeys.map((key, index) => ({
      key,
      number: index + 1,
      suffix: "",
      title: `Behaviour ${key}`,
      status: "implemented" as const,
      markdown: "",
      renderedHtml: "",
      location: { line: 1, column: 1 },
    })),
    invariants: [],
    decisionTables: [],
    flowReferences: [],
    flows: flow
      ? [
          {
            path: `${module}/${id}.flow.yaml`,
            diagramPath: `${module}/${id}.flow.mmd`,
            sourceHash: "hash",
            source: "",
            contract: { version: 1, flows: [flow] },
          },
        ]
      : [],
    openQuestions: [],
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
  const specs = [
    makeSpec("mapped-complete", "billing", ["B1", "B2"], makeFlow("F1", 4, 6, ["B1", "B2"])),
    makeSpec("mapped-partial", "support", ["B1", "B2", "B3"], makeFlow("F1", 9, 17, ["B1"])),
    makeSpec("unmapped-one", "support", ["B1"]),
    makeSpec("unmapped-two", "billing", ["B1"]),
  ];
  return { root: "/repo", specsRoot: "specs", specs, relationships: [], findings: [] };
}

describe("CalmCraft Flows", () => {
  beforeEach(() => window.history.replaceState({}, "", "/"));
  afterEach(() => cleanup());

  it("joins every mapped journey to the feature that owns it", () => {
    const mapped = buildMappedFlows(makeEstate());

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      key: "mapped-complete:F1",
      covered: 2,
      behaviours: 2,
      contractPath: "billing/mapped-complete.flow.yaml",
      diagramPath: "billing/mapped-complete.flow.mmd",
    });
    expect(mapped[1]).toMatchObject({ key: "mapped-partial:F1", covered: 1, behaviours: 3 });
  });

  it("reports coverage, totals, and how much of the estate is unmapped", () => {
    render(<FlowsView estate={makeEstate()} selection={{}} />);

    expect(screen.getByRole("heading", { name: "Flows" })).toBeInTheDocument();
    expect(
      screen.getByText("Showing 2 of 2 journeys · 13 states · 23 transitions"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("2 specifications have no mapped journey.")).toBeInTheDocument();
  });

  it("filters to journeys that do not cover their whole contract", async () => {
    const user = userEvent.setup();
    render(<FlowsView estate={makeEstate()} selection={{ incomplete: true }} />);

    expect(document.querySelectorAll("[data-flow-key]")).toHaveLength(1);
    expect(screen.getByText("Spec mapped-partial")).toBeInTheDocument();
    expect(screen.queryByText("Spec mapped-complete")).not.toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search journeys" }), "nothing matches");
    expect(await screen.findByText("No journeys match")).toBeInTheDocument();
  });

  it("says so plainly when nothing is mapped", () => {
    const estate = makeEstate();
    render(<FlowsView estate={{ ...estate, specs: estate.specs.slice(2) }} selection={{}} />);

    expect(screen.getByText("No journeys are mapped")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-flow-key]")).toHaveLength(0);
  });

  it("keeps the selection in the route", () => {
    expect(flowsHref()).toBe("#/flows");
    expect(flowsHref({ module: "support", incomplete: true })).toBe(
      "#/flows?module=support&incomplete=1",
    );
    expect(parseFlowsSelection(new URLSearchParams("module=support&incomplete=1"))).toEqual({
      module: "support",
      incomplete: true,
    });
    expect(parseFlowsSelection(new URLSearchParams("incomplete=0"))).toEqual({});
  });
});
