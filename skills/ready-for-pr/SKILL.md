---
name: ready-for-pr
description: Run the same quality gates CI runs — types, lint, dead code, tests — and fix what fails until the branch would pass. Use when the user says "ready for PR", "run the checks", "is this ready to ship", "will CI pass", or before opening a pull request.
---

# Ready for PR

Run the gates CI runs, fix what fails, report pass or blocked. Nothing more.

Commands come from `commands` in `.engineering/config.yaml`, which `engineering-setup` took from the CI workflow. If they've drifted from CI, that's a finding — report it rather than quietly running something different from what will actually gate the merge.

## When to use

- "Is this ready for a pull request?"
- "Run the checks" / "will CI pass?"
- After finishing a chunk or a fix.

**Not this skill:** reviewing for bugs (`branch-self-review`), checking conventions (`conventions-audit`), updating pull request metadata.

## Workflow

### 1. Run the gates in CI's order

Types → lint → dead code → tests, or whatever order the config records. **Stop and fix at the first failure** before continuing; a later gate's output is noise while an earlier one is broken.

Skip any command the config doesn't define. Don't invent one — a guessed test command that passes proves nothing.

### 2. Fix the root cause

Read the failure output properly and fix the actual problem.

**No suppressions to get green:** no type escape hatches, no lint disables, no widening a type to silence an error, unless I explicitly approve it. A suppression turns a gate failure into a permanent hole, which is the opposite of the point.

Re-run only the failed step, then any later step the fix could have affected.

Repeat until everything passes.

### 3. Git sanity check

Once gates pass, look at what's actually staged and changed. Flag:

- Edits unrelated to the branch's purpose
- Secrets or environment files
- Debug logging left behind
- Large or accidental files

**Do not commit or push** unless I ask.

### 4. Report

Two shapes only:

- **Ready** — all gates passed, with a note on scope if you ran anything narrower than the full suite.
- **Blocked** — which step failed, the one-line cause, what you fixed, and what still needs a human. Include anything I must run myself, such as a migration.

Be accurate about what actually ran. "Ready" after skipping the test suite is the single most damaging thing this skill can say.

## Quality gate

- [ ] Every command defined in the config was run, or its absence explained.
- [ ] Failures fixed at the root, not suppressed.
- [ ] Config commands match what CI runs — drift reported.
- [ ] Git sanity check done.
- [ ] Nothing committed or pushed unasked.
- [ ] The report states what actually ran.

## Anti-patterns

- **Suppressing to get green.** A permanent hole traded for a passing run.
- **Reporting Ready having skipped a gate.** Destroys the value of the skill.
- **Running a narrower test scope by default** because it's faster. Ask first.
- **Continuing past a failure** to collect more output — later failures are usually downstream of the first.
- **Fixing unrelated things** you noticed on the way. Note them instead.

## Related skills

- `branch-self-review` — bugs and risk, before or after these gates
- `conventions-audit` — convention compliance
- `engineering-setup` — when the commands here are wrong or missing
