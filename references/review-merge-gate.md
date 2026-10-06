# Review closure before merge

Use this check when assessing an existing PR for merge readiness or immediately before a separately authorised merge. PR creation and draft promotion for review can proceed while feedback is open; neither is a claim that the PR is merge-ready.

## Read current evidence

Confirm the intended repository, PR, head branch and published head commit. Read all `reviewThreads`, paginating every page and nested comments. Read current review state and actionable review-body findings as well. A missing page, unavailable API or stale head leaves review closure unverified.

The merge gate covers threads rooted by any author: humans, CodeRabbit, Codex and other bots. The supported-reviewer allowlist in bot triage limits whose findings that workflow may resolve; it never narrows the merge gate. `isOutdated` does not imply resolved. Every `isResolved: false` thread blocks a merge-readiness claim, including a thread whose code fix has shipped but whose discussion is still open.

## Establish closure

For each actionable finding, establish either a verified fix published on the current head or an evidence-backed disposition communicated through the authorised review workflow. Do not mark a thread resolved merely to satisfy protection, because CI passes, or because the bot was wrong without checking the code. A thread containing multiple findings remains open until each is addressed. Human/other-bot threads require their appropriate authorised review communication; a bot-fix request does not authorise dismissing them.

Unverified findings, unresolved product decisions, blocked fixes and actionable review-body findings without a disposition also prevent declaring merge readiness. Ordinary walkthroughs and informational PR comments are not findings. GitHub's conversation-resolution setting applies to resolvable review threads; the skill must also track actionable body-only findings that the setting cannot represent.

## Enforce the gate

Prefer GitHub's native conversation-resolution protection when the user authorises repository configuration. Verify it applies to the actual PR base, including an intermediate branch in a stacked PR, and report whether administrators can bypass it. Preserve unrelated protections and branch workflow. Never change protection as a side effect of an ordinary review-fix or readiness request.

When merging is separately authorised, re-read the current head, required checks, review decision and unresolved-thread inventory immediately before the merge. Bind the merge to the verified head where the tool supports it. A new head or new review finding requires reconciliation. Do not merge, enable auto-merge, use an administrator override or dismiss findings while this gate is blocked or unverified. Do not weaken protection to obtain a passing result.

Report unresolved-thread count and links, remaining body-only findings, the commit assessed, required-check state and effective protection. Distinguish local checks passed, ready for review and ready to merge. This reference grants no permission to merge.
