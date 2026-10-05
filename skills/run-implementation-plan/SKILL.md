---
name: run-implementation-plan
description: Execute the selected implementation plan, phase, chunk or explicit spec behaviours according to their governing requirements and acceptance criteria. Use for "run the implementation plan", "continue the plan", "finish the scoped work", or a named chunk. Goal continuation uses run-implementation-plan-all.
---

# Run an Implementation Plan

Complete the agreed implementation scope.

Execute the selected work according to its governing spec and existing acceptance criteria. Continue until that work is implemented and appropriately verified. The user's latest instructions establish the assignment; the selected plan defines its deliverables and the governing spec defines their required behaviour.

The card is the unit of work: one behaviour or implementation-plan chunk per pass. Continue through the agreed scope, which may be one named card or the whole plan.

Commands and paths: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md). Repo-specific extras: `paths.goal` (default `.engineering/goal.md`). Use host continuation tools only when the user has authorised that mode; an ordinary implementation request does not create a persistent goal.

Use the [engineering configuration contract](../../references/engineering-config.md) for v1 compatibility, suite selection, and command definitions. Invoke `argv` directly in its recorded `cwd`; do not turn it into shell text. Keep context-specific gate evidence distinct, and do not infer authorization from a configured helper.

**Not this skill:** writing a plan (`author-implementation-plan`). A request for one named card or "the next chunk" selects that card. When the user explicitly continues a wider-plan assignment and names a starting card, retain that wider scope. A later instruction narrowing the assignment takes precedence. "Finish the plan" means continue through its scoped queue.

## Scope boundary

The user's latest instructions select the assignment: a plan, phase, named card or explicitly selected spec behaviours. Use the supplied plan, or the clearly active plan when none is named; establish which plan applies if several are plausible. Record the selected queue, governing requirements, exclusions and deferrals in the checkpoint.

Build the queue from only the selected executable work. The governing spec defines its required behaviour; wider spec contents and status badges provide context. "All" means this agreed queue. Deferred or optional work becomes executable when the user explicitly includes it in the assignment.

Choose the simplest complete implementation that meets the selected acceptance criteria and applicable repository rules. Use existing capabilities and UI patterns where sufficient, and follow the agreed user flow. Connect each material change to a selected requirement or agreed decision. For a necessary technical prerequisite, briefly explain which selected outcome it enables; product behaviour and flow still follow the agreed requirements.

Resolve ordinary coding choices through established code and conventions. Resolve material product questions or conflicts through existing authoritative decisions, or record them for the user before dependent work proceeds. Continue independent work within the selected scope. Preserve the agreed scope throughout implementation, review and documentation updates.

## Host continuation

After each card, if dependency-ready work remains inside the agreed scope, continue without another prompt.

1. **Same session, if context is healthy** — start the next card immediately.
2. **New turn required** — same scope, same checkpoint:
   - **An already-authorised host goal** — continue with the same scope and checkpoint. Do not create a new goal or automation merely to keep working.
   - **Neither** — keep working in this session anyway.

Do not reset `.active/` on a continuation turn. If I attached supplementary text, or the goal overlay exists, honour it. Slash text wins for this run.

## Before implementation

- Read the selected plan, the governing requirements and linked decisions for its selected work, and the repository rules. Use wider documents as context for that assignment.
- Identify behaviour statuses, dependencies, existing implementation, test coverage, and Open Questions.
- Resolve questions only when authoritative evidence in the specs, code, tests, or linked decisions establishes the answer.
- Batch genuinely blocking product decisions for me before coding via [`ask-questions`](../ask-questions/SKILL.md). Do not invent a product decision. If I tell you not to stop for questions, skip blocked behaviours and record them instead.
- Build a dependency-ordered queue from the selected executable work. Work on one behaviour or implementation-plan chunk at a time.
- Keep a concise checkpoint under `.active/` containing the scope, queue, completed cards, verification evidence, current database state, blockers, and next action. Do not commit `.active/`.

The coordinating agent owns verification across the run. Give each worker an explicit file/behaviour scope and a targeted check budget; workers must not independently invoke readiness, whole-repository gates, or sibling review workflows. Reuse their reported command, result, and covered changes. Repeat a check only when later changes can invalidate it.

Starting card, in order: the ID I named; the plan's "Next up" marker; the first incomplete chunk in execution order. **Verify Depends on either way.** If prerequisites aren't complete and you cannot complete them inside this scope, record the blocker and continue independent dependency-ready work inside the selected queue. If everything is complete, say so; don't start new scope.

## For each card

