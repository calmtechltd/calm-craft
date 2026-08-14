import { createHash } from "node:crypto";

import type {
  DecisionRow,
  Flow,
  Invariant,
  OpenQuestion,
  ParsedFlowContract,
  SpecDocument,
  SpecEstate,
  SpecFinding,
  SpecRelationship,
} from "../specs/model";
import type { ChangeEvidence, Provenance, SemanticChange } from "./model";

type AddChangeInput = Omit<SemanticChange, "id" | "provenance">;

function changeId(provenance: Provenance, input: AddChangeInput): string {
  const identity = JSON.stringify([
    provenance,
    input.kind,
    input.specId,
    input.elementId,
    input.before,
    input.after,
  ]);
  return `change:${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}

function evidence(
  before: SpecDocument | undefined,
  after: SpecDocument | undefined,
  locations: Pick<ChangeEvidence, "beforeLocation" | "afterLocation"> = {},
): ChangeEvidence {
  return {
    beforePath: before?.path,
    afterPath: after?.path,
    beforeSource: before?.source,
    afterSource: after?.source,
    ...locations,
  };
}

function addChange(changes: SemanticChange[], provenance: Provenance, input: AddChangeInput): void {
  changes.push({ id: changeId(provenance, input), provenance, ...input });
}

function normalizedWords(value: string): Set<string> {
  return new Set(value.toLocaleLowerCase().match(/[a-z0-9]+/gu) ?? []);
}

function similarity(left: string, right: string): number {
  const leftWords = normalizedWords(left);
  const rightWords = normalizedWords(right);
  const union = new Set([...leftWords, ...rightWords]);
  if (union.size === 0) return 0;
  let intersection = 0;
  for (const word of leftWords) if (rightWords.has(word)) intersection += 1;
  return intersection / union.size;
}

function compareBehaviours(
  beforeSpec: SpecDocument,
  afterSpec: SpecDocument,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const beforeByKey = new Map(beforeSpec.behaviours.map((item) => [item.key, item]));
  const afterByKey = new Map(afterSpec.behaviours.map((item) => [item.key, item]));
  for (const key of new Set([...beforeByKey.keys(), ...afterByKey.keys()])) {
    const before = beforeByKey.get(key);
    const after = afterByKey.get(key);
    const itemEvidence = evidence(beforeSpec, afterSpec, {
      beforeLocation: before?.location,
      afterLocation: after?.location,
    });
    if (!before && after) {
      addChange(changes, provenance, {
        kind: "behaviour.added",
        specId: afterSpec.id,
        elementId: key,
        after,
        evidence: itemEvidence,
      });
      continue;
    }
    if (before && !after) {
      addChange(changes, provenance, {
        kind: "behaviour.removed",
        specId: beforeSpec.id,
        elementId: key,
        before,
        evidence: itemEvidence,
      });
      continue;
    }
    if (!before || !after) continue;
    if (before.title !== after.title) {
      addChange(changes, provenance, {
        kind: "behaviour.renamed",
        specId: afterSpec.id,
        elementId: key,
        before: before.title,
        after: after.title,
        evidence: itemEvidence,
      });
    }
    if (before.status !== after.status) {
      addChange(changes, provenance, {
        kind: "behaviour.status-changed",
        specId: afterSpec.id,
        elementId: key,
        before: before.status,
        after: after.status,
        evidence: itemEvidence,
      });
    }
    if (before.markdown !== after.markdown || before.partialNote !== after.partialNote) {
      addChange(changes, provenance, {
        kind: "behaviour.content-changed",
        specId: afterSpec.id,
        elementId: key,
        before: { markdown: before.markdown, partialNote: before.partialNote },
        after: { markdown: after.markdown, partialNote: after.partialNote },
        evidence: itemEvidence,
      });
    }
  }
}

function compareOrderedFingerprints<T extends Invariant | DecisionRow>(
  beforeSpec: SpecDocument,
  afterSpec: SpecDocument,
  beforeItems: T[],
  afterItems: T[],
  kind: "invariant" | "decision-row",
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const remainingAfter = [...afterItems];
  const unmatchedBefore = beforeItems.filter((before) => {
    const matchIndex = remainingAfter.findIndex(
      (after) => after.fingerprint === before.fingerprint,
    );
    if (matchIndex < 0) return true;
    remainingAfter.splice(matchIndex, 1);
    return false;
  });
  const length = Math.max(unmatchedBefore.length, remainingAfter.length);
  for (let index = 0; index < length; index += 1) {
    const before = unmatchedBefore[index];
    const after = remainingAfter[index];
    const itemEvidence = evidence(beforeSpec, afterSpec, {
      beforeLocation: before?.location,
      afterLocation: after?.location,
    });
    const elementId = `${kind}:${index + 1}`;
    if (!before && after) {
      addChange(changes, provenance, {
        kind: `${kind}.added`,
        specId: afterSpec.id,
        elementId,
        after,
        evidence: itemEvidence,
      });
    } else if (before && !after) {
      addChange(changes, provenance, {
        kind: `${kind}.removed`,
        specId: beforeSpec.id,
        elementId,
        before,
        evidence: itemEvidence,
      });
    } else if (before && after) {
      addChange(changes, provenance, {
        kind: `${kind}.changed`,
        specId: afterSpec.id,
        elementId,
        before,
        after,
        evidence: itemEvidence,
      });
    }
  }
}

function decisionRows(spec: SpecDocument): DecisionRow[] {
  return spec.decisionTables.flatMap((table) => table.rows);
}

function questionText(question: OpenQuestion): string {
  return question.markdown
    .replace(/^\*\*(?:Settled|Resolved|Decided|Moved|Answered):?\*\*\s*/u, "")
    .replace(/\*\*Blocks\s+B\d+[a-z]?(?:\s*,\s*B\d+[a-z]?)*\s*:?\*\*\s*/u, "")
    .trim();
}

function compareQuestions(
  beforeSpec: SpecDocument,
  afterSpec: SpecDocument,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const remainingAfter = [...afterSpec.openQuestions];
  const matched: Array<{ before?: OpenQuestion; after?: OpenQuestion }> = [];
  const unmatchedBefore: OpenQuestion[] = [];
  for (const before of beforeSpec.openQuestions) {
    const matchIndex = remainingAfter.findIndex(
      (after) => questionText(after) === questionText(before),
    );
    if (matchIndex < 0) unmatchedBefore.push(before);
    else matched.push({ before, after: remainingAfter.splice(matchIndex, 1)[0] });
  }
  const unmatchedLength = Math.max(unmatchedBefore.length, remainingAfter.length);
  for (let index = 0; index < unmatchedLength; index += 1) {
    matched.push({ before: unmatchedBefore[index], after: remainingAfter[index] });
  }

  for (const [index, pair] of matched.entries()) {
    const { before, after } = pair;
    const itemEvidence = evidence(beforeSpec, afterSpec, {
      beforeLocation: before?.location,
      afterLocation: after?.location,
    });
    const elementId = `question:${index + 1}`;
    if (!before && after) {
      addChange(changes, provenance, {
        kind: "question.added",
        specId: afterSpec.id,
        elementId,
        after,
        evidence: itemEvidence,
      });
      continue;
    }
    if (before && !after) {
      addChange(changes, provenance, {
        kind: "question.removed",
        specId: beforeSpec.id,
        elementId,
        before,
        evidence: itemEvidence,
      });
      continue;
    }
    if (!before || !after) continue;
    if (before.resolved !== after.resolved) {
      addChange(changes, provenance, {
        kind: after.resolved ? "question.resolved" : "question.reopened",
        specId: afterSpec.id,
        elementId,
        before,
        after,
        evidence: itemEvidence,
      });
    }
    if (before.blocks.join("\u0000") !== after.blocks.join("\u0000")) {
      addChange(changes, provenance, {
        kind: "question.retargeted",
        specId: afterSpec.id,
        elementId,
        before: before.blocks,
        after: after.blocks,
        evidence: itemEvidence,
      });
    }
    if (questionText(before) !== questionText(after)) {
      addChange(changes, provenance, {
        kind: "question.edited",
        specId: afterSpec.id,
        elementId,
        before: before.markdown,
        after: after.markdown,
        evidence: itemEvidence,
      });
    }
  }
}

function compareFlow(
  specId: string,
  beforeFlow: ParsedFlowContract,
  afterFlow: ParsedFlowContract,
  flow: Flow,
  afterContractFlow: Flow,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const flowEvidence = (): ChangeEvidence => ({
    beforePath: beforeFlow.path,
    afterPath: afterFlow.path,
    beforeSource: beforeFlow.source,
    afterSource: afterFlow.source,
  });
  const beforeStates = new Map(flow.states.map((state) => [state.id, state]));
  const afterStates = new Map(afterContractFlow.states.map((state) => [state.id, state]));
  for (const id of new Set([...beforeStates.keys(), ...afterStates.keys()])) {
    const before = beforeStates.get(id);
    const after = afterStates.get(id);
    if (!before || !after) {
      addChange(changes, provenance, {
        kind: before ? "flow.state.removed" : "flow.state.added",
        specId,
        elementId: `${flow.id}.${id}`,
        before,
        after,
        evidence: flowEvidence(),
      });
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      addChange(changes, provenance, {
        kind: "flow.state.changed",
        specId,
        elementId: `${flow.id}.${id}`,
        before,
        after,
        evidence: flowEvidence(),
      });
    }
  }

  const beforeTransitions = new Map(
    flow.transitions.map((transition) => [transition.id, transition]),
  );
  const afterTransitions = new Map(
    afterContractFlow.transitions.map((transition) => [transition.id, transition]),
  );
  for (const id of new Set([...beforeTransitions.keys(), ...afterTransitions.keys()])) {
    const before = beforeTransitions.get(id);
    const after = afterTransitions.get(id);
    if (!before || !after) {
      addChange(changes, provenance, {
        kind: before ? "flow.transition.removed" : "flow.transition.added",
        specId,
        elementId: id,
        before,
        after,
        evidence: flowEvidence(),
      });
      continue;
    }
    for (const [field, kind] of [
      ["event", "flow.transition.event-changed"],
      ["guard", "flow.transition.guard-changed"],
      ["to", "flow.transition.destination-changed"],
      ["outcome", "flow.transition.outcome-changed"],
    ] as const) {
      if (before[field] !== after[field]) {
        addChange(changes, provenance, {
          kind,
          specId,
          elementId: id,
          before: before[field],
          after: after[field],
          evidence: flowEvidence(),
        });
      }
    }
    if (before.covers.join("\u0000") !== after.covers.join("\u0000")) {
      addChange(changes, provenance, {
        kind: "flow.transition.coverage-changed",
        specId,
        elementId: id,
        before: before.covers,
        after: after.covers,
        evidence: flowEvidence(),
      });
    }
  }
}

function compareFlows(
  beforeSpec: SpecDocument,
  afterSpec: SpecDocument,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const beforeContracts = new Map(
    beforeSpec.flows.flatMap((parsed) =>
      parsed.contract.flows.map((flow) => [flow.id, { parsed, flow }] as const),
    ),
  );
  const afterContracts = new Map(
    afterSpec.flows.flatMap((parsed) =>
      parsed.contract.flows.map((flow) => [flow.id, { parsed, flow }] as const),
    ),
  );
  for (const id of new Set([...beforeContracts.keys(), ...afterContracts.keys()])) {
    const before = beforeContracts.get(id);
    const after = afterContracts.get(id);
    if (!before || !after) {
      addChange(changes, provenance, {
        kind: before ? "flow.removed" : "flow.added",
        specId: afterSpec.id,
        elementId: id,
        before: before?.flow,
        after: after?.flow,
        evidence: {
          beforePath: before?.parsed.path,
          afterPath: after?.parsed.path,
          beforeSource: before?.parsed.source,
          afterSource: after?.parsed.source,
        },
      });
    } else {
      compareFlow(
        afterSpec.id,
        before.parsed,
        after.parsed,
        before.flow,
        after.flow,
        provenance,
        changes,
      );
    }
  }
}

function relationshipKey(relationship: SpecRelationship): string {
  return [relationship.sourceId, relationship.targetId, relationship.label].join("\u0000");
}

function compareRelationships(
  before: SpecEstate,
  after: SpecEstate,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const beforeMap = new Map(before.relationships.map((item) => [relationshipKey(item), item]));
  const afterMap = new Map(after.relationships.map((item) => [relationshipKey(item), item]));
  const beforeSpecs = new Map(before.specs.map((spec) => [spec.id, spec]));
  const afterSpecs = new Map(after.specs.map((spec) => [spec.id, spec]));
  for (const key of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
    const beforeRelationship = beforeMap.get(key);
    const afterRelationship = afterMap.get(key);
    if (beforeRelationship && afterRelationship) continue;
    const relationship = afterRelationship ?? beforeRelationship;
    if (!relationship) continue;
    addChange(changes, provenance, {
      kind: afterRelationship ? "relationship.added" : "relationship.removed",
      specId: relationship.sourceId,
      elementId: relationship.id,
      before: beforeRelationship,
      after: afterRelationship,
      evidence: evidence(
        beforeSpecs.get(relationship.sourceId),
        afterSpecs.get(relationship.sourceId),
        {
          beforeLocation: beforeRelationship?.location,
          afterLocation: afterRelationship?.location,
        },
      ),
    });
  }
}

function findingKey(finding: SpecFinding): string {
  return finding.id;
}

function compareFindings(
  before: SpecEstate,
  after: SpecEstate,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  const beforeMap = new Map(before.findings.map((item) => [findingKey(item), item]));
  const afterMap = new Map(after.findings.map((item) => [findingKey(item), item]));
  const beforeByPath = new Map(before.specs.map((spec) => [spec.path, spec]));
  const afterByPath = new Map(after.specs.map((spec) => [spec.path, spec]));
  for (const key of new Set([...beforeMap.keys(), ...afterMap.keys()])) {
    const beforeFinding = beforeMap.get(key);
    const afterFinding = afterMap.get(key);
    if (beforeFinding && afterFinding) continue;
    const finding = afterFinding ?? beforeFinding;
    if (!finding) continue;
    const beforeSpec = beforeByPath.get(beforeFinding?.path ?? finding.path);
    const afterSpec = afterByPath.get(afterFinding?.path ?? finding.path);
    const kind = afterFinding ? "validation.introduced" : "validation.resolved";
    addChange(changes, provenance, {
      kind: afterFinding?.code === "link.target.missing" ? "relationship.broken" : kind,
      specId: afterSpec?.id ?? beforeSpec?.id ?? "estate",
      elementId: finding.id,
      before: beforeFinding,
      after: afterFinding,
      evidence: evidence(beforeSpec, afterSpec, {
        beforeLocation: beforeFinding?.location,
        afterLocation: afterFinding?.location,
      }),
    });
  }
}

function compareMatchedSpec(
  beforeSpec: SpecDocument,
  afterSpec: SpecDocument,
  provenance: Provenance,
  changes: SemanticChange[],
): void {
  if (beforeSpec.path !== afterSpec.path) {
    addChange(changes, provenance, {
      kind: "spec.moved",
      specId: afterSpec.id,
      before: beforeSpec.path,
      after: afterSpec.path,
      evidence: evidence(beforeSpec, afterSpec),
    });
  }
  if (beforeSpec.title !== afterSpec.title) {
    addChange(changes, provenance, {
      kind: "spec.renamed",
      specId: afterSpec.id,
      before: beforeSpec.title,
      after: afterSpec.title,
      evidence: evidence(beforeSpec, afterSpec),
    });
  }
  if (beforeSpec.area !== afterSpec.area || beforeSpec.status !== afterSpec.status) {
    addChange(changes, provenance, {
      kind: "spec.metadata-changed",
      specId: afterSpec.id,
      before: { area: beforeSpec.area, status: beforeSpec.status },
      after: { area: afterSpec.area, status: afterSpec.status },
      evidence: evidence(beforeSpec, afterSpec),
    });
  }
  compareBehaviours(beforeSpec, afterSpec, provenance, changes);
  compareOrderedFingerprints(
    beforeSpec,
    afterSpec,
    beforeSpec.invariants,
    afterSpec.invariants,
    "invariant",
    provenance,
    changes,
  );
  compareOrderedFingerprints(
    beforeSpec,
    afterSpec,
    decisionRows(beforeSpec),
    decisionRows(afterSpec),
    "decision-row",
    provenance,
    changes,
  );
  compareQuestions(beforeSpec, afterSpec, provenance, changes);
  compareFlows(beforeSpec, afterSpec, provenance, changes);
}

export function compareEstates(
  before: SpecEstate,
  after: SpecEstate,
  provenance: Provenance,
): SemanticChange[] {
  const changes: SemanticChange[] = [];
  const beforeById = new Map(before.specs.map((spec) => [spec.id, spec]));
  const afterById = new Map(after.specs.map((spec) => [spec.id, spec]));
  const removed: SpecDocument[] = [];
  const added: SpecDocument[] = [];
  for (const id of new Set([...beforeById.keys(), ...afterById.keys()])) {
    const beforeSpec = beforeById.get(id);
    const afterSpec = afterById.get(id);
    if (beforeSpec && afterSpec) {
      compareMatchedSpec(beforeSpec, afterSpec, provenance, changes);
    } else if (beforeSpec) {
      removed.push(beforeSpec);
      addChange(changes, provenance, {
        kind: "spec.removed",
        specId: beforeSpec.id,
        before: { path: beforeSpec.path, title: beforeSpec.title },
        evidence: evidence(beforeSpec, undefined),
      });
    } else if (afterSpec) {
      added.push(afterSpec);
      addChange(changes, provenance, {
        kind: "spec.added",
        specId: afterSpec.id,
        after: { path: afterSpec.path, title: afterSpec.title },
        evidence: evidence(undefined, afterSpec),
      });
    }
  }

  for (const beforeSpec of removed) {
    const candidate = added
      .map((afterSpec) => ({ afterSpec, score: similarity(beforeSpec.source, afterSpec.source) }))
      .filter((item) => item.score >= 0.75)
      .toSorted((left, right) => right.score - left.score)[0];
    if (candidate) {
      addChange(changes, provenance, {
        kind: "spec.rename-suggested",
        specId: candidate.afterSpec.id,
        elementId: beforeSpec.id,
        before: { id: beforeSpec.id, path: beforeSpec.path },
        after: { id: candidate.afterSpec.id, path: candidate.afterSpec.path },
        inferred: true,
        evidence: evidence(beforeSpec, candidate.afterSpec),
      });
    }
  }

  compareRelationships(before, after, provenance, changes);
  compareFindings(before, after, provenance, changes);
  return changes.toSorted(
    (left, right) =>
      left.specId.localeCompare(right.specId) ||
      left.kind.localeCompare(right.kind) ||
      (left.elementId ?? "").localeCompare(right.elementId ?? "") ||
      left.id.localeCompare(right.id),
  );
}
