---
name: run-implementation-plan
description: Complete the incomplete behaviours in current scope — read the scoped specs, build a queue, and keep working across turns until the definition of done is satisfied. Use when the user says "run the implementation plan", "continue the plan", "finish the scoped work", "complete the incomplete behaviours", "ship B4", or names a chunk ID.
---

# Run an Implementation Plan

Complete the agreed implementation scope.

Treat the scoped specs as the source of truth. Keep working across turns until the definition of done below is satisfied. Do not expand into unrelated specs, unscheduled future behaviours, or another feature area.

The card is the unit of work: one behaviour or implementation-plan chunk per pass. Continue through the agreed scope, which may be one named card or the whole plan.

Commands and paths: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md). Repo-specific extras: `paths.goal` (default `.engineering/goal.md`). Use host continuation tools only when the user has authorised that mode; an ordinary implementation request does not create a persistent goal.

**Not this skill:** writing a plan (`author-implementation-plan`). A named card or "the next chunk" limits the run to that card unless the user has already asked to finish the wider plan. "Finish the plan" means continue through its scoped queue.

## Host continuation

After each card, if dependency-ready work remains inside the agreed scope, continue without another prompt.

1. **Same session, if context is healthy** — start the next card immediately.
2. **New turn required** — same scope, same checkpoint:
   - **An already-authorised host goal** — continue with the same scope and checkpoint. Do not create a new goal or automation merely to keep working.
   - **Neither** — keep working in this session anyway.

Do not reset `.active/` on a continuation turn. If I attached supplementary text, or the goal overlay exists, honour it. Slash text wins for this run.

## Before implementation

- Read every scoped spec, its linked implementation plan or design document, and the repository rules.
- Identify behaviour statuses, dependencies, existing implementation, test coverage, and Open Questions.
- Resolve questions only when authoritative evidence in the specs, code, tests, or linked decisions establishes the answer.
- Batch genuinely blocking product decisions for me before coding via [`ask-questions`](../ask-questions/SKILL.md). Do not invent a product decision. If I tell you not to stop for questions, skip blocked behaviours and record them instead.
- Build a dependency-ordered work queue. Work on one behaviour or implementation-plan chunk at a time.
- Keep a concise checkpoint under `.active/` containing the scope, queue, completed cards, verification evidence, current database state, blockers, and next action. Do not commit `.active/`.

The coordinating agent owns verification across the run. Give each worker an explicit file/behaviour scope and a targeted check budget; workers must not independently invoke readiness, whole-repository gates, or sibling review workflows. Reuse their reported command, result, and covered changes. Repeat a check only when later changes can invalidate it.

Starting card, in order: the ID I named; the plan's "Next up" marker; the first incomplete chunk in execution order. **Verify Depends on either way.** If prerequisites aren't complete and you cannot complete them inside this scope, record the blocker — do not skip ahead. If everything is complete, say so; don't start new scope.

## For each card

