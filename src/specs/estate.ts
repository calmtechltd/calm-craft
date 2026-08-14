import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { discoverSpecFiles } from "./discovery";
import { parseFlowContract } from "./flow-contract";
import type { ParsedFlowContract, SpecEstate, SpecFinding } from "./model";
import { parseSpecDocument, resolveSpecSiblingPath } from "./parser";

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safePath(root: string, relativePath: string): string | undefined {
  if (isAbsolute(relativePath)) return undefined;
  const resolvedRoot = resolve(root);
  const candidate = resolve(root, relativePath);
  const fromRoot = relative(resolvedRoot, candidate);
  if (
    fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot))
  ) {
    return candidate;
  }
  return undefined;
}

function flowFinding(path: string, code: string, message: string): SpecFinding {
  return { code, severity: "error", path, message };
}

export async function loadSpecEstate(
  repositoryRoot: string,
  specsRootName = "specs",
): Promise<SpecEstate> {
  const root = resolve(repositoryRoot);
  const specsRoot = resolve(root, specsRootName);
  const paths = await discoverSpecFiles(specsRoot);
  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        const source = await readFile(join(specsRoot, path), "utf8");
        const spec = parseSpecDocument({ path, source });
        await Promise.all(
          spec.flowReferences.map(async (reference) => {
            const contractPath = resolveSpecSiblingPath(path, reference.contractPath);
            const diagramPath = resolveSpecSiblingPath(path, reference.diagramPath);
            const absoluteContractPath = safePath(specsRoot, contractPath);
            if (!absoluteContractPath) {
              spec.findings.push(
                flowFinding(
                  path,
                  "flow.path.outside-root",
                  `Flow contract escapes the specs root: ${reference.contractPath}`,
                ),
              );
              return;
            }
            try {
              const flowSource = await readFile(absoluteContractPath, "utf8");
              const parsedFlow: ParsedFlowContract = {
                path: toPosixPath(contractPath),
                diagramPath: toPosixPath(diagramPath),
                sourceHash: hash(flowSource),
                contract: parseFlowContract(flowSource),
              };
              spec.flows.push(parsedFlow);
            } catch (error) {
              spec.findings.push(
                flowFinding(
                  toPosixPath(contractPath),
                  "flow.contract.invalid",
                  `Flow contract could not be loaded: ${String(error)}`,
                ),
              );
            }
          }),
        );
        return { spec };
      } catch (error) {
        return {
          finding: {
            code: "spec.file.unreadable",
            severity: "error",
            path,
            message: `Spec file could not be read: ${String(error)}`,
          } satisfies SpecFinding,
        };
      }
    }),
  );

  const orderedSpecs = results
    .flatMap((result) => (result.spec ? [result.spec] : []))
    .toSorted((left, right) => left.path.localeCompare(right.path));
  const estateFindings = results.flatMap((result) => (result.finding ? [result.finding] : []));
  return {
    root,
    specsRoot,
    specs: orderedSpecs,
    findings: [...estateFindings, ...orderedSpecs.flatMap((spec) => spec.findings)],
  };
}
