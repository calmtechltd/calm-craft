---
name: bug-regression-red-green
description: Fix a bug by writing a failing test that reproduces it first, then fixing the code until green, leaving a durable regression test with the bug narrative in its file header. Use when the user says "write a regression test", "red test first", "fix this bug properly", "make sure this never breaks again", or when fixing incorrect behaviour with no test covering the broken path.
---

# Bug Regression (Red–Green)

Prove the failure in a test **before** fixing it. The regression test stays in the tree so the bug can't come back quietly.

Test framework, layers, and locations: `.engineering/config.yaml`.

## When to use

- Fixing a bug where nothing currently tests the broken path.
- "Write a red test first" / "make sure this never breaks again."
- After `spec-triage-bug-report` returns **confirmed bug**.

**Not this skill:** new features (`spec-author-tests`), deciding whether it *is* a bug (`spec-triage-bug-report`).

## Workflow

### 1. Characterise the bug in plain language

Before any code:

- **Symptom** — what the user saw.
- **Expected** — what should have happened, and where that expectation comes from (a spec behaviour ID if there is one).
- **Scope** — the smallest reproducing case, not the whole scenario it was reported in.

### 2. Choose the layer

Unit for pure logic. Integration where it crosses the database, auth, or multiple steps. Follow the repo's location and naming conventions.

Pick the **narrowest layer that can actually reproduce it**. An integration test for a pure function is slow and vague; a unit test for a query-shape bug won't reproduce at all.

### 3. Write the red test

1. Write the **file header narrative** first — see below. It's the permanent record.
2. Seed the **minimal fixture**. Mirror the shape of the real data, not its volume.
3. Assert the **correct** outcome, so it fails against the broken code.

### 4. Confirm it fails for the right reason

Run it. Read the failure.

If it passes against broken code, it doesn't reproduce the bug — tighten the fixture or assert something deeper. If it fails for an unrelated reason (a missing fixture field, a typo), fix that and re-run until the failure is *the bug*.

**This step is not optional and is the one most often skipped.** A test that never went red proves nothing about the fix.

### 5. Fix until green

The smallest change that turns the test green. No opportunistic refactors riding along in the same change — they make the diff unreviewable and hide which edit actually fixed it.

Re-run the regression file, then adjacent tests if you touched shared code.

### 6. Leave it in place

Name tests after the **shape** of the bug, not the function — "refund on a partially paid invoice", not "test getRefundTotal". A future reader deciding whether to delete a test needs to know what it guards.

## File header template

A commit message is invisible six months later. A header comment is right there when someone considers deleting the test.

```
Regression — <one line: what must never break again>.

Bug (<date>): <symptom in user-visible terms>.
Root cause: <why the code produced the wrong result>.
These tests lock the fix: <what correct behaviour is now asserted>.
Spec context: <behaviour IDs, if a spec governs this>.
```

## Quality gate

- [ ] Bug narrative in the file header, with symptom and root cause.
- [ ] The test failed against the broken code, for the right reason.
- [ ] The fix is minimal; the test now passes.
- [ ] Layer matches what the bug actually touches.
- [ ] No unrelated production changes in the same commit.
- [ ] Test named after the bug's shape.

## Anti-patterns

- **Fixing first, then adding a test.** It asserts the happy path you just wrote and would never have caught the bug.
- **Skipping the red step** because the fix is obvious. Then you don't know the test works.
- **Testing implementation details** — private helpers, log lines — instead of observable behaviour.
- **One giant test** mixing unrelated cases. Split by bug shape.
- **Deleting the regression after merge.**

## Related skills

- `spec-triage-bug-report` — confirm it's a bug before fixing
- `spec-maintain-on-ship` — if the spec needs updating too
- `ready-for-pr` — gates before the pull request
