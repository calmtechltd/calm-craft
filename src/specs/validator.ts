import { createHash } from "node:crypto";
import { basename, isAbsolute, posix } from "node:path";

import { findingAt, sortFindings } from "./findings";
import { renderFlowMermaid } from "./flow-mermaid";
import type {
  Behaviour,
  SpecDocument,
  SpecEstate,
  SpecFinding,
  SpecRelationship,
  SpecStatus,
} from "./model";
import { resolveSpecSiblingPath } from "./parser";

const REQUIRED_SECTIONS = [
  "Behaviours",
  "Rules (Invariants)",
  "Decision Tables",
  "User Flows",
  "Open Questions",
  "Future Considerations",
  "Out of Scope",
] as const;
const SAFE_EXTERNAL_SCHEMES = new Set(["https", "mailto"]);

function relationshipId(sourceId: string, targetId: string, label: string): string {
  const identity = [sourceId, targetId, label].join("\u0000");
  return `relationship:${createHash("sha256").update(identity).digest("hex").slice(0, 16)}`;
}

function addFinding(
  spec: SpecDocument,
  input: Omit<SpecFinding, "id" | "path"> & { path?: string },
): void {
  spec.findings.push(
    findingAt(
      input.path ?? spec.path,
      input.code,
      input.severity,
      input.message,
      input.location,
      input.hint,
    ),
  );
}

function rollupStatus(behaviours: Behaviour[]): SpecStatus | undefined {
  if (behaviours.length === 0) return undefined;
  if (behaviours.every((behaviour) => behaviour.status === "implemented")) return "implemented";
  if (behaviours.every((behaviour) => behaviour.status === "future")) return "future";
  return "partial";
}

