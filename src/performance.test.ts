import { describe, expect, it } from "vitest";

import { compareEstates } from "./diff/compare";
import { loadSpecEstateFromSources } from "./specs/estate";

function generatedSpec(index: number, changed = false): string {
  return `---
id: performance-feature-${index}
area: Performance
status: implemented
---

# Performance Feature ${index}

Generated public performance intent ${index}.

## Behaviours

### B1 — Explain feature ${index} 🟢 implemented

The fixture ${changed ? "quickly explains changed" : "explains stable"} product intent ${index}.

## Rules (Invariants)

- Measurement input remains deterministic.

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

function generatedSources(changed = false): Map<string, string> {
  return new Map(
    Array.from({ length: 300 }, (_, index) => [
      `module-${index % 6}/area-${index % 12}/feature-${index}.md`,
      generatedSpec(index, changed),
    ]),
  );
}

describe("product performance budgets", () => {
  it("parses and indexes 300 specs within two seconds", async () => {
    const started = performance.now();
    const estate = await loadSpecEstateFromSources(
      "/fixture/performance",
      "specs",
      generatedSources(),
    );
    const duration = performance.now() - started;

    expect(estate.specs).toHaveLength(300);
    expect(duration).toBeLessThan(2_000);
  });

  it("produces a 300-spec semantic diff within three seconds", async () => {
    const [before, after] = await Promise.all([
      loadSpecEstateFromSources("/fixture/performance", "specs", generatedSources()),
      loadSpecEstateFromSources("/fixture/performance", "specs", generatedSources(true)),
    ]);
    const started = performance.now();
    const changes = compareEstates(before, after, "committed");
    const duration = performance.now() - started;

    expect(changes.filter((change) => change.kind === "behaviour.content-changed")).toHaveLength(
      300,
    );
    expect(duration).toBeLessThan(3_000);
  });
});
