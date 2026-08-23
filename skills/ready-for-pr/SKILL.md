---
name: ready-for-pr
description: Run the same quality gates CI runs — types, lint, dead code, tests — and fix what fails until the branch would pass. Then mark the current branch's GitHub PR ready for review if it is still a draft. Use when the user says "ready for PR", "run the checks", "is this ready to ship", "will CI pass", or before opening a pull request. A bare commit or submit does not run this suite and must not mark the PR ready.
---

# Ready for PR

Run the gates CI runs, fix what fails, then — only if every gate passed — mark the current branch's draft PR ready for review.

Commands come from `commands` in `.engineering/config.yaml`, which `engineering-setup` took from the CI workflow. If they've drifted from CI, that's a finding — report it rather than quietly running something different from what will actually gate the merge.

## When to use

- "Is this ready for a pull request?"
- "Run the checks" / "will CI pass?"
- After finishing a chunk or a fix, **when I ask whether CI would pass** — not as part of `run-implementation-plan`. That loop stays on the diff.

**Not this skill:** reviewing for bugs (`branch-self-review`), checking conventions (`conventions-audit`), updating pull request metadata (`update-pr`). Opening or submitting the PR is a separate skill — this one only marks an existing draft ready.

## Workflow

### 1. Run exactly what `gates` lists, in order

The config's `gates` list names the commands that actually gate a merge, in CI's order — typically a `setup` generation step, then types, lint, dead code, tests.

**Run the `setup` command if one exists.** It's there because CI runs a generation step before the gates; skip it and a later gate fails on missing generated files, and you report a phantom failure on a perfectly clean branch.

**Never run anything under `non_gating`.** Those commands exist but don't gate. A formatter failing on hundreds of pre-existing files is not this branch's problem, and reporting Blocked on it makes this skill worse than useless — people stop believing it. Mention them only if asked.

**Stop and fix at the first failure** before continuing; a later gate's output is noise while an earlier one is broken.

Skip any command the config doesn't define. Don't invent one — a guessed test command that passes proves nothing.

### 2. Fix the root cause

Read the failure output properly and fix the actual problem.

**No suppressions to get green:** no type escape hatches, no lint disables, no widening a type to silence an error, unless I explicitly approve it. A suppression turns a gate failure into a permanent hole, which is the opposite of the point.

Re-run only the failed step, then any later step the fix could have affected.

Repeat until everything passes.

### 3. Git sanity check

Once gates pass, look at what's actually staged and changed. Flag:

- Edits unrelated to the branch's purpose
- Secrets or environment files — `.env`, `.env.local`, `.env.*.local`, key files, credentials. A new `.env.example` is expected; a value in it that looks real is not
- A tracked `.env` that this branch did not mean to add
- Debug logging left behind, including printed env values or tokens
- Large or accidental files

**Do not commit or push** unless I ask.

### 4. Mark the PR ready (after gates pass)

This is the step submit must not do. Only run it when every gate above passed.

```bash
gh pr view --json number,isDraft,url
```

- **No PR** — report Ready locally. Do not open or submit one.
- **Draft** — `gh pr ready`, then confirm `isDraft` is false. That is what notifies reviewers and turns review bots on when they skip drafts.
- **Already ready** — leave it. Report that the gates passed.
- **Gates blocked** — never mark ready. A draft with failing checks is the correct state.

If I asked only to **run the checks** and not to publish, skip `gh pr ready`. Report the actual PR state: no PR, still a draft, or already ready.

### 5. Report

Two shapes only:

- **Ready** — all gates passed; whether the PR was marked ready, left ready, or does not exist yet.
- **Blocked** — which step failed, the one-line cause, what you fixed, and what still needs a human. Include anything I must run myself, such as a migration. Do not mark the PR ready.

Be accurate about what actually ran. "Ready" after skipping the test suite is the single most damaging thing this skill can say.

## Quality gate

- [ ] Every command in `gates` was run, in order, or its absence explained.
- [ ] Nothing under `non_gating` was run or reported as blocking.
- [ ] Failures fixed at the root, not suppressed.
- [ ] Config commands match what CI runs — drift reported.
- [ ] Git sanity check done.
- [ ] Draft PR marked ready only after gates passed, unless I asked only to run the checks.
- [ ] Nothing committed or pushed unasked.
- [ ] The report states what actually ran.

## Anti-patterns

- **Suppressing to get green.** A permanent hole traded for a passing run.
- **Reporting Ready having skipped a gate.** Destroys the value of the skill.
- **Running a narrower test scope by default** because it's faster. Ask first.
- **Continuing past a failure** to collect more output — later failures are usually downstream of the first.
- **Fixing unrelated things** you noticed on the way. Note them instead.
- **Calling `gh pr ready` from submit, or on a blocked draft.**

## Related skills

- `branch-self-review` — bugs and risk, before or after these gates
- `update-pr` — title and body once the gates pass
- `conventions-audit` — convention compliance
- `engineering-setup` — when the commands here are wrong or missing
