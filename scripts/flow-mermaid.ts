import { parseFlowContract } from "../src/specs/flow-contract";
import type { FlowContract } from "../src/specs/model";

export { parseFlowContract };

function escapeLabel(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("\n", " ");
}

export function renderFlowMermaid(contract: FlowContract, sourceName: string): string {
  const lines = [`%% Generated from ${sourceName}. Do not edit directly.`, "flowchart TD"];
  for (const flow of contract.flows) {
    lines.push(`  subgraph ${flow.id}["${escapeLabel(`${flow.id}: ${flow.name}`)}"]`);
    for (const state of flow.states) {
      const nodeId = `${flow.id}_${state.id}`;
      const label = escapeLabel(state.label);
      if (state.kind === "terminal") lines.push(`    ${nodeId}(["${label}"])`);
      else if (state.kind === "action") lines.push(`    ${nodeId}{{"${label}"}}`);
      else lines.push(`    ${nodeId}["${label}"]`);
    }
    for (const transition of flow.transitions) {
      const detail = transition.guard
        ? `${transition.id}: ${transition.event} [${transition.guard}]`
        : `${transition.id}: ${transition.event}`;
      lines.push(
        `    ${flow.id}_${transition.from} -->|"${escapeLabel(detail)}"| ${flow.id}_${transition.to}`,
      );
    }
    lines.push("  end");
  }
  return `${lines.join("\n")}\n`;
}