function validateSpec(spec: SpecDocument): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(spec.id)) {
    addFinding(spec, {
      code: "spec.id.invalid",
      severity: "error",
      message: `Spec id ${spec.id} is not a stable kebab-case identifier.`,
      hint: "Use lowercase letters, numbers, and single hyphens.",
    });
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!spec.sectionNames.includes(section)) {
      addFinding(spec, {
        code: "spec.section.missing",
        severity: "error",
        message: `Required section ${section} is missing.`,
        hint: `Add a \`## ${section}\` section in the canonical order.`,
      });
    }
  }

  const seenBehaviourKeys = new Set<string>();
  for (const behaviour of spec.behaviours) {
    if (seenBehaviourKeys.has(behaviour.key)) {
      addFinding(spec, {
        code: "behaviour.key.duplicate",
        severity: "error",
        message: `Behaviour key ${behaviour.key} is repeated.`,
        location: behaviour.location,
        hint: "Give the new behaviour the next unused key; do not renumber existing behaviours.",
      });
    }
    seenBehaviourKeys.add(behaviour.key);

    if (behaviour.status === "partial" && !behaviour.partialNote) {
      addFinding(spec, {
        code: "behaviour.partial-note.missing",
        severity: "error",
        message: `${behaviour.key} is partial but does not explain what remains.`,
        location: behaviour.location,
        hint: "Add a blockquote immediately below the heading that states the missing behaviour.",
      });
    }
    if (behaviour.status !== "partial" && behaviour.partialNote) {
      addFinding(spec, {
        code: "behaviour.partial-note.unexpected",
        severity: "warning",
        message: `${behaviour.key} has a partial note but its status is ${behaviour.status}.`,
        location: behaviour.location,
        hint: "Remove the note or mark the behaviour partial when work remains.",
      });
    }
  }

  const rolledUpStatus = rollupStatus(spec.behaviours);
  if (rolledUpStatus && rolledUpStatus !== spec.status) {
    addFinding(spec, {
      code: "spec.status.rollup-mismatch",
      severity: "error",
      message: `Spec status is ${spec.status}, but its behaviour statuses roll up to ${rolledUpStatus}.`,
      hint: `Set frontmatter status to ${rolledUpStatus} without changing behaviour statuses.`,
    });
  }

  for (const question of spec.openQuestions) {
    for (const blocker of question.blocks) {
      if (!seenBehaviourKeys.has(blocker)) {
        addFinding(spec, {
          code: "question.blocker.unknown-behaviour",
          severity: "error",
          message: `Open question blocks unknown behaviour ${blocker}.`,
          location: question.location,
          hint: "Reference an existing behaviour key or remove the Blocks marker.",
        });
      }
    }
  }

  const seenFlowReferences = new Set<string>();
  for (const reference of spec.flowReferences) {
    if (seenFlowReferences.has(reference.id)) {
      addFinding(spec, {
        code: "flow.reference.duplicate",
        severity: "error",
        message: `Flow reference ${reference.id} is repeated.`,
        location: reference.location,
        hint: "Use each stable flow ID once in the User Flows section.",
      });
    }
    seenFlowReferences.add(reference.id);
  }

  for (const parsedFlow of spec.flows) {
    const expectedDiagram = renderFlowMermaid(parsedFlow.contract, basename(parsedFlow.path));
    if (parsedFlow.diagramSource === undefined) {
      addFinding(spec, {
        code: "flow.diagram.missing",
        severity: "error",
        path: parsedFlow.diagramPath,
        message: "The generated Mermaid diagram is missing.",
        hint: "Regenerate the Mermaid diagram from its authoritative flow YAML.",
      });
    } else if (parsedFlow.diagramSource !== expectedDiagram) {
      addFinding(spec, {
        code: "flow.diagram.out-of-date",
        severity: "error",
        path: parsedFlow.diagramPath,
        message: "The Mermaid diagram does not match its authoritative flow YAML.",
        hint: "Regenerate the entire Mermaid file from the sibling YAML contract.",
      });
    }

    const matchingReferences = spec.flowReferences.filter(
      (reference) => resolveSpecSiblingPath(spec.path, reference.contractPath) === parsedFlow.path,
    );
    const contractFlowIds = new Set(parsedFlow.contract.flows.map((flow) => flow.id));
    for (const reference of matchingReferences) {
      if (!contractFlowIds.has(reference.id)) {
        addFinding(spec, {
          code: "flow.reference.missing-contract-flow",
          severity: "error",
          path: parsedFlow.path,
          message: `Flow reference ${reference.id} has no matching flow in the contract.`,
          location: reference.location,
          hint: "Align the stable flow ID in the spec and authoritative YAML contract.",
        });
      }
    }

    for (const flow of parsedFlow.contract.flows) {
      const reference = matchingReferences.find((candidate) => candidate.id === flow.id);
      if (!reference) {
        addFinding(spec, {
          code: "flow.contract.unreferenced",
          severity: "warning",
          path: parsedFlow.path,
          message: `Flow ${flow.id} is not referenced by the spec.`,
          hint: "Add the flow to the User Flows section or remove it from the contract.",
        });
      }

      const eventGroups = new Map<string, typeof flow.transitions>();
      for (const transition of flow.transitions) {
        for (const behaviourKey of transition.covers) {
          if (!seenBehaviourKeys.has(behaviourKey)) {
            addFinding(spec, {
              code: "flow.coverage.unknown-behaviour",
              severity: "error",
              path: parsedFlow.path,
              message: `${transition.id} covers unknown behaviour ${behaviourKey}.`,
              hint: "Reference an existing behaviour key from the owning spec.",
            });
          }
        }
        const groupKey = `${transition.from}\u0000${transition.event}`;
        eventGroups.set(groupKey, [...(eventGroups.get(groupKey) ?? []), transition]);
      }
      for (const transitions of eventGroups.values()) {
        if (transitions.length > 1 && transitions.some((transition) => !transition.guard)) {
          addFinding(spec, {
            code: "flow.transition.guard.missing",
            severity: "error",
            path: parsedFlow.path,
            message: `Transitions for ${transitions[0]?.event ?? "the same event"} are not fully guarded.`,
            hint: "Give every same-event branch an explicit, mutually exclusive guard.",
          });
        }
      }
    }
  }
}

