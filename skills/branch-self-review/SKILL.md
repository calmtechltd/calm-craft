---
name: branch-self-review
description: Review a branch or the current task's changes for functional bugs, permission and tenancy holes, and maintainability problems. Use when the user asks to review changes or an implementation workflow calls for final review. Reports findings without editing product code or running whole-repository gates.
---

# Branch Self-Review

Review your own diff before anyone else does. Functional bugs, permission and tenancy holes, risky paths, convention gaps.

**Read-only for product code.** Report findings; the calling implementation workflow can then fix them within its authorised scope. Do not run whole-repository gates here. A focused read-only check may be used to verify a suspected finding when its cost is justified.

Default branch, report path, and always-check conventions: `.engineering/config.yaml`.

**Not this skill:** running gates (`ready-for-pr`), convention compliance (`conventions-audit`), processing bot feedback on an existing pull request (`coderabbit-review-triage`).

## Workflow

### 1. Scope against the merge-base

```
git merge-base HEAD origin/<default_branch>
```

For a committed branch or PR review, read the full diff and log from that base to HEAD. For a review of current work or an implementation close-out, also include task-owned staged, unstaged, and untracked files. Use the caller's scope and starting worktree baseline to distinguish task changes from unrelated work. Report what was included; do not require a commit to make changes reviewable.

Only report an empty scope after checking all the requested surfaces. Read untracked task files directly because `git diff` does not include them.

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
| **Structure**      | Repeated business rules, unnecessary forwarding layers, speculative options, or inconsistent patterns; trace callers and the existing abstraction before suggesting a change |
| **Conventions**     | Whatever `review.always_check` lists in the config                                                                   |
| **Tests and specs** | Missing meaningful protection under `write-tests`, stale verification evidence, or a spec that disagrees; do not flag deliberately omitted low-value tests or repository-approved browser checks as missing unit tests |

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
3. Check sibling code and the governing requirement. A consistent implementation can still contain a repeated bug; similarity alone neither proves nor excuses a defect.

Drop what's already handled. State confidence separately from impact: an uncertain security issue is not a minor issue merely because it needs investigation. Keep speculative concerns out of confirmed findings. For maintainability findings, name the responsibility, the avoidable maintenance cost, and a concrete simplification; short functions, literal assertions, or repeated syntax alone are not defects.

### 6. Report

For a substantial review or when the calling workflow requires a report, write to the configured reports path with scope, findings, and evidence. A small review may be reported inline without creating an artifact.

Inline: the counts, the report path, and **every Critical and Major** as a one-liner with `file:line`. Each finding carries severity, location, what, impact, and a suggested direction — no code edits.

Return findings to the caller. Review alone does not authorise fixes, publishing, or another workflow; an implementation task may already authorise fixing in-scope findings.

## Related skills

- `ready-for-pr` — the gates
- `coderabbit-review-triage` — process a bot review on an open PR
- `conventions-audit` — convention compliance specifically
- `bug-regression-red-green` — for a real bug this found
