# Product-trial coding-contract adoption plan

12 October 2026. **Proposed adoption plan; product implementation is not authorized by this document.** Local skill refinement and source-only trials are complete only to the extent recorded in the [review report](../.reports/coding-contract-review-20261012.md). No publication or installed-plugin rollout is included.

This plan records one product trial. The reusable skills follow [agnostic architecture principles](../references/architecture-principles.md); the products, runtimes and chosen recovery seam below are trial context rather than defaults for other libraries or applications.

Source naming update: the unreleased skills are now `code-contract-discover`, `code-contract-design`, `code-contract-implement` and `code-contract-audit`. The implementation skill covers both missing-code implementation and adaptation of existing code. Earlier trial records retain their historical skill names. This plan's product implementation remains separately scoped and unauthorized by the document itself.

The selected direction is capability contracts in Calm Craft, local adoption in Astrophage, then comparison with an actual Library consumer before deciding on shared extraction. Product specs own observable intent; technical contracts describe public operations, ownership, dependency direction and effect/recovery obligations. Existing Convex Workflow/Workpool and Inngest hosts retain execution responsibility.

Design inputs: [shared format](../references/coding-contracts.md), [independent journey/research draft](../.reports/coding-contract-journey-trial-20261012/index.md), [independent audit](../.reports/coding-contract-journey-audit-20261012.md) and [Library comparison](../.reports/coding-contract-research-comparison-20261012.md). Astrophage's existing `docs/architecture/index.md` and `contracts/journey-lifecycle.md` remain proposed. This plan does not supersede its product-completion plan or the separate controlled delivery test.

## How to use

Use one explicitly selected chunk per session. Refresh source/status and preserve unrelated work before execution. Acceptance of a target, authorization to migrate, implementation and verified evidence are separate records. Do not automatically start B1 from a contract proposal. Keep each chunk backend-only; no customer-visible UI changes or database migrations are planned. Use existing product authority rather than adding technical requirements to feature specs. Update product badges only when product behavior actually changes and has evidence.

Three chunks form the adoption path: **A1 → B1 → C1**. Deterministic enforcement and visualization are separate follow-ons. No package-extraction chunk is scheduled before C1 establishes common meaning.

## A1 — Make checkpoint recovery ready for an adoption decision

**Depends on:** completed skill review and independent trials.

**Authority:** Astrophage `specs/leads/research/lead-research.md` B3–B6/B9 and its F1 recovery flow; `specs/platform/foundation/application-foundation.md` B7; `specs/platform/agentic-journeys/agentic-journeys.md` B2/B4/B8. Reconcile the proposal with `docs/design/agentic-journeys.md` and the existing architecture catalog. When the design and current product spec disagree on revision limits, use the governing current spec and record the stale design reference.

**Work:** Select `assignment-research-recovery` as the first candidate, subordinate to the existing research owner and journey obligations. Inventory actual result/blocker codes and the three caller classes: public `research.get/control`, bounded maintenance and fixture diagnostics. Specify the proposed discriminated result and each caller's authority envelope without exposing Convex context as a portable API. Identify every atomic write owned by the public control mutation. Reconcile overlap with `journey-lifecycle` rather than creating competing ownership. Keep any stricter revision/key validation explicitly proposed unless governing authority establishes it.

**Done when:** one catalog entry points to one scoped contract; exact current signatures and proposed inputs/results are distinguishable; C1–C5 have traceable authority and named evidence; incomplete schemas and reachable-effect uncertainty are visible; the owner can accept a concrete boundary and migration slice. Acceptance is recorded with scope and provenance. Contract existence or a passing current test suite does not count as acceptance.

**Out of scope:** product fixes, runtime/handler changes, new registration framework, storage changes, shared packages and changes to running journeys.

## B1 — Adopt the local recovery boundary while preserving the transaction

**Depends on:** A1, explicit authorization of this Astrophage implementation slice and a fresh product baseline.

**Authority:** A1's accepted obligations and the same governing product behaviors. Source areas: `convex/research.ts`, `convex/lib/researchExecution.ts`, its selected maintenance/diagnostic callers and existing recovery fixture tests.

**Work:** Introduce a small local classified operation around the existing recovery seam. A file split is optional; a broad pure lifecycle rewrite is not required. Migrate the selected callers while preserving their distinct public/service/fixture authority. Keep the public mutation responsible for command acceptance, worker/checkpoint writes, revision, programme wake and receipt completion in one native transaction. Preserve registered paths, generated API workflow, original run/worker/attempt/command/effect/provider-job identities and existing bounds. Investigate the narrower recovery predicate versus continuation's effect predicate before relying on it; change only behavior proven inconsistent with accepted authority, using regression protection if needed.

**Done when:** real callers use the classified operation; no selected caller bypasses ownership/state/version/effect checks; existing exact-stage/no-reacquisition, pause/stop, scope/revision, duplicate receipt and retained-job behavior passes narrow fixture checks. Unknown current/historical effects, finite worker attempts and atomic rollback/wake behavior have actual evidence appropriate to the slice. Reuse existing tests before adding missing ones. Static dependency review establishes the recorded local direction and names bounded legacy callers. Run the selected native-host tests as well as any pure checks; pure checks alone cannot prove native transactions. Update obligation status from actual results and leave unrun/legacy gaps visible.

**Out of scope:** new acquisitions, changed qualification/evidence policy, paid/provider experiments, private backend/deployment changes, handler renames, broad folder moves, general lifecycle engine extraction or taking over the controlled delivery test.

## C1 — Challenge the exact adopted contract against Library

**Depends on:** B1's locally verified boundary and authorization for the selected Library evaluation scope. Library source remains read-only unless a later request explicitly authorizes implementation there.

**Authority:** Library `specs/journey/content/content-plan-and-drafts.md` B1 and recovery/evidence invariants; actual source/operation/frontier ownership. Use [the current comparison](../.reports/coding-contract-research-comparison-20261012.md) as initial evidence, not as proof of compatibility.

**Work:** Select a real Library recovery caller and compare exact inputs/results, owner scope, versions, unknown-effect disposition, atomic commit and invalidation with the adopted Astrophage contract. Use an isolated temporary consumer probe if it materially tests compatibility without network, credentials or product-state changes. Preserve Library's source lifecycle/authority/rights rules and Astrophage's lead qualification/authority rules. Reduce the common scope or retain local boundaries when their meaning differs.

**Done when:** a compatibility matrix identifies matched, adapted and incompatible obligations with evidence from both real callers; the chosen outcome is justified. A rejected common contract completes this comparison successfully. Recommend extraction only if both consumers exercise the same meaning and the proposed artifact/API versioning plus compatibility/release ownership is concrete. A provider name, type-checking adapter or successful-step memoization alone is insufficient.

**Out of scope:** Library refactoring without separate authorization, Inngest/Convex replacement, universal research policy, publication, package release or adding product switches to a generic core.

## Follow-ons and close-out

After local adoption, deterministic import/catalog checks may use existing compiler/linter/AST tooling for selected edges and representative forbidden imports. Visualizer support needs its own format/parser/UI design and scope; contracts remain outside `specs/` until then. Neither follow-on is a prerequisite for every contract. Publishing/installing the skill layer and any later package extraction remain separate decisions.

For each authorized implementation diff, review all task-owned staged/unstaged/new files, preserve generated-source workflows, cite checks actually run and residual limits, and distinguish local completion from release. No automatic commit, push, installation, version bump or deployment follows this plan.
