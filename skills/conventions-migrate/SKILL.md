---
name: conventions-migrate
description: A convention decision changed — find the code that violates it and fix it in reviewable batches, then tighten the lint rule from warning to error. Use when the user says "we changed the export rule", "migrate the code to match", "we decided to ban X, go fix it", or after conventions-decide reports existing violations blocking a rule from being an error.
---

# Conventions Migrate

A decision in `.engineering/conventions.yaml` changed, or was made for the first time against a codebase that doesn't comply. Fix the code.

This skill exists so that **deciding doesn't feel permanent**. Teams avoid writing conventions down because a wrong answer feels expensive to reverse. It isn't, if changing your mind comes with a migration.

## When to use

- "We've decided to ban default exports — go fix them."
- `conventions-decide` reported violations keeping a rule at warning.
- Adopting conventions on an existing codebase.

**Not this skill:** deciding (`conventions-decide`), reporting without fixing (`conventions-audit`).

## Workflow

### 1. Confirm the decision, then the blast radius

Read the decision from `conventions.yaml`. If I asked for a change that isn't recorded yet, update the file **first** — the decision precedes the migration, and a migration with no recorded decision is just a large unexplained diff.

Then find every violation and report, before changing anything:

- Total count, and the count by directory or module.
- Which are **mechanical** (a rename, an import rewrite) and which need **judgement**.
- Anything generated, vendored, or otherwise excluded.

If the count is large enough to be worth reconsidering, say so. "This is 340 files across every module" is information I may want before you start.

### 2. Batch by area

**Never one giant commit.** Batch by module or directory, ordered so the least risky goes first. State the batch plan and let me object.

A batch is one reviewable unit: a coherent area, a single mechanical transformation, and a test run.

### 3. Migrate one batch at a time

For each batch:

1. Apply the change.
2. Run the type check and the tests for the affected area, using `commands` from `.engineering/config.yaml`.
3. **Stop if anything goes red.** Do not continue into the next batch on a broken tree — diagnose, fix, or revert the batch and report.
4. Report what changed before moving on.

Where a violation can't be fixed mechanically, **list it rather than guessing**. A judgement call disguised as a codemod is how migrations introduce bugs.

### 4. Tighten the rule

Once the codebase is clean:

- Flip the lint rule from warning to error.
- Remove scoped ignores the migration made unnecessary.
- Verify the rule fires on a deliberate violation, then remove it.
- Update the decision's `status` to `decided` in `conventions.yaml`.

A migration that leaves the rule at warning hasn't finished — the codebase will drift straight back.

### 5. Hand back

- Batches completed, files changed per batch.
- Test results per batch.
- Violations left unfixed, with the reason each needs a human.
- Whether the rule is now an error, and any ignores still in place.

## Quality gate

- [ ] The decision is recorded in `conventions.yaml` before any code changed.
- [ ] Blast radius reported before the first edit.
- [ ] Work batched by area; tests run between batches.
- [ ] Nothing proceeded past a red test run.
- [ ] Judgement cases listed, not guessed.
- [ ] Rule tightened to error and verified, or the reason it can't be is reported.

## Anti-patterns

- **One commit touching 300 files.** Unreviewable, and unrevertable when one case was wrong.
- **Migrating without recording the decision.** Six months on, nobody knows why the codebase changed.
- **Continuing past red tests** because the remaining batches are "the same change".
- **Guessing at judgement cases** to finish the count.
- **Leaving the rule at warning.** Then you did the work and kept the drift.

## Related skills

- `conventions-decide` — where decisions are recorded
- `conventions-audit` — finds violations without fixing them
- `conventions-revisit` — surfaces decisions worth changing in the first place
