import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseFlowContract, renderFlowMermaid } from "./flow-mermaid";

const ROOT = resolve(import.meta.dirname, "..");
const SPECS_ROOT = join(ROOT, "specs", "calmcraft");
const REQUIRED_SECTIONS = [
  "## Behaviours",
  "## Rules (Invariants)",
  "## Decision Tables",
  "## User Flows",
  "## Open Questions",
  "## Future Considerations",
  "## Out of Scope",
] as const;
const EXPECTED_SPECS = [
  "branch-review.md",
  "cli-distribution.md",
  "local-session-security.md",
  "repository-sources.md",
  "spec-model.md",
  "visualizer-ui.md",
];

function readSpec(name: string): string {
  return readFileSync(join(SPECS_ROOT, name), "utf8");
}

describe("CalmCraft v1 product contracts", () => {
  it("contains the six scoped specs", () => {
    const names = readdirSync(SPECS_ROOT)
      .filter((name) => name.endsWith(".md") && !name.endsWith(".flow.mmd"))
      .toSorted();

    expect(names).toEqual(EXPECTED_SPECS);
    for (const name of names) {
      const source = readSpec(name);
      expect(source).toMatch(
        /^---\nid: calmcraft-[a-z-]+\narea: CalmCraft\nstatus: (implemented|partial|future)\n---\n/,
      );
      expect(source).not.toMatch(/^ticket:/m);

      let previousIndex = -1;
      for (const section of REQUIRED_SECTIONS) {
        const index = source.indexOf(section);
        expect(index, `${name} must contain ${section}`).toBeGreaterThan(previousIndex);
        previousIndex = index;
      }

      const behaviourHeadings = source.match(/^### B\d+[a-z]? .+$/gmu) ?? [];
      const validBehaviourHeadings =
        source.match(/^### B\d+[a-z]? .+ (🟢 implemented|🟡 partial|🔵 future)$/gmu) ?? [];
      expect(behaviourHeadings.length, `${name} must contain behaviours`).toBeGreaterThan(0);
      expect(validBehaviourHeadings).toHaveLength(behaviourHeadings.length);
    }
  });

  it("keeps the generated repository flow equal to its YAML authority", () => {
    const yamlPath = join(SPECS_ROOT, "repository-sources.flow.yaml");
    const yamlSource = readFileSync(yamlPath, "utf8");
    const contract = parseFlowContract(yamlSource);
    const expected = renderFlowMermaid(contract, basename(yamlPath));
    const generated = readFileSync(join(SPECS_ROOT, "repository-sources.flow.mmd"), "utf8");

    expect(generated).toBe(expected);

    const specSource = readSpec("repository-sources.md");
    const behaviourIds = new Set(
      Array.from(specSource.matchAll(/^### (B\d+[a-z]?) /gmu), (match) => match[1]),
    );
    for (const flow of contract.flows) {
      for (const transition of flow.transitions) {
        for (const behaviourId of transition.covers) {
          expect(behaviourIds, `${transition.id} covers missing ${behaviourId}`).toContain(
            behaviourId,
          );
        }
      }
    }
  });

  it("links each scoped spec from the estate guide", () => {
    const guide = readFileSync(join(ROOT, "specs", "README.md"), "utf8");
    for (const name of EXPECTED_SPECS) {
      expect(guide).toContain(`./calmcraft/${name}`);
    }
  });
});
