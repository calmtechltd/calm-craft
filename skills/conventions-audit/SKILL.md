---
name: conventions-audit
description: Check a diff or directory against the decisions in .engineering/conventions.yaml, reporting only violations the linter cannot catch. Use when the user says "check this against our conventions", "does this follow our standards", "audit this code", or before opening a pull request on a repo with recorded conventions. Reports only — never edits code.
---

# Conventions Audit

Check code against the decisions in `.engineering/conventions.yaml`, and report **only what the linter can't catch**. If lint already enforces a decision, the linter owns it — repeating its findings wastes attention and trains people to skim your reports.

**Read-only for product code.** This skill never fixes anything. `conventions-migrate` edits.

## When to use

- "Check this against our conventions" / "does this follow our standards?"
- Before opening a pull request.
- Reviewing someone else's branch.

**Not this skill:** deciding conventions (`conventions-decide`), fixing violations (`conventions-migrate`), finding bugs (`branch-self-review`).

## Workflow

### 1. Scope

Default to the branch diff against the merge-base with `vcs.default_branch` from `.engineering/config.yaml`. Accept a named directory or file set instead.

If `.engineering/conventions.yaml` is missing, stop and point at `conventions-decide` — there is nothing to audit against.

### 2. Load the decisions

Read `conventions.yaml`. Split the decisions:

- **`tier: enforced`** — skip entirely. Run the linter instead if you want them checked; do not duplicate its work by eye.
- **`tier: ambient` and `tier: documented`** — these are the audit surface.

If a decision is marked enforced but no corresponding rule exists in the lint config, that's a finding in itself: report it as a **gap in enforcement**, separately from code violations.

### 3. Read surrounding code

For each changed file, read the module — not just the diff hunk. Placement rules, layering, and boundary decisions are invisible in a hunk. A utility added to a shared directory only violates the promotion rule if you know how many features consume it.

### 4. Verify before reporting

Before a finding survives:

1. Confirm it exists in the current code.
2. Check whether it's inside a scoped ignore the conventions file allows.
3. Check sibling files — if the whole area predates the decision, that's a migration backlog item, not a new violation. Say which.

Drop anything already handled. **Fewer verified findings beat a long speculative list** — an auditor that cries wolf gets ignored, which is worse than no auditor.

### 5. Report

Each finding: severity, `file:line`, the **decision `id`** it violates, what's wrong, and a suggested direction. Citing the id matters — it lets me argue with the decision rather than with you.

| Severity | When |
| --- | --- |
| **Major** | Violates a `decided` convention in new or modified code |
| **Minor** | Violates a `defaulted` convention, or pre-existing code touched incidentally |
| **Note** | Pre-existing violation in untouched code, found in passing |

Also report, separately:

- **Enforcement gaps** — decisions marked enforced with no rule behind them.
- **Tier upgrades** — findings a linter could catch. Every one of these is a rule you should be writing instead of an audit you keep running.

End with the count by severity and the path to any report file. Do not start fixing.

## Quality gate

- [ ] Enforced-tier decisions were skipped, not hand-checked.
- [ ] Every finding cites a decision `id`.
- [ ] Each finding verified against current code.
- [ ] Pre-existing violations distinguished from new ones.
- [ ] Tier upgrades reported.
- [ ] No product code modified.

## Anti-patterns

- **Duplicating the linter.** If lint owns it, lint reports it.
- **Auditing the diff hunk alone.** Placement and layering decisions aren't visible there.
- **Findings without a decision id.** Then it's your opinion, which is exactly what conventions exist to replace.
- **Fixing during the audit.** An auditor that can edit can make its own findings disappear.
- **Reporting the whole legacy backlog** on a three-file diff. Separate it or omit it.

## Related skills

- `conventions-decide` — record the decisions this audits against
- `conventions-migrate` — fix what this finds
- `conventions-revisit` — act on the tier upgrades this reports
- `branch-self-review` — bugs and risk, a different question
