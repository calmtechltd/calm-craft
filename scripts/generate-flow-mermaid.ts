import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { parseFlowContract, renderFlowMermaid } from "./flow-mermaid";

const inputArgument = process.argv[2];
if (!inputArgument?.endsWith(".flow.yaml")) {
  throw new Error("Usage: generate-flow-mermaid <path.flow.yaml>");
}

const inputPath = resolve(inputArgument);
const outputPath = inputPath.replace(/\.flow\.yaml$/, ".flow.mmd");
const source = readFileSync(inputPath, "utf8");
const contract = parseFlowContract(source);
const output = renderFlowMermaid(contract, basename(inputPath));

writeFileSync(outputPath, output, "utf8");
process.stdout.write(`Generated ${outputPath}\n`);
