---
name: branch-self-review
description: Review this branch's committed changes against the merge-base for functional bugs, permission and tenancy holes, and risky code paths, like a review bot would, before anyone else sees it. Use when the user says "review my branch", "find issues in my changes", "what could break here", or before opening a pull request. Reports only — never edits product code and never runs the gates.
---

# Branch Self-Review

Review your own diff before anyone else does. Functional bugs, permission and tenancy holes, risky paths, convention gaps.

**Read-only for product code.** It writes a report and fixes nothing — an auditor that can edit can make its own findings disappear. It also doesn't run typecheck or tests; `ready-for-pr` owns whole-repo gates. The implementation loop does not run those gates either.

Default branch, report path, and always-check conventions: `.engineering/config.yaml`.

## When to use

- "Review my branch before I open a pull request."
- "What could break in this diff?"
- After finishing a chunk, before `ready-for-pr`.

**Not this skill:** running gates (`ready-for-pr`), convention compliance (`conventions-audit`), processing bot feedback on an existing pull request (`coderabbit-review-triage`).

## Workflow

### 1. Scope against the merge-base

```
git merge-base HEAD origin/<default_branch>
```

Then the full diff and log from that base to HEAD. **Committed changes, not the working tree**, unless I explicitly ask otherwise. If the diff is empty, say so and stop.

### 2. Read surrounding code

For each changed file: the full module, or at least the changed functions plus their imports; the **callers and callees**; and a sibling file for the established pattern.

Permission and tenancy checks usually live outside the changed lines — in middleware, a shared helper, a parent layout. **A diff-only review misses exactly the class of bug this skill exists to catch.**

### 3. Review

| Dimension           | Look for                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Functional**      | Edge cases, null and undefined, async and error handling, partial failure, idempotency                               |
| **Permissions**     | Authorisation checked; nothing trusting a client-supplied identity                                                   |
| **Tenancy**         | Scoping applied on reads _and_ writes                                                                                |
| **Secrets**         | `.env` or credentials in the diff; a real value in `.env.example`; a new `NEXT_PUBLIC_` / `VITE_` / `PUBLIC_` secret |
| **Code paths**      | Unreachable branches, missing returns, swallowed errors                                                              |
| **Conventions**     | Whatever `review.always_check` lists in the config                                                                   |
| **Tests and specs** | Changed behaviour with no test, or a spec that now disagrees                                                         |

### 4. Grade

| Severity     | When                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| **Critical** | Security or tenancy hole, data loss, definite runtime break, auth bypass |
| **Major**    | Likely bug, missing check, wrong code path, important behaviour untested |
| **Minor**    | Convention drift, weak error handling, maintainability                   |
| **Nitpick**  | Naming, docs, readability                                                |

### 5. Verify before reporting

Before a finding survives:

1. Confirm it exists on the current branch.
2. Check whether middleware, a shared helper, or a parent already handles it.
3. Check sibling code — if the same omission is deliberate and consistent, that's a pattern question, not a defect.

Drop what's already handled. **Fewer verified findings beat a long speculative list** — a reviewer that cries wolf gets ignored, which is worse than no reviewer. If unsure a Critical is real, downgrade it.

### 6. Report

Write to the reports path: scope (branch, merge-base, diff stat, changed files) and findings grouped by severity with a by-file index.

Inline: the counts, the report path, and **every Critical and Major** as a one-liner with `file:line`. Each finding carries severity, location, what, impact, and a suggested direction — no code edits.

Then: fix the Critical and Major findings, run `ready-for-pr`, open the pull request.

## Quality gate

- [ ] Scoped against merge-base, not the working tree.
- [ ] Changed files read with surrounding context, not diff-only.
- [ ] Every finding verified against current code.
- [ ] Critical and Major have concrete `file:line` and stated impact.
- [ ] No product code modified.
- [ ] No gates run.

## Anti-patterns

- **Reviewing the hunk alone.** Permissions and tenancy live elsewhere.
- **Speculative Criticals.** If unsure, downgrade or omit.
- **Fixing during review.**
- **Running tests here.** Different skill, different job.
- **Reviewing uncommitted changes** when asked for a branch review.

## Related skills

- `ready-for-pr` — the gates
- `coderabbit-review-triage` — process a bot review on an open PR
- `conventions-audit` — convention compliance specifically
- `bug-regression-red-green` — for a real bug this found
