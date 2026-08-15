import { describe, expect, it } from "vitest";

import { parseFlowContract } from "../specs/flow-contract";
import { renderFlowMermaid } from "../specs/flow-mermaid";
import { loadSpecEstateFromSources } from "../specs/estate";
import { compareEstates } from "./compare";

function flowYaml(guard: string): string {
  return `version: 1
flows:
  - id: F1
    name: Review Flow
    start: ready
    states:
      - id: ready
        kind: screen
        label: Ready
      - id: done
        kind: terminal
        label: Done
        outcome: The review is complete.
    transitions:
      - id: F1.T1
        from: ready
        event: Continue
        to: done
        guard: ${guard}
        covers: [B1]
`;
}

function featureSpec(status: "future" | "implemented", related: boolean, settled: boolean): string {
  const symbol = status === "implemented" ? "🟢" : "🔵";
  const relationship = related ? " [Related feature](./related.md)" : "";
  return `---
id: fixture-feature
area: Fixture
status: ${status}
---

# Feature

The feature explains a review.${relationship}

## Behaviours

### B1 — Review the change ${symbol} ${status}

The reviewer sees the change.

## Rules (Invariants)

- Review evidence remains available.

## Decision Tables

| Input | Result |
| ----- | ------ |
| Ready | Review |

## User Flows

- **F1 — Review Flow:** [contract](./feature.flow.yaml) · [diagram](./feature.flow.mmd) — covers B1

## Open Questions

- ${settled ? "**Settled:** " : ""}Which review evidence is required?

## Future Considerations

_None._

## Out of Scope

_None._
`;
}

function relatedSpec(): string {
  return `---
id: fixture-related
area: Fixture
status: implemented
---

# Related

The related feature remains stable.

## Behaviours

### B1 — Stay related 🟢 implemented

The relationship has a target.

## Rules (Invariants)

_None._

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
}

async function estate(
  status: "future" | "implemented",
  related: boolean,
  settled: boolean,
  guard: string,
) {
  const yaml = flowYaml(guard);
  return loadSpecEstateFromSources(
    "/fixture",
    "specs",
    new Map([
      ["product/feature.md", featureSpec(status, related, settled)],
      ["product/related.md", relatedSpec()],
      ["product/feature.flow.yaml", yaml],
      ["product/feature.flow.mmd", renderFlowMermaid(parseFlowContract(yaml), "feature.flow.yaml")],
    ]),
  );
}

describe("semantic estate comparison", () => {
  it("compares status, relationships, question resolution, and flow guards with source evidence", async () => {
    const before = await estate("future", false, false, "The review is requested.");
    const after = await estate("implemented", true, true, "The review is approved.");

    const changes = compareEstates(before, after, "committed");
    const kinds = new Set(changes.map((change) => change.kind));

    expect(kinds).toContain("behaviour.status-changed");
    expect(kinds).toContain("spec.metadata-changed");
    expect(kinds).toContain("relationship.added");
    expect(kinds).toContain("question.resolved");
    expect(kinds).toContain("flow.transition.guard-changed");
    expect(
      changes.every(
        (change) =>
          (change.evidence.beforePath || change.evidence.afterPath) &&
          (change.evidence.beforeSource || change.evidence.afterSource),
      ),
    ).toBe(true);
  });

  it("keeps add and remove evidence when suggesting an inferred rename", async () => {
    const original = await estate("implemented", false, true, "The review is approved.");
    const renamedSources = new Map<string, string>();
    for (const spec of original.specs) {
      renamedSources.set(
        spec.path.replace("feature.md", "renamed.md"),
        spec.source.replace("id: fixture-feature", "id: fixture-renamed"),
      );
    }
    const renamed = await loadSpecEstateFromSources("/fixture", "specs", renamedSources);

    const changes = compareEstates(original, renamed, "committed");

    expect(changes.map((change) => change.kind)).toContain("spec.removed");
    expect(changes.map((change) => change.kind)).toContain("spec.added");
    expect(changes).toContainEqual(
      expect.objectContaining({ kind: "spec.rename-suggested", inferred: true }),
    );
  });

  it("orders identical comparisons deterministically", async () => {
    const before = await estate("future", false, false, "The review is requested.");
    const after = await estate("implemented", true, true, "The review is approved.");

    expect(compareEstates(before, after, "staged")).toEqual(
      compareEstates(before, after, "staged"),
    );
  });
});
