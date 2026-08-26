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

1. Read the complete relevant spec and acceptance criteria. Read the flow contract, storyboard evidence for affected states, and the exact transitions assigned to this card. The YAML governs; Mermaid is a human view. Read **Work**, **Done when**, **Out of scope**. Out of scope is a hard wall. If the code seems to need an undeclared transition, stop and change the contract first.
2. Check the implementation for drift and assess existing test coverage.
3. Add or update tests that prove the specified behaviour, but only where `write-tests` says they earn their keep. Include permission, tenancy, invariant, decision-table, and regression cases where applicable. Each cited flow transition gets a test, and each behavioural guard gets both branches, where there is a test surface for it — not a page mock, not a type the compiler already checks.
4. Implement until the relevant tests pass. Follow the repo's conventions. If you add a dependency, use `package_manager` from the config — never guess `npm` vs `pnpm`. Do not commit `.env` or put a real secret in `.env.example`.
5. Treat browser and running-app verification as explicit-only. A user-facing path, acceptance criterion, or unresolved risk may identify a useful browser check but does not authorise starting the app, opening a URL, using browser automation, or signing in. Run it only when the user explicitly asks for browser or manual app verification in the current request; otherwise record the recommended check as unrun. When requested, batch checks once, prefer embedded or headless tooling, and never open an external GUI browser unless the user specifically asks for that too.
6. If this repo's tests build their database from source schema (often `src/db/schema/**`), do not run `commands.db_generate` or `commands.db_migrate` merely to make tests see a schema change.
7. Run `commands.db_generate` only when generated migration files must be verified, or when a real app or browser path needs the schema change. Run `commands.db_migrate` only when that real database needs those generated or committed migrations. Omit both steps when the config does not define them.
8. Treat database coordination notices as informational. Do not ask me to confirm an external chat or ticket state. Keep generated migration artifacts uncommitted unless I have explicitly authorised committing them.
9. Update the spec and implementation plan so behaviour badges, tickets, Open Questions, and completion state match reality (`spec-maintain-on-ship`). Mark the chunk complete with a dated status line and advance "Next up".
10. Inspect **this card's diff only**. Run one smallest directly relevant test command only when behavioural server/lib logic changed, an existing test covers the change, or this card added/updated a test; batch it after the coherent slice rather than after every edit. Do not run tests for documentation, instructions, configuration, copy, labels, static styling, or layout-only changes. Do not run lint, formatting, TypeScript, knip, `commands.test`, or `ready-for-pr` during the card. Run `git diff --check`, review the scoped diff, and apply `review.always_check` from the config.
11. Clean only temporary or generated output created by this card whose removal is proven safe. Never delete pre-existing or unexplained files, and never discard migration artifacts blindly.
12. If `commands.checkpoint_commit` is set, create a local checkpoint commit through that command, update the checkpoint file, and continue to the next dependency-ready card without waiting for another prompt. If it is not set, update the checkpoint and continue; do not invent a commit tool, and do not commit unless I asked.

Then go back to card step 1 for the next dependency-ready card. Use the host continuation rules when a new turn is required.

Stop the card loop when every in-scope card is done, I asked for **only** one named chunk, or the remaining work is blocked by a decision or external dependency. Skip a blocked card, record it, and continue with anything that does not depend on it.

Then run **close-out** once — not after every card.

## Close-out (once)

1. Inspect the complete branch diff and fix verified in-scope functional, permission, tenancy, and coverage findings.
2. Run any directly relevant targeted tests not already covered by current evidence, once. Do not run repository-wide TypeScript, lint, knip, UI, or test-suite gates.
3. Check spec drift and coverage only for the behaviours changed by this plan. If that produces in-scope work, treat it as another card and repeat the targeted evidence affected by that work.
4. Run `git diff --check` and record the evidence, recommended unrun checks, and blockers in the checkpoint.

Full local CI gates belong exclusively to `ready-for-pr` when the user explicitly asks for readiness or checks. Otherwise CI owns them. Do not mark the PR ready, push, or open a PR as part of this pass.

## Definition of done

- Every in-scope behaviour is implemented or explicitly recorded as blocked by a decision or external dependency.
- Every implemented behaviour, invariant, and decision-table row has appropriate test evidence — only the tests `write-tests` would allow.
- Browser paths explicitly requested by the user have been exercised successfully; other recommended browser checks are recorded as unrun.
- Specs and implementation plans accurately describe the final behaviour and state.
- The complete branch diff has been inspected and verified findings have been fixed.
- Directly relevant targeted test evidence is current; full local CI gates are recorded as unrun unless the user explicitly requested `ready-for-pr`.
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
- [ ] Close-out inspected the full diff and ran only warranted targeted evidence; it did not run TypeScript, lint, knip, UI, or full-suite gates without an explicit readiness request.

## Anti-patterns

- **Stopping after the first card** because the old skill did. The loop is the job.
- **Two cards in one pass** because the second is small. The most common failure.
- **Inventing a product decision** so the queue can keep moving.
- **Running schema generate or migrate to make tests pass** when tests already build from source schema.
- **Asking me to confirm an external Slack or ticket state.**
- **Committing generated migration artifacts** without explicit authorisation.
- **Pushing or opening a pull request** as part of the loop.
- **Using `/loop` on a wall-clock interval** instead of "next card until done".
- **Running lint, typecheck, knip, UI, or the full test suite as implementation ceremony.** Those are `ready-for-pr` gates and require an explicit user request.

## Related skills

- `run-implementation-plan-all` — the same loop, named as finish the plan
- `ask-questions` — batch blocking product decisions before coding
- `author-implementation-plan` — writes the plan
- `write-tests` — whether a chunk test should exist
- `spec-maintain-on-ship` — badges in the same change
- `spec-audit-drift` / `spec-assess-coverage` — the final gap check
- `branch-self-review` — a separate explicit branch audit
- `ready-for-pr` — the explicit full local CI gate and draft-readiness workflow
