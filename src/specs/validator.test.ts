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

A test spec with [missing](./missing.md), [escape](../../outside.md), and [unsafe](javascript:alert(1)).

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
    specsRoot: "/fixture/specs",
    specs: [first, second],
    relationships: [],
    findings: [],
  };
}

describe("spec estate validation", () => {
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
});
