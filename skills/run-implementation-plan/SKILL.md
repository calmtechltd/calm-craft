---
name: run-implementation-plan
description: Complete the incomplete behaviours in current scope — read the scoped specs, build a queue, and keep working across turns until the definition of done is satisfied. Use when the user says "run the implementation plan", "continue the plan", "finish the scoped work", "complete the incomplete behaviours", "ship B4", or names a chunk ID.
---

# Run an Implementation Plan

Complete the incomplete behaviours in current scope. You can confirm this if unsure.

Treat the scoped specs as the source of truth. Keep working across turns until the definition of done below is satisfied. Do not expand into unrelated specs, unscheduled future behaviours, or another feature area.

The card is still the unit of work: one behaviour or implementation-plan chunk per pass. The skill does not stop after the first card.

Commands and paths: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md). Host `/goal` (Cursor, Codex, and others) starts this loop. Repo-specific extras: `paths.goal` (default `.engineering/goal.md`).

## When to use

- `/goal` / "complete the incomplete behaviours in current scope".
- "Run the implementation plan" / "finish the plan" / "run them all" / `run-implementation-plan-all`.
- "Do the next chunk" / "ship B4" / "run E1."

**Not this skill:** writing a plan (`author-implementation-plan`). A named chunk starts there; it does not mean "stop after it" unless I say **only** that chunk.

## Host continuation

After each card, if dependency-ready work remains, **do not wait for another prompt**.

1. **Same session, if context is healthy** — start the next card immediately.
2. **New turn required** — same scope, same checkpoint:
   - **Hosts with `/goal`** (Cursor, Codex, and others) — `/goal` with the same scope. The interval is "next card". The stop condition is the definition of done, not a clock.
   - **Neither** — keep working in this session anyway.

Do not reset `.active/` on a continuation turn. If I attached supplementary text, or the goal overlay exists, honour it. Slash text wins for this run.

## Before implementation

- Read every scoped spec, its linked implementation plan or design document, and the repository rules.
- Identify behaviour statuses, dependencies, existing implementation, test coverage, and Open Questions.
- Resolve questions only when authoritative evidence in the specs, code, tests, or linked decisions establishes the answer.
- Batch genuinely blocking product decisions for me before coding via [`ask-questions`](../ask-questions/SKILL.md). Do not invent a product decision. If I tell you not to stop for questions, skip blocked behaviours and record them instead.
- Build a dependency-ordered work queue. Work on one behaviour or implementation-plan chunk at a time.
- Keep a concise checkpoint under `.active/` containing the scope, queue, completed cards, verification evidence, current database state, blockers, and next action. Do not commit `.active/`.

Starting card, in order: the ID I named; the plan's "Next up" marker; the first incomplete chunk in execution order. **Verify Depends on either way.** If prerequisites aren't complete and you cannot complete them inside this scope, record the blocker — do not skip ahead. If everything is complete, say so; don't start new scope.

## For each card

1. Read the complete relevant spec and acceptance criteria. Read the flow contract and the exact transitions assigned to this card. The YAML governs; Mermaid is a human view. Read **Work**, **Done when**, **Out of scope**. Out of scope is a hard wall. If the code seems to need an undeclared transition, stop and change the contract first.
2. Check the implementation for drift and assess existing test coverage.
3. Add or update tests that prove the specified behaviour, but only where `write-tests` says they earn their keep. Include permission, tenancy, invariant, decision-table, and regression cases where applicable. Each cited flow transition gets a test, and each behavioural guard gets both branches, where there is a test surface for it — not a page mock, not a type the compiler already checks.
4. Implement until the relevant tests pass. Follow the repo's conventions. If you add a dependency, use `package_manager` from the config — never guess `npm` vs `pnpm`. Do not commit `.env` or put a real secret in `.env.example`.
5. Use browser testing for genuinely user-facing paths. Exercise the local app when the acceptance criteria require observable UI behaviour. Actually do it; don't assume.
6. If this repo's tests build their database from source schema (often `src/db/schema/**`), do not run `commands.db_generate` or `commands.db_migrate` merely to make tests see a schema change.
7. Run `commands.db_generate` only when generated migration files must be verified, or when a real app or browser path needs the schema change. Run `commands.db_migrate` only when that real database needs those generated or committed migrations. Omit both steps when the config does not define them.
8. Treat database coordination notices as informational. Do not ask me to confirm an external chat or ticket state. Keep generated migration artifacts uncommitted unless I have explicitly authorised committing them.
9. Update the spec and implementation plan so behaviour badges, tickets, Open Questions, and completion state match reality (`spec-maintain-on-ship`). Mark the chunk complete with a dated status line and advance "Next up".
10. Verify **this card's diff only** — keep it cheap. Run the tests that cover the behaviour you just changed (`commands.test_file` when the config has it — never `commands.test`). Lint and format only the files this card touched. If a type checker accepts paths, pass only those files. Do **not** run whole-programme `commands.types` (`tsc --noEmit` with no file list), `commands.deadcode` / knip, `commands.test`, or `ready-for-pr` after a card. Review the card's complete diff and fix verified functional, permission, tenancy, and coverage findings. Use `review.always_check` from the config.
11. Clean only temporary or generated output created by this card whose removal is proven safe. Never delete pre-existing or unexplained files, and never discard migration artifacts blindly.
12. If `commands.checkpoint_commit` is set, create a local checkpoint commit through that command, update the checkpoint file, and continue to the next dependency-ready card without waiting for another prompt. If it is not set, update the checkpoint and continue; do not invent a commit tool, and do not commit unless I asked.

