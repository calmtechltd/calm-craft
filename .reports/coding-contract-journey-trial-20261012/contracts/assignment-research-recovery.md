---
id: assignment-research-recovery
status: proposed
---

# Assignment research checkpoint recovery

## Responsibility

Decide whether one exact retained assignment-research checkpoint may resume, and commit its recovery atomically with the owning command outcome. Preserve acquisition, evidence, effect and worker identity. New qualification versions and targeted acquisitions belong to research continuation, not this operation.

## Authority and scope

Product authority: `specs/leads/research/lead-research.md` B3, B4, B5, B6 and B9; F1.T14, T31, T40–T48 and T53 in `lead-research.flow.yaml`; `specs/platform/foundation/application-foundation.md` B7; `specs/platform/agentic-journeys/agentic-journeys.md` B2, B4 and B8. Existing authority must be linked during adoption using the established repository catalog. This file is a proposal in a temporary trial directory; architecture decisions were excluded from inspection.

Current behavior is evidenced below. Every C obligation remains proposed: six selected fixture tests passed, but adoption is unaccepted and the complete obligation set is not proven. The target preserves existing product rules rather than approving every observed implementation detail.

## Public interface

Current registered boundary: `convex/research.ts`.

- `control({ businessId: Id<"businesses">, runId: Id<"evidence">, expectedRevision: number, action: "resume" | "retry", key: string })`. Convex argument validators enforce ID table, number/string and action shape. The server independently requires the signed-in owner and exact business. `researchOwner` requires a lead-research run, same business, authorized source command, and matching assignment/lead/programme/campaign. Current state validation requires paused for resume, failed for retry. Current result is `{kind, code: string | null, receipt}`: duplicate acceptance reuses the original result, successful recovery is `saved/recovered`, blockers are `held/<code>`, and non-accepted command classifications retain their owning command kind.
- `get` takes exact business/campaign/lead and optional assignment/run IDs. It independently authorizes access and validates their relation. Its safe recovery projection is `{canRecover: boolean, recoveryBlocker: string | null}`. Reading never performs recovery.

Trusted current host helpers: `researchRecoveryBlocker(QueryCtx, ResearchRun): Promise<string | null>`, `researchReady(QueryCtx, ResearchRun): Promise<string | null>` and `recoverResearch(MutationCtx, ResearchRun): Promise<string>`, in `convex/lib/researchExecution.ts`. They are not client-facing APIs. The helper relies on the public facade for requested action/state, expected revision, receipt reuse and wake; internal maintenance/diagnostic callers have separate state gates. Do not advertise the helper alone as independently authorizing arbitrary user recovery.

Proposed target: retain those registered API names and response compatibility, with an internal classified result `{kind: "recovered", runId, workerCommandId, checkpoint, revision}` or `{kind: "held", reason: RecoveryReason}`, mapped at the facade to current receipts. `RecoveryReason` must enumerate existing fence/readiness codes and command conflicts instead of accepting arbitrary provider exception text. Do not narrow an existing blocker set without inventorying its owners. A whole Convex context remains private to the transaction adapter; no portable public API accepts a mutable context bag.

Input adoption requirement: expectedRevision is a nonnegative safe integer; malformed keys follow the owning command validator. These semantic checks were not proven from the `v.number()`/`v.string()` declarations alone.

## Ownership

Research owns the retained `evidence` lead-research record and its acquisition/checkpoint/crawl/operation history. Programme work owns worker admission and attempt lifecycle. Commands/effects own intent, receipt and spend. The research control coordinator may update these records together in one native mutation; physical collection sharing does not transfer policy ownership.

Use exact native IDs. Preserve `runId`, assignment/lead/business/programme/campaign, definition, knowledge, ICP, authority, campaign authority, qualification-policy ID/version and any future-authority bindings. The record's version, control revision and journey version are distinct. Original provider command IDs, previousCommandIds, effect IDs, providerJobId, costs and immutable candidate/qualification provenance survive recovery.

## Dependencies

Allowed: research ownership/fence/evidence public helpers; programme ownership/current authority; readiness/price/budget checks; command acceptance/completion; the owned programme worker operation; native transaction/scheduler; future-binding resolver. Keep generated server/ID types and Convex persistence in the host layer. There is no requirement to introduce a generic repository interface.

Forbidden: direct provider HTTP, replacing an unresolved effect, changing recipient policy, granting research/send authority, changing campaign definitions, rewriting qualification history, starting a new acquisition, selecting a latest unrelated run, or sending/drafting messages. Shared journey progress may consult the domain fence; general journey commands may not bypass research control.

## Obligations

### C1 — Exact ownership, state and current authority

Status: proposed