function buildRelationships(estate: SpecEstate): SpecRelationship[] {
  const byPath = new Map(estate.specs.map((spec) => [spec.path, spec]));
  const relationships: SpecRelationship[] = [];

  for (const spec of estate.specs) {
    for (const link of spec.links) {
      const target = link.target.trim();
      const scheme = target.match(/^([a-z][a-z0-9+.-]*):/iu)?.[1]?.toLocaleLowerCase();
      if (scheme) {
        if (!SAFE_EXTERNAL_SCHEMES.has(scheme)) {
          addFinding(spec, {
            code: "link.scheme.unsupported",
            severity: "error",
            message: `Link uses unsupported ${scheme}: scheme.`,
            location: link.location,
            hint: "Use a relative spec link, https URL, or mailto URL.",
          });
        }
        continue;
      }
      if (target.startsWith("//")) {
        addFinding(spec, {
          code: "link.scheme.unsupported",
          severity: "error",
          message: "Protocol-relative links are not supported.",
          location: link.location,
          hint: "Use an explicit https URL or a relative spec link.",
        });
        continue;
      }

      const pathPart = target.split(/[?#]/u, 1)[0] ?? "";
      if (!pathPart || !pathPart.endsWith(".md") || pathPart.endsWith(".flow.mmd")) continue;
      if (isAbsolute(pathPart)) {
        addFinding(spec, {
          code: "link.path.outside-root",
          severity: "error",
          message: `Spec link is absolute: ${target}`,
          location: link.location,
          hint: "Use a relative path to another spec beneath the specs root.",
        });
        continue;
      }
      const targetPath = posix.normalize(posix.join(posix.dirname(spec.path), pathPart));
      if (targetPath === ".." || targetPath.startsWith("../")) {
        addFinding(spec, {
          code: "link.path.outside-root",
          severity: "error",
          message: `Spec link escapes the specs root: ${target}`,
          location: link.location,
          hint: "Link only to specs beneath the configured specs root.",
        });
        continue;
      }
      const targetSpec = byPath.get(targetPath);
      if (!targetSpec) {
        addFinding(spec, {
          code: "link.target.missing",
          severity: "error",
          message: `Linked spec does not exist: ${target}`,
          location: link.location,
          hint: "Correct the relative path or remove the stale relationship.",
        });
        continue;
      }
      relationships.push({
        id: relationshipId(spec.id, targetSpec.id, link.label),
        sourceId: spec.id,
        sourcePath: spec.path,
        targetId: targetSpec.id,
        targetPath: targetSpec.path,
        label: link.label,
        location: link.location,
      });
    }
  }

  return relationships.toSorted(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId) ||
      left.targetId.localeCompare(right.targetId) ||
      left.label.localeCompare(right.label),
  );
}

export function validateSpecEstate(estate: SpecEstate): SpecEstate {
  for (const spec of estate.specs) validateSpec(spec);

  const specsById = new Map<string, SpecDocument[]>();
  for (const spec of estate.specs) {
    specsById.set(spec.id, [...(specsById.get(spec.id) ?? []), spec]);
  }
  for (const [id, specs] of specsById) {
    if (specs.length < 2) continue;
    for (const spec of specs) {
      addFinding(spec, {
        code: "spec.id.duplicate",
        severity: "error",
        message: `Spec id ${id} is also used by another file.`,
        hint: "Give every spec a unique stable id without changing established IDs unnecessarily.",
      });
    }
  }

  const relationships = buildRelationships(estate);
  for (const spec of estate.specs) {
    spec.forwardLinks = relationships.filter((relationship) => relationship.sourceId === spec.id);
    spec.backlinks = relationships.filter((relationship) => relationship.targetId === spec.id);
    spec.findings = sortFindings(spec.findings);
  }
  estate.relationships = relationships;
  estate.findings = sortFindings([
    ...estate.findings,
    ...estate.specs.flatMap((spec) => spec.findings),
  ]);
  return estate;
}
