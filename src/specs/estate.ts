import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { discoverSpecFiles, isSpecMarkdownPath } from "./discovery";
import { findingAt } from "./findings";
import { parseFlowContract } from "./flow-contract";
import type { ParsedFlowContract, SpecEstate, SpecFinding } from "./model";
import { isFeatureSpecSource, parseSpecDocument, resolveSpecSiblingPath } from "./parser";
import { validateSpecEstate } from "./validator";

type SourceReader = (path: string) => Promise<string>;

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

function safeRelativePath(path: string): string | undefined {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[a-z]:\//iu.test(normalized)) return undefined;
  const parts = normalized.split("/");
  if (parts.some((part) => part === "..")) return undefined;
  return parts.filter((part) => part && part !== ".").join("/");
}

function flowFinding(path: string, code: string, message: string): SpecFinding {
  return findingAt(
    path,
    code,
    "error",
    message,
    undefined,
    "Repair the flow reference or regenerate its files from valid authoritative YAML.",
  );
}

async function buildSpecEstate(
  root: string,
  specsRoot: string,
  paths: string[],
  readSource: SourceReader,
): Promise<SpecEstate> {
  const results = await Promise.all(
    paths.toSorted().map(async (path) => {
      try {
        const source = await readSource(path);
        if (!isFeatureSpecSource(source)) return { supportingPath: path };
        const spec = parseSpecDocument({ path, source });
        await Promise.all(
          spec.flowReferences.map(async (reference) => {
            const contractPath = safeRelativePath(
              resolveSpecSiblingPath(path, reference.contractPath),
            );
            const diagramPath = safeRelativePath(
              resolveSpecSiblingPath(path, reference.diagramPath),
            );
            if (!contractPath || !diagramPath) {
              spec.findings.push(
                flowFinding(
                  path,
                  "flow.path.outside-root",
                  `Flow files escape the specs root: ${reference.contractPath} or ${reference.diagramPath}`,
                ),
              );
              return;
            }
            try {
              const flowSource = await readSource(contractPath);
              const parsedFlow: ParsedFlowContract = {
                path: contractPath,
                diagramPath,
                sourceHash: hash(flowSource),
                source: flowSource,
                contract: parseFlowContract(flowSource),
              };
              try {
                parsedFlow.diagramSource = await readSource(diagramPath);
                parsedFlow.diagramSourceHash = hash(parsedFlow.diagramSource);
              } catch {
                // The validator reports a stable missing-diagram finding with repair guidance.
              }
              spec.flows.push(parsedFlow);
            } catch (error) {
              spec.findings.push(
                flowFinding(
                  contractPath,
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
          finding: findingAt(
            path,
            "spec.file.unreadable",
            "error",
            `Spec file could not be read: ${String(error)}`,
            undefined,
            "Check the file permissions and ensure the path remains beneath the specs root.",
          ),
        };
      }
    }),
  );

  const orderedSpecs = results
    .flatMap((result) => (result.spec ? [result.spec] : []))
    .toSorted((left, right) => left.path.localeCompare(right.path));
  const estateFindings = results.flatMap((result) => (result.finding ? [result.finding] : []));
  return validateSpecEstate(
    {
      root,
      specsRoot,
      specs: orderedSpecs,
      relationships: [],
      findings: estateFindings,
    },
    {
      supportingPaths: results.flatMap((result) =>
        result.supportingPath ? [result.supportingPath] : [],
      ),
    },
  );
}

export async function loadSpecEstate(
  repositoryRoot: string,
  specsRootName = "specs",
): Promise<SpecEstate> {
  const root = resolve(repositoryRoot);
  const specsRoot = resolve(root, specsRootName);
  const paths = await discoverSpecFiles(specsRoot, { includeSupporting: true });
  return buildSpecEstate(root, specsRootName, paths, async (path) => {
    const absolutePath = safePath(specsRoot, path);
    if (!absolutePath) throw new Error(`Source path escapes the specs root: ${path}`);
    return readFile(absolutePath, "utf8");
  });
}

export async function loadSpecEstateFromSources(
  repositoryRoot: string,
  specsRootName: string,
  sources: ReadonlyMap<string, string>,
): Promise<SpecEstate> {
  const root = resolve(repositoryRoot);
  const specsRoot = resolve(root, specsRootName);
  const paths = [...sources.keys()].filter(isSpecMarkdownPath).toSorted();
  return buildSpecEstate(root, specsRoot, paths, async (path) => {
    const normalizedPath = safeRelativePath(path);
    const source = normalizedPath ? sources.get(normalizedPath) : undefined;
    if (source === undefined) throw new Error(`Source is not present in the snapshot: ${path}`);
    return source;
  });
}
