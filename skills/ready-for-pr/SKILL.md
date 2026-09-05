---
name: ready-for-pr
description: Run requested local CI gates, fix in-scope failures, and report readiness. Mark an existing draft ready only when that action is authorized and its published head contains the validated state. Ordinary implementation or PR metadata work does not trigger this skill.
---

# Check PR Readiness

Use for an explicit checks/readiness request or a repository-required pass. An assessment such as “will CI pass?” authorizes verification, not reviewer notifications. Do not automatically invoke this workflow after implementation, commit, submission, or a PR description edit.

## Run the required checks

Read actual CI and `.engineering/config.yaml` when present. Identify ordered gates and their prerequisites. Report configuration drift instead of guessing commands or dropping a real failing gate. Missing commands or unavailable environments leave readiness unverified. Run setup/code generation when it is a prerequisite of the selected gates; use the owning tool and preserve unrelated generated changes.

Follow [write-tests](../write-tests/SKILL.md) for coordination and evidence reuse. One agent owns the pass. Reuse a passing gate only when it covers the same code, dependencies, configuration, and relevant environment. Distinct CI environments are distinct evidence. Workers run only assigned checks.

Run the configured gates in dependency order. Investigate the first failure before dependent gates. Fix failures within the authorized scope; report unrelated or unavailable prerequisites. Do not suppress type/lint errors or weaken a test merely to obtain green results. Rerun the failed check and any earlier or later evidence the fix invalidated, then continue remaining checks.

Run applicable repository-required changed-file checks even when listed outside the main gates. Do not turn unrelated optional formatting debt into a blocker. Never perform repository-wide formatting as a readiness side effect.

## Inspect the final state

Review the complete task diff, including staged, unstaged, and untracked task files. Check accidental scope, secrets, debug artifacts, generated output, and environment files. Do not commit or push unless authorized.

## Promote only when authorized and published

For a checks-only or assessment request, report results and leave the PR state unchanged.

When marking a draft ready is authorized, read the current branch and PR metadata, including `number`, `headRefName`, `headRefOid`, `isDraft`, and `url`. Establish all of the following immediately before promotion:

- This is the intended branch's PR and the tested commit matches its current published `headRefOid`.
- All relevant validated changes, including generated sources needed for the result, are committed and published; no local-only repair contributes to the passing result.
- Required checks passed for that state; later changes have not invalidated them.

If fixes remain local or the remote advanced, keep the draft and report what needs publication or revalidation. Do not publish merely to satisfy this check. With no PR, report local readiness without creating one. An already-ready PR needs no mutation.

For an eligible authorized draft, use `gh pr ready <number>` and re-read its head and draft state. Report unexpected changes rather than claiming the newly observed head was validated.

## Report

Give current verification evidence, failures or unrun requirements, relevant local/unpublished work, and the actual PR state. Distinguish ready locally from a published PR marked ready. Do not fabricate a full pass from selected targeted checks.
