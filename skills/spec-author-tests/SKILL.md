---
name: spec-author-tests
description: Write tests from a feature spec, treating the spec and its flow contract as the source of truth, stubbing pending tests where implementation is missing and halting when code and spec disagree. Use when the user says "write tests from this spec", "fill the coverage gaps", "prove this wizard works", or after spec-assess-coverage identifies what is untested.
---

# Author Tests From a Spec

Turn behaviours, invariants, decision-table rows, and flow transitions into tests. The spec is the source of truth; the tests demonstrate it.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Framework, patterns, and file conventions: `.engineering/config.yaml`.

## When to use

- "Write tests from this spec."
- Filling gaps `spec-assess-coverage` found.
- Proving a wizard's navigation and recovery paths.

**Not this skill:** assessing what's missing (`spec-assess-coverage`), a regression test for a reported bug (`bug-regression-red-green`).

## Workflow

### 1. Select the surface

Confirm which behaviours, invariants, rows, and transitions are in scope. Default to what `spec-assess-coverage` reported uncovered. For guards, both branches are separate tests.

### 2. Pick the layer

Unit for pure logic; integration where it crosses the database, auth, or multiple steps. Follow the location and naming conventions in `config.yaml`.

### 3. Write tests named after the requirement

Name each test after the **documented intent**, and cite the ID:

```
B5 — a partially paid invoice can be refunded up to the amount received
F1.T3 — validation failure returns to upload with the reason shown
Decision table row 4 — an expired grace period marks the payment overdue
```

A future reader must be able to go from a failing test to the thing it was protecting without reading the implementation. This is why the naming matters more than usual.

Assert the **documented outcome**, not what the code currently returns. A test written by observing current behaviour proves the code does what it does — which is worth nothing.

### 4. Stub what isn't built

Where the spec describes behaviour that doesn't exist yet (🔵, or 🟡 for the missing part), write a pending test using the framework's todo or skip marker — never a passing empty test. Each carries a traceability comment naming the ID and why it's pending:

```
// TODO B7 — future: notification on late completion. Spec: specs/<path>.md
```

Pending tests are the honest record of the gap and they surface the moment the work lands.

### 5. Halt on disagreement — do not reconcile

If the implementation appears to contradict the spec, **stop**. Do not change the test to match the code, and do not change the code to match the spec.

Report: the ID, what the spec says, what the code does, and both possibilities — spec is stale (→ `spec-maintain-on-ship`) or code is wrong (→ `bug-regression-red-green`). Let me decide.

This is the rule that keeps the spec meaningful. A skill that silently reconciles turns the spec into a description of whatever was built.

### 6. Run and hand back

Run the tests. New tests against implemented behaviour should pass; if one fails, that's a step-5 disagreement, not a test to adjust until green.

Report: tests written, pending stubs and why, disagreements found, and any behaviour you couldn't test with a reason.

## Quality gate

- [ ] Every test names the spec ID it demonstrates.
- [ ] Assertions come from the spec, not from observed behaviour.
- [ ] Both branches of each guard tested separately.
- [ ] Unbuilt behaviour stubbed as pending with traceability, never as passing empty tests.
- [ ] Disagreements halted and reported, never reconciled.
- [ ] Tests run; failures explained rather than tuned away.

## Anti-patterns

- **Writing the test by running the code.** Proves only that the code does what it does.
- **Adjusting an assertion until it passes.** That's the disagreement case, and it's the one worth catching.
- **Editing the spec to match the code** mid-task.
- **One test covering five rows.** Row-level naming is what makes a decision table auditable.
- **Empty passing tests** for unbuilt behaviour. They read as coverage.

## Related skills

- `spec-assess-coverage` — what needs writing
- `spec-maintain-on-ship` — when the spec turned out to be stale
- `bug-regression-red-green` — when the code turned out to be wrong
