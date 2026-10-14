# Independent journey-lifecycle contract audit

Date: 2026-10-12. Read-only baseline pass using `/Users/gaz/dev/calm-craft/skills/module-contract-audit/SKILL.md` and its `references/coding-contracts.md`.

Repository: `/Users/gaz/.codex/worktrees/0f13/calm-astrophage`. HEAD: `08dacb5c7903e4d18b9d818dd4ad0f9edad9d599`. Audited the current working tree, which has extensive pre-existing tracked changes and untracked files. The selected native lifecycle diff is only four added/three removed lines in three files, but this audit examines the current capability, not merely that diff.

Contract: `docs/architecture/contracts/journey-lifecycle.md`, SHA-256 `e00d0332318f0a36abc1dc9bc93ca22a7f9e4a2a5ca9cf63f0825ad71720a62c`.

## Conclusion and authority

The contract and all C1–C5 obligations are expressly **proposed**. Its opening explicitly denies an accepted extraction; it records no human acceptance evidence. The pure core does not exist in the inspected implementation. Native coupling is therefore a target migration gap, not a violation of an accepted coding contract. No independently established product-intent violation was verified in the selected branches. That conclusion is bounded by static inspection; it does not certify runtime behavior, complete feature adoption, or release readiness.

Observable intent comes from `specs/platform/agentic-journeys/agentic-journeys.md` B1–B9 and its F1 flow, Foundation B6/B7 and invariants in `specs/platform/foundation/application-foundation.md`, and owning feature specs. `docs/design/agentic-journeys.md` supplies the existing feature/lifecycle separation but contains a stale policy example identified below. The proposed contract cannot override those documents or independently authorize a migration.

## Classified findings

### A1 — Target migration gap: C1, C3; lifecycle and adapter concerns share native helpers

Locations: `convex/lib/journeys.ts:1–24` imports, `:26–42` native product document/ID unions, `:51–72` category sets, `:84–114` feature admission branches, `:313–488` finish/transition/scheduling, `:512–529` revision claim; `convex/lib/journeyDefinitions.ts:31–49` definition registry; `shared/journey-registration.ts:6–7,30–53` supported declarative keys.

Observed: lifecycle functions require Convex contexts, native owner unions, feature fences, native scheduler/API references and implicit `Date.now()`. Definitions retain labels/order, not executable handlers, retry/repair policies or dependency admission. Generic revision state remains the default boolean budget, while message preparation owns separate finite revision counters. This agrees with the draft's current description. It does **not** establish a public port or implemented portable core.

Consequence: extraction cannot be judged complete by moving this file or copying its definition registry. It must preserve the feature fences and existing feature budgets while making event/result schemas and policy ownership concrete.

Scoped remedy: after acceptance of a selected slice, define its typed transition inputs/results and policy/clock values; retain native admission, storage and scheduling in its adapter. Do not remove fences, invent executable definition data, or introduce another scheduler. The exact schemas/first slice remain explicitly open design decisions, not missing current product requirements.

### A2 — Target migration scope/evidence gap: C1–C5; imports alone miss native feature writers

Locations inspected: `convex/sourceSteps.ts:75–99`, `convex/researchSteps.ts:101–121`, `convex/lib/sourceExecution.ts:123–145,191–202`, `convex/lib/researchExecution.ts:123–140`, `convex/lib/marketResearch.ts:89–97,116–152`, `convex/lib/draftExecution.ts:202–209,256–281,570–575`, `convex/icpSteps.ts:88–113`, and `convex/lib/replySuggestions.ts:565–577`.

Observed: real feature adapters directly maintain their owners' journey progress in addition to calling `startAttempt`, and several finish attempts through feature-owned settlement rather than generic `finishAttempt`. These are legitimate current compositions; the draft does not claim their wholesale migration. The real adoption inventory includes these writes and their feature conditions, not only imports of `lib/journeys`.

Consequence: a future seam can pass a core import check while feature writers still carry lifecycle decisions or duplicate policy. A migration chosen only from `lib/journeys` exports would leave those paths unassessed.

