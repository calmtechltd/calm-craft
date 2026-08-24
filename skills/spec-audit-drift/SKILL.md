---
name: spec-audit-drift
description: Audit a feature spec against the actual implementation to find where behaviours or user-flow contracts no longer match the code. Use when the user says "is this spec still accurate", "check the spec against the code", "I think this wizard bypasses the documented flow", or before relying on a spec that hasn't been touched in a while. Reports only. Pairs with spec-assess-coverage, which asks whether tests exist.
---

# Audit a Spec for Drift

Does the spec still describe what the code does? **Reports only** — fixing is `spec-maintain-on-ship`, and an auditor that can edit can make its own findings disappear.

Format authority: [`references/spec-format.md`](../../references/spec-format.md).

## When to use

- "Is this spec still accurate?"
- Before planning work against a spec nobody has touched recently.
- Suspicion that a journey does something the contract doesn't allow.

**Not this skill:** whether tests exist (`spec-assess-coverage`), updating the spec (`spec-maintain-on-ship`), classifying a bug report (`spec-triage-bug-report`).

## Workflow

### 1. Read the spec completely first

All behaviours, invariants, decision tables, and the flow contract. Form the expectation before looking at code — reading them together lets the code quietly redefine what the spec "meant".

### 2. Check each behaviour against the implementation

For every behaviour ID, find the code that produces it and classify:

| Verdict         | Meaning                                                     |
| --------------- | ----------------------------------------------------------- |
| **Matches**     | Code produces the described outcome                         |
| **Drifted**     | Code produces a _different_ outcome — the spec is now wrong |
| **Missing**     | Badged 🟢 or 🟡 but no implementing code found              |
| **Unspecced**   | Code produces observable behaviour no behaviour describes   |
| **Badge wrong** | Behaviour exists but the badge overstates or understates it |

**Unspecced** is the category people forget and it's often the most valuable: features grow paths nobody recorded.

### 3. Check invariants are actually enforced

For each invariant, find the code path enforcing it — and, more importantly, look for paths that **bypass** it. An invariant enforced in one mutation and not its sibling is a finding, not a match.

### 4. Check the flow contract against real navigation

For each transition: does the code implement it, with that guard, reaching that state?

Then the harder direction — **what can the code do that the contract doesn't declare?** Undeclared bypasses, skipped steps, a back path that loses state, an error path that dead-ends. This is what a flow contract exists to catch, so spend the effort here.

Report guard mismatches precisely: a guard the code checks more loosely than the contract states is a real defect even when nothing has gone wrong yet.

For storyboarded states, verify the running screen communicates the declared goal and information, exposes the named primary transition, provides the stated feedback, preserves the promised work, and follows the recorded accessibility behaviour. Report missing scene evidence as drift; do not turn visual preference into a requirement.

### 5. Verify before reporting

Confirm each finding against current code. Check whether shared middleware or a helper handles what looks missing. Drop anything already handled. **Fewer verified findings beat a long speculative list.**

### 6. Report

Group by verdict, most severe first. Each finding: behaviour or transition ID, `file:line`, what the spec says, what the code does, and which one you think is wrong — with a reason.

That last part matters. Drift has two fixes: update the spec because the change was intended, or fix the code because it wasn't. Say which you believe and why; don't leave a bare mismatch for someone else to decide blind.

End with: counts by verdict, and whether the front-matter roll-up status is still right.

## Quality gate

- [ ] Every behaviour ID has a verdict.
- [ ] Unspecced behaviour actively searched for, not just spec-to-code checked.
- [ ] Invariants checked for bypass paths, not only for enforcement.
- [ ] Flow audited in both directions.
- [ ] Storyboard evidence checked against user-visible states where present.
- [ ] Each finding verified against current code.
- [ ] Each drift finding says which side you think is wrong.
- [ ] Nothing edited.

## Anti-patterns

- **Only checking spec → code.** Misses everything the feature grew.
- **Reading code and spec together.** Form the expectation first.
- **Reporting a mismatch without a recommendation.** Half a finding.
- **Accepting an invariant as enforced** because one path enforces it.
- **Fixing during the audit.**

## Related skills

- `spec-maintain-on-ship` — apply the fix this recommends
- `spec-assess-coverage` — the test-side question
- `spec-triage-bug-report` — when drift came from a reported symptom