1. Read the complete relevant spec and acceptance criteria. Read the flow contract, storyboard evidence for affected states, and the exact transitions assigned to this card. The YAML governs; Mermaid is a human view. Read **Work**, **Done when**, **Out of scope**. Out of scope is a hard wall. If the code seems to need an undeclared transition, stop and change the contract first.
2. Check the implementation for drift and assess existing test coverage.
3. Add or update tests only where `write-tests` says they earn their keep. Preserve meaningful permission, tenancy, invariant, decision-table, and regression protection. Cover applicable guard outcomes and server/lib transitions through existing or table-driven scenarios where possible; do not require a separate test for every ID or mount pages to fill a coverage table.
4. Implement until the acceptance criteria are met and the appropriate verification passes. Follow the repo's conventions. If you add a dependency, use `package_manager` from the config — never guess `npm` vs `pnpm`. Do not commit `.env` or put a real secret in `.env.example`.
5. Use focused browser verification when needed to establish changed user-facing behaviour and permitted by the user's scope and repository policy. The coordinating agent batches distinct affected journeys in one app session; workers do not each start the app. Reuse current evidence, honour an explicit skip, and report any required check left unrun.
6. If this repo's tests build their database from source schema (often `src/db/schema/**`), do not run `commands.db_generate` or `commands.db_migrate` merely to make tests see a schema change.
7. Run `commands.db_generate` only when generated migration files must be verified, or when a real app or browser path needs the schema change. Run `commands.db_migrate` only when that real database needs those generated or committed migrations. Omit both steps when the config does not define them.
8. Treat database coordination notices as informational. Do not ask me to confirm an external chat or ticket state. Keep generated migration artifacts uncommitted unless I have explicitly authorised committing them.
9. Update the spec and implementation plan so behaviour badges, tickets, Open Questions, and completion state match reality (`spec-maintain-on-ship`). Mark the chunk complete with a dated status line and advance "Next up".
10. Inspect **this card's diff only**, including staged and untracked task files. Run the smallest directly relevant test command when meaningful behaviour changed or a test was added/updated; batch it after the coherent slice rather than after every edit. Preserve a separate red run when proving a regression. Do not run application tests for prose-only changes; use relevant schema or syntax validation for configuration changes. Apply required changed-file checks, including an affected UI suite when the repo requires it. Do not run repository-wide formatting. Broader lint, TypeScript, knip, `commands.test`, or readiness checks require an applicable repository rule or explicit checks request; they are not per-card ceremony. Run `git diff --check` and apply `review.always_check` from the config.
11. Clean only temporary or generated output created by this card whose removal is proven safe. Never delete pre-existing or unexplained files, and never discard migration artifacts blindly.
12. If local commits are authorised and `commands.checkpoint_commit` is set, create a local checkpoint commit through that command, update the checkpoint file, and continue to the next dependency-ready card without waiting for another prompt. Otherwise update the checkpoint and continue; a configured command alone is not permission to commit.

Then go back to card step 1 for the next dependency-ready card. Use the host continuation rules when a new turn is required.

Stop the card loop when the agreed scope is done or all remaining in-scope work is blocked. Record blocked cards and continue with independent in-scope work.

Then run **close-out** once — not after every card.

## Close-out (once)

1. Review the complete task scope through `branch-self-review`, including committed, staged, unstaged, and untracked task changes. Fix verified in-scope findings; exclude unrelated pre-existing work.
2. Run any required targeted checks not already covered by current evidence. Do not repeat successful worker checks or automatically run repository-wide gates.
3. Check spec drift and coverage only for the behaviours changed by this plan. If that produces in-scope work, treat it as another card and repeat the targeted evidence affected by that work.
4. Run `git diff --check` and record the evidence, recommended unrun checks, and blockers in the checkpoint.

Use [write-tests](../write-tests/SKILL.md) for full-check thresholds: an explicit checks request, an applicable repository requirement, or a release boundary. Reuse current evidence. Do not mark the PR ready, push, or open a PR as part of this pass.

## Definition of done

An explicitly blocked or unverified behaviour remains incomplete. Report it as
such; recording a reason does not make required evidence optional or justify a
verified completion badge.

- Every in-scope behaviour is implemented and appropriately verified. Blocked work is recorded separately and prevents complete status.
- Every implemented behaviour has verification appropriate to its risk and layer under `write-tests`; distinguish automated tests, browser checks, static checks, and justified omissions.
- Required browser paths have current evidence or are reported as unverified with a reason.
- Specs and implementation plans accurately describe the final behaviour and state.
- The complete task diff, including uncommitted changes, has been inspected and verified findings have been fixed.
- Directly relevant targeted test evidence is current; required full checks have current evidence or are recorded as unrun with a reason.
- A final spec drift and coverage check (`spec-audit-drift`, `spec-assess-coverage`) finds no unaddressed in-scope gap.
- The final checkpoint records what shipped, verification performed, generated migration artifacts left uncommitted, remaining blockers, and any developer action.

Do not push, submit, open a PR, commit protected migration artifacts, implement unrelated future scope, or broaden the branch without explicit authorisation.

## Related skills

- `run-implementation-plan-all` — the same loop, named as finish the plan
- `ask-questions` — batch blocking product decisions before coding
- `author-implementation-plan` — writes the plan
- `write-tests` — whether a chunk test should exist
- `spec-maintain-on-ship` — badges in the same change
- `spec-audit-drift` / `spec-assess-coverage` — the final gap check
- `branch-self-review` — final review of the actual task scope
- `ready-for-pr` — the explicit full local CI gate and draft-readiness workflow