1. Read the complete relevant spec and acceptance criteria. Read the flow contract, storyboard evidence for affected states, and the exact transitions assigned to this card. The YAML governs; Mermaid is a human view. Read **Work**, **Done when**, **Out of scope**. Out of scope is a hard wall. Follow the declared user flow. Resolve any needed product-contract decision through existing agreed requirements or record the question for the user before dependent work proceeds. Continue independent in-scope work; changing the contract requires an agreed product decision.
2. Check the implementation and test coverage against this card's assigned requirements. Identify the smallest remaining changes needed to satisfy them.
3. Add or update tests only where `write-tests` says they earn their keep. Preserve meaningful permission, tenancy, invariant, decision-table, and regression protection. Cover applicable guard outcomes and server/lib transitions through existing or table-driven scenarios where possible; do not require a separate test for every ID or mount pages to fill a coverage table.
4. Implement until the acceptance criteria are met and the appropriate verification passes. Follow the repo's conventions. If you add a dependency, use `package_manager` from the config — never guess `npm` vs `pnpm`. Do not commit `.env` or put a real secret in `.env.example`.
5. Apply [write-tests — focused browser verification](../write-tests/SKILL.md#focused-browser-verification): select unresolved UI risks and explicit checks, batch related cards in one coordinator-owned session, and reuse valid evidence through close-out. A card or milestone does not require its own browser pass. Honour explicit skips and distinguish setup blockers from in-scope product failures.
6. If this repo's tests build their database from source schema (often `src/db/schema/**`), do not run `commands.db_generate` or `commands.db_migrate` merely to make tests see a schema change.
7. Run `commands.db_generate` only when generated migration files must be verified, or when a real app or browser path needs the schema change. Run `commands.db_migrate` only when that real database needs those generated or committed migrations. Omit both steps when the config does not define them.
8. Treat database coordination notices as informational. Do not ask me to confirm an external chat or ticket state. Keep generated migration artifacts uncommitted unless I have explicitly authorised committing them.
9. Update completion status, verification evidence and implementation notes for the agreed changes (`spec-maintain-on-ship`). Preserve the agreed product intent, acceptance criteria and scope. Amend those only to reflect an explicit user instruction or an already-recorded authoritative decision. Mark the chunk complete when its existing criteria and required verification are satisfied, and advance "Next up" within the selected queue. A spec or plan rewrite cannot authorise an unrequested implementation.
10. Inspect **this card's diff only**, including staged and untracked task files. Run the smallest directly relevant test command when meaningful behaviour changed or a test was added/updated; batch it after the coherent slice rather than after every edit. Preserve a separate red run when proving a regression. Do not run application tests for prose-only changes; use relevant schema or syntax validation for configuration changes. Apply required changed-file checks, including an affected UI suite when the repo requires it. Do not run repository-wide formatting. Broader lint, TypeScript, knip, `commands.test`, or readiness checks require an applicable repository rule or explicit checks request; they are not per-card ceremony. Run `git diff --check` and apply `review.always_check` from the config.
11. Clean only temporary or generated output created by this card whose removal is proven safe. Never delete pre-existing or unexplained files, and never discard migration artifacts blindly.
12. If local commits are authorised and `commands.checkpoint_commit` is set, create a local checkpoint commit through that command, update the checkpoint file, and continue to the next dependency-ready card without waiting for another prompt. Otherwise update the checkpoint and continue; a configured command alone is not permission to commit.

Then go back to card step 1 for the next dependency-ready card. Use the host continuation rules when a new turn is required.

Stop the card loop when the agreed scope is done or all remaining in-scope work is blocked. Record blocked cards and continue with independent in-scope work.

Then run **close-out** once — not after every card.

## Close-out (once)

1. Review the complete task scope through `branch-self-review`, including committed, staged, unstaged, and untracked task changes. Check that the selected requirements are satisfied and each material addition serves an agreed requirement or justified necessary prerequisite. Fix verified in-scope findings and reconcile task-owned additions with the assignment, preserving unrelated pre-existing work.
2. Run any required targeted checks not already covered by current evidence. Do not repeat successful worker checks or automatically run repository-wide gates.
3. Check drift and coverage for the selected requirements. Repair verified acceptance failures and required missing verification, then repeat the targeted evidence affected by those repairs. Record wider findings separately; the executable queue remains the selected assignment.
4. Run `git diff --check` and record the evidence, recommended unrun checks, and blockers in the checkpoint.

Use [write-tests](../write-tests/SKILL.md) for full-check thresholds: an explicit checks request, an applicable repository requirement, or a release boundary. Reuse current evidence. Do not mark the PR ready, push, or open a PR as part of this pass.

## Definition of done

An explicitly blocked or unverified behaviour remains incomplete. Report it as
such; recording a reason does not make required evidence optional or justify a
verified completion badge.

- Every in-scope behaviour is implemented and appropriately verified. Blocked work is recorded separately and prevents complete status.
- Every implemented behaviour has verification appropriate to its risk and layer under `write-tests`; distinguish automated tests, browser checks, static checks, and justified omissions.
- Required browser paths have current evidence or are reported as unverified with a reason.
- Specs and implementation plans accurately record the agreed behaviour, completion state and evidence, preserving the authorised scope.
- The complete task diff, including uncommitted changes, has been inspected and verified findings have been fixed.
- Directly relevant targeted test evidence is current; required full checks have current evidence or are recorded as unrun with a reason.
- A final drift and coverage check (`spec-audit-drift`, `spec-assess-coverage`) confirms that the selected acceptance criteria are satisfied and every material task addition serves an agreed requirement or justified necessary prerequisite.
- The final checkpoint records what shipped, verification performed, generated migration artifacts left uncommitted, remaining blockers, and any developer action.

Do not push, submit, open a PR, commit protected migration artifacts, implement unrelated future scope, or broaden the branch without explicit authorisation.

## Related skills

- `run-implementation-plan-all` — the same execution loop in a host goal
- `ask-questions` — batch blocking product decisions before coding
- `author-implementation-plan` — writes the plan
- `write-tests` — whether a chunk test should exist
- `spec-maintain-on-ship` — badges in the same change
- `spec-audit-drift` / `spec-assess-coverage` — the final gap check
- `branch-self-review` — final review of the actual task scope
- `ready-for-pr` — the explicit full local CI gate and draft-readiness workflow
