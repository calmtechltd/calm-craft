import { describe, expect, it } from "vitest";

import { parseFlowContract, renderFlowMermaid } from "./flow-mermaid";

const contractSource = `
version: 1
flows:
  - id: F1
    name: Example
    start: ready
    states:
      - id: ready
        kind: screen
        label: Ready
      - id: complete
        kind: terminal
        label: Complete
        outcome: The user sees completion.
    transitions:
      - id: F1.T1
        from: ready
        event: Continue
        to: complete
        covers: [B1]
`;

describe("flow Mermaid generation", () => {
  it("renders every declared state and transition with a generated warning", () => {
    const contract = parseFlowContract(contractSource);
    const output = renderFlowMermaid(contract, "example.flow.yaml");

    expect(output).toContain("%% Generated from example.flow.yaml. Do not edit directly.");
    expect(output).toContain('F1_ready["Ready"]');
    expect(output).toContain('F1_complete(["Complete"])');
    expect(output).toContain('F1_ready -->|"F1.T1: Continue"| F1_complete');
  });

  it("rejects a non-terminal state without an outgoing transition", () => {
    const invalidSource = contractSource.replace(
      /    transitions:[\s\S]*$/,
      "    transitions: []\n",
    );

    expect(() => parseFlowContract(invalidSource)).toThrow("F1.ready has no outgoing transition");
  });
});
