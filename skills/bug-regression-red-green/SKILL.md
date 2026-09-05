---
name: bug-regression-red-green
description: Fix a bug by reproducing it with a failing test, then fixing the code until green and preserving regression protection. Use when the user says "write a regression test", "red test first", "fix this bug properly", "make sure this never breaks again", or when fixing incorrect behaviour with no test covering the broken path.
---

# Bug Regression (Red–Green)

Apply [write-tests](../write-tests/SKILL.md) first. When automated protection is warranted, reproduce the failure before fixing it and preserve the reproducing conditions. An existing failing test can provide the red step; a bug fix does not require a new test file or duplicate scenario.

Test framework, layers, and locations: `.engineering/config.yaml`.

**Not this skill:** new features (`spec-author-tests`), deciding whether it _is_ a bug (`spec-triage-bug-report`). Apply `write-tests` first, including explicit skips and the repo's layer rules. Visual or click-only bugs follow the repo's browser verification policy instead of acquiring a component test solely to satisfy this workflow.

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

1. Find existing coverage and extend it where appropriate; a regression does not require a new file.
2. Make the symptom and expected behaviour clear in the test name. Add concise context when the fixture or failure would otherwise be hard to understand — see below.
3. Seed the **minimal fixture**. Mirror the shape of the real data, not its volume.
4. Assert the **correct** outcome, so it fails against the broken code.

### 4. Confirm it fails for the right reason

Run it. Read the failure.

If it passes against broken code, it doesn't reproduce the bug — tighten the fixture or assert something deeper. If it fails for an unrelated reason (a missing fixture field, a typo), fix that and re-run until the failure is _the bug_.

Confirming failure against broken code is required to show the test reproduces this regression. If the fix already exists, verify the test against the pre-fix implementation in a way that preserves current work and follows repository rules. A test written after the fix can still provide this evidence. If that check is blocked, report the limitation rather than claiming reproduction.

### 5. Fix until green

The smallest change that turns the test green. No opportunistic refactors riding along in the same change — they make the diff unreviewable and hide which edit actually fixed it.

Re-run the regression file, then directly affected adjacent tests if the fix changed shared behaviour. Keep the required red-green check with its assigned owner; the coordinator can reuse that evidence instead of repeating it. Do not trigger the full suite or readiness gates solely because this is a bug fix.

### 6. Preserve the protection

Name tests after the **shape** of the bug, not the function — "refund on a partially paid invoice", not "test getRefundTotal". A future reader deciding whether to delete a test needs to know what it guards.

During authorised cleanup, an existing regression test may be consolidated into equivalent coverage. Preserve the reproducing condition and outcome; the historical file or separate test case is not itself the contract.

## Regression context

Keep context proportional to the bug. A descriptive name may be enough. For a subtle regression, put a short comment beside the relevant test explaining the non-obvious fixture, cause, or spec ID. Use a file header only when the whole file needs that context. For example:

```
// B5 — the refund limit uses the amount received, not the invoice total.
// A partially paid fixture catches the previous over-refund calculation.
```

## Related skills

- `write-tests` — layer and whether a test belongs at all
- `spec-triage-bug-report` — confirm it's a bug before fixing
- `spec-maintain-on-ship` — if the spec needs updating too
- `ready-for-pr` — full gates only when explicitly requested or required by repository policy
