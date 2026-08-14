import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseSpecDocument } from "./parser";

const FIXTURE_ROOT = resolve(import.meta.dirname, "../../test/fixtures/spec-estate/specs");

function fixture(path: string): string {
  return readFileSync(resolve(FIXTURE_ROOT, path), "utf8");
}

describe("CalmCraft spec parser", () => {
  it("parses identity, Unicode behaviour headings, suffixes, notes, tables, and questions", () => {
    const spec = parseSpecDocument({
      path: "billing/invoices/invoice-delivery.md",
      source: fixture("billing/invoices/invoice-delivery.md"),
    });

    expect(spec.id).toBe("billing-invoices-invoice-delivery");
    expect(spec.module).toBe("billing");
    expect(spec.featureArea).toBe("invoices");
    expect(spec.behaviours.map((behaviour) => behaviour.key)).toEqual(["B1", "B2a"]);
    expect(spec.behaviours[1]).toMatchObject({
      status: "partial",
      partialNote: "Retry works for a corrected address. Automatic expiry is still missing.",
    });
    expect(spec.invariants).toHaveLength(2);
    expect(spec.decisionTables[0]).toMatchObject({
      title: "Delivery outcome",
      headers: ["Address", "Provider", "Result"],
    });
    expect(spec.decisionTables[0]?.rows).toHaveLength(2);
    expect(spec.openQuestions).toEqual([
      expect.objectContaining({ resolved: false, blocks: ["B2a"] }),
      expect.objectContaining({ resolved: true, blocks: [] }),
    ]);
    expect(spec.flowReferences[0]).toMatchObject({
      id: "F1",
      contractPath: "./invoice-delivery.flow.yaml",
      diagramPath: "./invoice-delivery.flow.mmd",
    });
  });

  it("reports a malformed heading and keeps later canonical behaviour", () => {
    const spec = parseSpecDocument({
      path: "support/cases/case-routing.md",
      source: fixture("support/cases/case-routing.md"),
    });

    expect(spec.behaviours.map((behaviour) => behaviour.key)).toEqual(["B1", "B3"]);
    expect(spec.findings).toContainEqual(
      expect.objectContaining({
        code: "behaviour.heading.invalid",
        path: "support/cases/case-routing.md",
      }),
    );
  });

  it("uses path identity and findings when frontmatter is missing", () => {
    const spec = parseSpecDocument({
      path: "demo/example.md",
      source: "# Example\n\n## Behaviours\n\n_None._\n",
    });

    expect(spec.id).toBe("demo-example");
    expect(spec.title).toBe("Example");
    expect(spec.findings.map((item) => item.code)).toEqual([
      "frontmatter.missing",
      "frontmatter.id.missing",
      "frontmatter.area.missing",
      "frontmatter.status.missing",
    ]);
  });
});