Scoped remedy: for the accepted transition group, list which actual writers are migrated and which remain explicit native allowances. Preserve feature checkpoint/receipt and authority semantics rather than labeling every direct write a public-boundary violation. Do not broaden this trial into all workflows.

### A3 — Stale supporting design: C3 preservation authority, Agentic Journeys B5

Locations: linked `docs/design/agentic-journeys.md:92` declares `maxRevisions: 0 | 1`; `:144` says use the remaining single revision. Current governing `specs/platform/agentic-journeys/agentic-journeys.md:39,77,127` declares feature-specific finite budgets, default one and six for opening/follow-up. `specs/outbound/drafts/outbound-draft.md:39,105` independently governs six revisions. `shared/message-rules.ts:2` defines `MAX_MESSAGE_REVISIONS = 6`, and `convex/lib/draftExecution.ts:83–95` applies it to writer and editorial bounds.

Observed: the supporting design still describes the older single-revision generalization. The proposed C3 correctly defers to governing feature limits, so the draft itself does not require reducing existing six-revision preparation to one.

Consequence: treating all linked design examples as implementable current policy would narrow a settled product allowance during extraction.

Scoped remedy: in a separately authorized documentation update, identify the design example as historical/default-only or align it with the current feature-declared policy. Continue to use the product spec as authority. This is a stale design finding, not a current code defect or an accepted-contract violation.

### A4 — Missing fresh verification evidence: C2, C4, C5

Locations: draft `:85–89`; `convex/journeys.test.ts` named cases and fixtures; `shared/convex-testing.ts:1–16`; `scripts/check-convex-boundaries.mjs`; `vitest.config.ts`.

Observed: existing native tests contain meaningful assertions for duplicate attempts, bounded retry scheduling, question races, cancelled original effects, exact retained children and original uncertainty. They were read, **not executed** in this pass. No pure core exists to run proposed transition checks against. The existing boundary checker protects native runtime/import rules, not C1's proposed direction, receipt semantics or transaction correctness.

Consequence: source/tests support a preservation checklist but cannot justify `verified` status for an adopted obligation or assert current tests pass. No deployed/scheduled/provider behavior was established.

Scoped remedy: once a slice is accepted and an authorized local test environment is available, run the selected native lifecycle/feature tests and isolated transition checks, plus a representative forbidden import test if an owning enforcement rule is adopted. Keep these evidence gaps visible; do not rerun whole-repository gates for a proposed contract.

## Inspected boundary observations

- **C2 history/effects:** `startAttempt` (`convex/lib/journeys.ts:211–262`) reuses a retained key before admitting a new exact-version attempt, retains a bounded 32-attempt owner tail and Activity identities. `bindAttemptEffect` (`:264–312`) validates business/subject/authorized command and running exact attempt. `finishAttempt` (`:313–488`) reads the bound original effect receipt/resolution, holds uncertain outcomes, retains terminal/superseded history, and gives cancellation precedence over advancement. Activity retains safe paginated history (`convex/lib/activity.ts:120–202`, `convex/activity.ts:27–121`). Long-tail replay beyond the owner tail was not behaviorally tested here.
- **C3 retries:** the default automatic limit is three. ICP's helper accepts a lifetime ceiling up to 24, but the actual selected caller starts at three (`convex/lib/icpAssessment.ts:231`) and only explicit eligible user recovery adds another three (`convex/icpAssessments.ts:234–260`, `convex/lib/icpRecovery.ts:33–58`). That is not evidence of 24 automatic attempts for an initial command. Completed malformed ICP results use the retained committed effect plus the feature-owned interrupted-body classification (`convex/icpSteps.ts:407–428`); unknown effects are not made retry-safe by that boolean alone.
- **C3 questions:** definitions and schema keys are server-owned; registration excludes arbitrary keys/handlers (`shared/journey-registration.ts`, `convex/lib/journeyDefinitions.ts`). `issueQuestion`, `expireQuestion` and `journeyCommand` (`convex/lib/journeys.ts:558–686,787–949`) retain exact checkpoint/version, 30-minute expiry and first-decision commands; public snapshots do not return answers. The locked-knowledge question is an explicit authority/review decision, not evidence of routine research asking the user for obtainable evidence.
- **C4 child/progress:** `retainChild` (`:531–556`) resolves both exact owners against the same business, rejects self links and retains bounded child IDs. Preparation saves an exact child in the same mutation before returning `waiting` (`convex/lib/websitePreparation.ts:234–239,249–278`); recovery re-retains saved exact IDs (`convex/activations.ts:400–420`). `preparationFence` prevents child work under cancelled/stale parents. Public `get` and `snapshot` (`convex/journeys.ts:13–168`) resolve exact links and explicitly project safe fields and registered questions; Activity summaries are application-owned templates, not provider text. Full feature replay/child admission has not been runtime-proven by this inspection.
- **C5 native host:** public queries/commands authenticate independently through `requireUser`, `ownedBusiness`, `acceptCommand`; workers reauthorize persisted ownership through `authorizedCommand`/feature fences (`convex/lib/commands.ts:28–74,138–157`, `convex/lib/journeys.ts:73–114`). Admission, scheduler writes, command receipts and projections use the native mutation context. `convex/functions.ts` retains existing atomic supply invalidation. `convex/providerSpend.ts:249–273,319–336,350–387` binds the attempt only after native paid-dispatch claim, with failed binding throwing in the same transaction. `convex/lib/effects.ts:77–96,149–235` retains exact effect identities, first receipts, quarantines and original reconciliation. This describes code placement and guards, not empirical transaction/callback verification.