Then go back to card step 1 for the next dependency-ready card. Use the host continuation rules when a new turn is required.

Stop the card loop when every in-scope card is done, I asked for **only** one named chunk, or the remaining work is blocked by a decision or external dependency. Skip a blocked card, record it, and continue with anything that does not depend on it.

Then run **close-out** once — not after every card.

## Close-out (once, then until green)

The cheap per-card pass does not see importers of a type you changed, unused exports, or the rest of the suite. That is what this pass is for. Run it after the last in-scope card of this run.

1. Branch self-review (`branch-self-review`) and fix verified findings.
2. Run the config's `gates` in order — typically `setup`, then whole-programme `commands.types`, lint, `commands.deadcode` (knip), and `commands.test`. This is the expensive pass. It happens **once per close-out**, not after each card.
3. Fix failures this branch introduced. Re-run the failed gate and any later gate the fix could have affected. Loop until green. Do not suppress types or lint to get there.
4. Spec drift and coverage (`spec-audit-drift`, `spec-assess-coverage`). If that produces in-scope work, treat it as another card, then return here — do not skip the gates after that extra work.
5. Record close-out evidence in the checkpoint.

Do **not** mark the PR ready, push, or open a PR as part of this pass. `ready-for-pr` still owns publishing. You are running the same commands so the branch is actually green.

## Definition of done

- Every in-scope behaviour is implemented or explicitly recorded as blocked by a decision or external dependency.
- Every implemented behaviour, invariant, and decision-table row has appropriate test evidence — only the tests `write-tests` would allow.
- Required browser paths have been exercised successfully.
- Specs and implementation plans accurately describe the final behaviour and state.
- A full branch self-review has been performed (`branch-self-review`) and verified findings have been fixed.
- Close-out gates have been run **once at the end** and looped until green — whole-programme types, lint, knip / dead code, and the test suite, in the config's `gates` order. They were not run after each card.
- A final spec drift and coverage check (`spec-audit-drift`, `spec-assess-coverage`) finds no unaddressed in-scope gap.
- The final checkpoint records what shipped, verification performed, generated migration artifacts left uncommitted, remaining blockers, and any developer action.

Do not push, submit, open a PR, commit protected migration artifacts, implement unrelated future scope, or broaden the branch without explicit authorisation.

## Quality gate

- [ ] Every scoped spec, plan, and Open Question read before the first card.
- [ ] Queue is dependency-ordered; blockers batched or recorded, not invented through.
- [ ] Each card followed the twelve steps, including tests before calling it done.
- [ ] Nothing implemented outside Work, or inside Out of scope.
- [ ] No undeclared transition, guard, bypass, or exit added.
- [ ] Schema generate and migrate ran only when the config defines them and the card actually needed them.
- [ ] Spec badges, plan, and `.active/` checkpoint match reality after each card.
- [ ] The skill did not stop while dependency-ready work remained, unless I asked for only one chunk.
- [ ] Close-out ran self-review, then the heavy gates once, then looped until green; knip and whole-programme types were not run after each card.

## Anti-patterns

- **Stopping after the first card** because the old skill did. The loop is the job.
- **Two cards in one pass** because the second is small. The most common failure.
- **Inventing a product decision** so the queue can keep moving.
- **Running schema generate or migrate to make tests pass** when tests already build from source schema.
- **Asking me to confirm an external Slack or ticket state.**
- **Committing generated migration artifacts** without explicit authorisation.
- **Pushing or opening a pull request** as part of the loop.
- **Using `/loop` on a wall-clock interval** instead of "next card until done".
- **Running whole-programme typecheck, knip, or the full test suite after every card.** That is the close-out pass. The usual time sink is `tsc --noEmit` on the whole repo — save it for the end.
- **Skipping close-out gates** because the per-card path-scoped checks were green. A shared type can still break files this card did not touch.

## Related skills

- `run-implementation-plan-all` — the same loop, named as finish the plan
- `ask-questions` — batch blocking product decisions before coding
- `author-implementation-plan` — writes the plan
- `write-tests` — whether a chunk test should exist
- `spec-maintain-on-ship` — badges in the same change
- `spec-audit-drift` / `spec-assess-coverage` — the final gap check
- `branch-self-review` — review the branch before anyone else
- `ready-for-pr` — the same gates, plus marking a draft PR ready; this loop runs the gates at close-out but does not publish
