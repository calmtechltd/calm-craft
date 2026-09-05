import { describe, expect, it } from "vitest";

import { parseFlowContract } from "./flow-contract";
import type { SpecDocument, SpecEstate } from "./model";
import { parseSpecDocument } from "./parser";
import { validateSpecEstate } from "./validator";

const FLOW_YAML = `version: 1
flows:
  - id: F1
    name: Review
    start: ready
    states:
      - id: ready
        kind: screen
        label: Ready
      - id: done
        kind: terminal
        label: Done
        outcome: The review finishes.
    transitions:
      - id: F1.T1
        from: ready
        event: Continue
        to: done
        covers: [B9]
`;

function source(body: string, id = "duplicate-spec", status = "implemented"): string {
  return `---
id: ${id}
area: Test
status: ${status}
---

# Test Spec

A test spec with [missing](./missing.md), [repository docs](../../docs/reference.md), [escape](../../../outside.md), and [unsafe](javascript:alert(1)).

## Behaviours

${body}

## Rules (Invariants)

- Test data remains declarative.

## Decision Tables

| Input | Result |
| -- | --- |
| Test | Kept |

## User Flows

- **F1 — Review:** [contract](./review.flow.yaml) · [diagram](./review.flow.mmd) — covers B1

## Open Questions

- **Blocks B8:** Which outcome is correct?

## Future Considerations

_None._

## Out of Scope

_None._
`;
}

function invalidSpec(): SpecDocument {
  const spec = parseSpecDocument({
    path: "module/feature.md",
    source: source(`### B1 — First 🟢 implemented

The first behaviour.

### B1 — Duplicate 🟡 partial

The duplicate behaviour.`),
  });
  spec.flows.push({
    path: "module/review.flow.yaml",
    diagramPath: "module/review.flow.mmd",
    sourceHash: "flow-source",
    source: FLOW_YAML,
    diagramSource: "flowchart TD\n  stale\n",
    diagramSourceHash: "stale-diagram",
    contract: parseFlowContract(FLOW_YAML),
  });
  return spec;
}

function invalidEstate(): SpecEstate {
  const first = invalidSpec();
  const second = parseSpecDocument({
    path: "other/feature.md",
    source: source("### B1 — Other 🟢 implemented\n\nThe other behaviour."),
  });
  return {
    root: "/fixture",
    specsRoot: "specs",
    specs: [first, second],
    relationships: [],
    findings: [],
  };
}

describe("spec estate validation", () => {
  it.each([
    { fallbackCount: 0, ambiguous: false },
    { fallbackCount: 1, ambiguous: false },
    { fallbackCount: 2, ambiguous: true },
  ])("B8 — same-event branches with $fallbackCount fallbacks", ({ fallbackCount, ambiguous }) => {
    const estate = invalidEstate();
    const flow = estate.specs[0]!.flows[0]!.contract!.flows[0]!;
    const original = flow.transitions[0]!;
    flow.transitions = [0, 1].map((index) =>
      Object.assign({}, original, {
        id: `F1.T${index + 1}`,
        guard: index < fallbackCount ? undefined : index === 0 ? "Approved" : "Not approved",
      }),
    );

    const findings = validateSpecEstate(estate).findings.filter(
      (finding) => finding.code === "flow.transition.guard.missing",
    );
    expect(findings).toHaveLength(ambiguous ? 1 : 0);
    if (ambiguous) expect(findings[0]).toMatchObject({ severity: "error" });
  });

  it("builds deterministic relationships and backlinks for valid local spec links", async () => {
    const { loadSpecEstate } = await import("./estate");
    const fixtureRoot = new URL("../../test/fixtures/spec-estate/", import.meta.url).pathname;
    const estate = await loadSpecEstate(fixtureRoot);

    expect(estate.relationships).toEqual([
      expect.objectContaining({
        sourceId: "billing-invoices-invoice-delivery",
        targetId: "support-cases-case-routing",
        label: "Case routing",
      }),
    ]);
    expect(estate.specs[1]?.backlinks).toHaveLength(1);
    expect(estate.findings.map((finding) => finding.code)).not.toContain(
      "flow.diagram.out-of-date",
    );
  });

  it("reports model, link, blocker, table, flow coverage, and parity failures", () => {
    const estate = validateSpecEstate(invalidEstate());
    const codes = new Set(estate.findings.map((finding) => finding.code));

    for (const code of [
      "behaviour.key.duplicate",
      "behaviour.partial-note.missing",
      "decision-table.separator.invalid",
      "flow.coverage.unknown-behaviour",
      "flow.diagram.out-of-date",
      "link.path.outside-root",
      "link.scheme.unsupported",
      "link.target.missing",
      "question.blocker.unknown-behaviour",
      "spec.id.duplicate",
      "spec.status.rollup-mismatch",
    ]) {
      expect(codes, `missing ${code}`).toContain(code);
    }
    expect(estate.findings.every((finding) => finding.id && finding.hint)).toBe(true);
  });

  it("gives unchanged invalid content stable finding identities", () => {
    const first = validateSpecEstate(invalidEstate()).findings.map((finding) => finding.id);
    const second = validateSpecEstate(invalidEstate()).findings.map((finding) => finding.id);

    expect(second).toEqual(first);
  });

  it("keeps User Flows optional for an otherwise canonical spec", () => {
    const withoutFlowSection = source(
      "### B1 — Valid 🟢 implemented\n\nThe behaviour works.",
    ).replace(/\n## User Flows\n[\s\S]*?(?=\n## Open Questions)/u, "");
    const spec = parseSpecDocument({ path: "module/optional-flow.md", source: withoutFlowSection });
    const estate = validateSpecEstate({
      root: "/fixture",
      specsRoot: "specs",
      specs: [spec],
      relationships: [],
      findings: [],
    });

    expect(estate.findings.map((finding) => finding.message)).not.toContain(
      "Required section User Flows is missing.",
    );
  });
});