Before any recovery write, reload the exact owned run and current governing state. Stop wins over pause; cleared parent pause does not implicitly resume a saved paused checkpoint. Stale or superseded state remains history or held with its current blocker. Owner resume/retry requires the exact current revision and action state; service recovery remains limited to its declared retryable prerequisite categories and bound. Current implementation: `research.ts:221–292`, `leadResearch.ts:76–153`, `researchMaintenance.ts:287–303`, `researchDiagnostics.ts:31–50`.

### C2 — Recover the exact saved stage

Status: proposed

Retain acquisition and completed decisions. Qualification recovery evaluates only pending/failed candidates; it cannot buy another crawl. A special recovery of a failed/cancelled/timed-out original second-acquisition job resets polling for that same retained providerJobId, not a new paid invocation. The latter is an existing implementation branch (`researchExecution.ts:303–313,324–355`); confirm its coverage before acceptance. New research versions follow their separate continuation authority.

### C3 — Preserve unknown effect identity and finite recovery

Status: proposed

Every current and historical command/effect associated with the checkpoint must have a known non-uncertain outcome and resolved original accounting before replacement paid work can be admitted. Unknown or unresolved output/spend produces a held reconciliation blocker. Never erase command lineage or create a fresh operation to escape uncertainty. Current helper caps recovery when worker attempt reaches three and refuses queued/running/uncertain workers. Receipt/resolution uncertainty and foreign/missing command checks need reachable-state proof: the recovery helper has fewer explicit checks than `researchContinuation.ts:30–66`. Do not call that difference either an accepted allowance or a verified defect without further evidence.

### C4 — Atomically retain recovery and its delivery

Status: proposed

In the owning public mutation, accept and complete the exact control command; update worker pending state/attempt and run checkpoint; increment the domain revision; retain the version-bound programme wake; record committed or confirmed-no-effect outcome. Duplicate delivery returns the first receipt without another attempt, cost or wake. Admission later reauthorizes before provider dispatch. Never split this invariant into separate commits merely to create folders or ports.

### C5 — Safe inspection and cancellation

Status: proposed

Inspection returns only authorized same-assignment history and safe recovery classification. Never include raw evaluator response, credentials or hidden reasoning. After stop/cancellation, existing submitted crawl polling may retain/reconcile that original result; no successor provider, qualification or drafting work starts. Technical completion, insufficient evidence and unavailable qualification remain distinct.

## Effects and recovery

This operation changes native state and scheduling only; provider work occurs later through existing admission and effect reservation. Declined, stale, paused, stopped, exhausted or uncertain recoveries create no new provider effect. A command receipt replay is authoritative even if current state later changes. Cancellation does not undo an external invocation; its original identity remains available for reconciliation. Provider result retention after stop is not permission to qualify or spend again.

Automatic prerequisite recovery is bounded and owned by existing maintenance. Obtainable provider/prerequisite evidence should use that bounded service path; it does not require a customer research question. Decisions about campaign policy or authority remain human/domain-owned. No new workflow runtime is required.

## Verification and enforcement

Existing structural enforcement: Convex typed-ID/action argument validators and TypeScript. Transaction and policy obligations require code review plus meaningful isolated tests. No module dependency rule was installed or verified.

Selected fixture tests in `convex/researchExecution.test.ts`: line 325 malformed qualification; 398 retained qualification through pause; 487 evaluator unavailable/uncertain start; 501 explicit resume and no reacquisition; 564 original paid crawl after stop; 709 public scope/revision/pause/replay and command-bound wake. All six passed; 24 other cases in the file were skipped. Initial startup failed with EPERM writing Vite temporary config outside the permitted roots. A supported `--configLoader runner --cache=false` retry succeeded under Node 22.23.1. [Full trial evidence](../evidence.md) and [raw JSON](../research-tests.json).

Additional exit evidence: three-attempt refusal, unknown effect with misleading/missing accounting, original second-job polling recovery, all governing version/future-authority combinations, missing/foreign command relations, and rollback of revision/worker/wake/receipt on failed transaction. Determine which existing tests already prove these before adding any. No broad test run, live provider check, browser check or deployed-host acceptance occurred.

## Adoption and open decisions

First compare with accepted architecture (not read in this trial). Keep this draft proposed until human acceptance. Then adopt locally across owner `get/control`, bounded maintenance and fixture diagnostics; retain their different authority envelopes explicitly. No package extraction is justified by one product.

Any local file split is optional. During adoption, current trusted helper signatures and registered paths are a bounded legacy allowance; they must not acquire new unreviewed callers. Close that allowance only when every real caller uses the owned classified operation and C1–C5 have evidence. Tests that directly invoke the host helper remain isolated fixture-only callers.

Unresolved design choice: retain the existing colocated helper exports or introduce a small local recovery facade. This is internal structure, not a reopened product decision. Unresolved evidence: whether current host invariants make the effect predicate sufficient. Verify or repair within a separately authorized implementation; do not weaken the governing uncertainty rule.