## Actual checks and enforcement

Executed: repository status inspection; selected diff statistics; source/spec/flow reads and bounded caller searches; generated API reference inventory (read-only); a read-only TypeScript AST syntax/import inventory over twelve selected files using the repository's installed TypeScript. **Result: zero parse diagnostics** for `lib/journeys`, public journeys/workers, definitions/schema, shared registration/types, providerSpend, icpSteps, websitePreparation, activations and journeys.test. This was syntax/import inventory only, not typechecking, alias/cycle enforcement, test execution, policy equivalence, or transaction verification. `src/lib/agentic-journey.ts` re-exports shared types; browser components consume those types and server-supplied snapshot actions.

Existing available enforcement: native validators in `journeySchema` and registered question/definition/answer validation; independent public authentication; exact command/effect identity helpers; backend checker source forbids wrong runtime imports/dynamic modules and bypassing native mutation builders. The checker was inspected but not run. C1 pure-core direction and the proposed C1–C5 seam remain documented/proposed, with no newly installed enforcement.

## Inspected scope and limits

Primary files were read completely: repository `AGENTS.md`; selected contract; shared journey types/registration; native lifecycle helper; public journey surface/workers; definition/schema registration; the linked journey spec/design. Supporting source was read in selected relevant ranges: commands/effects/activity/auth/function builders, providerSpend, preparation/research child creation and recovery, ICP policies/recovery, and selected feature direct writers named above. Reviewed journey test fixtures and the meaningful named branch assertions, including question races and effect/child safety. Inspected Foundation B6/B7/invariants; ICP spec recovery/assessment clauses; outbound draft finite-revision clauses; journey F1 flow admission/recovery clauses; package/test/boundary configuration. Inventoried callers in company, ICP, sourcing, research, market, draft, reply suggestion, activation, activity and public feature snapshot wrappers. This was not exhaustive product-adopter correctness review.

Explicitly excluded: `docs/architecture/research-workflow-discovery.md`, all `.reports/` contents, other agents' conclusions; live backends/providers/mailboxes, network, credentials, installs and whole-repository tests. No source, contract, spec, generated output, lockfile, test or configuration edits. No test launch or sandbox escalation. The worktree is outside this chat's writable roots; avoiding a test runner/cache/config write was part of the authorized constraint. The sole created artifact is this audit under `/private/tmp/calm-contract-journey-audit`.

Clean selected static branches do not establish accepted architecture, package portability, host transaction correctness, runtime progress, safe complete adopter behavior, or release authority. The finite lifecycle seam should remain a local proposal until an accepted slice and its real preservation evidence exist.
