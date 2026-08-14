import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverSpecFiles } from "./discovery";
import { loadSpecEstate } from "./estate";

const FIXTURE_ROOT = resolve(import.meta.dirname, "../../test/fixtures/spec-estate");

describe("CalmCraft spec estate", () => {
  it("discovers only spec Markdown in deterministic order", async () => {
    const paths = await discoverSpecFiles(resolve(FIXTURE_ROOT, "specs"));

    expect(paths).toEqual([
      "billing/invoices/invoice-delivery.md",
      "support/cases/case-routing.md",
    ]);
  });

  it("loads healthy specs and authoritative flow YAML around a malformed file", async () => {
    const estate = await loadSpecEstate(FIXTURE_ROOT);

    expect(estate.specs.map((spec) => spec.id)).toEqual([
      "billing-invoices-invoice-delivery",
      "support-cases-case-routing",
    ]);
    expect(estate.specs[0]?.flows[0]?.contract.flows[0]?.transitions).toHaveLength(2);
    expect(estate.specs[0]?.flows[0]?.diagramSource).toContain("flowchart TD");
    expect(estate.relationships).toHaveLength(1);
    expect(estate.findings).toContainEqual(
      expect.objectContaining({ code: "behaviour.heading.invalid" }),
    );
  });
});
