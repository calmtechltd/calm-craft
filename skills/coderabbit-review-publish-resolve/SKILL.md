---
name: coderabbit-review-publish-resolve
description: Triage, implement, verify, commit and publish PR review fixes, then reply and resolve addressed CodeRabbit, Codex, and human feedback in one pass. Use when explicitly asked for the complete publish-and-resolve workflow; ordinary local fixes use coderabbit-review-implement.
---

# PR Review — Publish and Resolve

Complete Ben's review implementation workflow with publication **before** GitHub communication. Use `coderabbit-review-implement` for local fixes, then follow this pass only when the user requests publication and resolution. The triage and implement skill names and `.active/coderabbit-pr-<N>-review/` paths remain compatible. This skill replaces `coderabbit-review-implement-all`; there is no second alias in the skill picker.

One invocation runs **triage → implement → verify → commit → publish → reply/resolve → report**. Reuse valid completed work instead of asking the user to launch each stage separately. Explicit invocation of this full workflow authorizes its review-fix commits, publication to the existing PR, and review communication; it does not authorize unrelated changes or merging. Unsettled decisions and unavailable capabilities remain reported blockers, not assumed approvals.

## 1. Confirm the PR and complete triage

Read [GitHub review access](../../references/github-review-access.md) before API requests or publication. Use the explicit PR identity for detached cloud checkouts and the host's supplied credentials.

Confirm the current checkout belongs to the requested PR. Do not switch to another developer's branch or publish unrelated changes. If `00-pr-metadata.json`, `05-comments-structured.json`, or `06-triage-decisions.md` is missing, run `coderabbit-review-triage` for this PR in the same invocation. If they exist, read them and verify their PR identity, requested scope, and fetch completeness before reusing them.

```bash
git branch --show-current
gh pr view --json number,url,headRefName,headRefOid,headRepository,headRepositoryOwner,isCrossRepository
```

Compare the repository, PR number, head repository, and branch with triage. Refresh old CodeRabbit-only or CodeRabbit/Codex-only triage when the request includes human feedback. Respect an explicitly narrowed reviewer scope; otherwise include all actionable review feedback.

Refresh stale or incomplete review material through `coderabbit-review-triage` before relying on it. Preserve finding IDs, settled user decisions, implementation evidence, and confirmed communication URLs when reconciling refreshed sources. Resolve genuine Needs Input questions through that workflow; missing evidence remains Unverified. Do not resolve affected threads while either is outstanding.

Pass the verified PR URL to `gh pr view` for detached cloud checkouts instead of relying on the current branch name. Before publication, establish that the checkout belongs to that PR's head and select its existing head branch as the destination.

## 2. Implement and verify

Run `coderabbit-review-implement` if local fixes are incomplete. Retain Ben's implementation priorities, batching, and verification. Do not implement skipped findings or guess unresolved decisions. Record `done`, `skipped_already_fixed`, or `blocked` for each fix.

## 3. Publish before replying or resolving

Identify the review-fix paths and commits, including fixes committed earlier but not yet pushed. A clean working tree alone does not prove publication.

1. If review-fix changes remain uncommitted, commit only the named paths after verification. Follow the repository's commit workflow and generated-file rules. Reuse existing verified fix commits; do not create an empty commit for already published fixes or skips.
2. Publish any review-fix commits missing from the **existing PR's head repository and branch**, using the repository's submit workflow or the matching Git remote. Do not create a new PR or assume the head is `origin/<local-branch>`: fork PRs and differently named remotes must use the actual head repository/branch from step 1. Do not force-push.
3. Refresh the live PR's `headRefOid`. Fetch the actual head branch into `FETCH_HEAD` and confirm it agrees with that live head. Record the verified published SHA and confirm every review-fix commit is contained in it.

For example, after selecting the actual PR head repository URL and branch:

```bash
git fetch "$pr_head_repository_url" "$pr_head_branch" || exit 1
fetched_head_oid=$(git rev-parse FETCH_HEAD) || exit 1
test "$fetched_head_oid" = "$published_head_oid" || exit 1
git merge-base --is-ancestor "$fix_commit" "$fetched_head_oid" || exit 1
```

Repeat the ancestry check for every fix commit. A failed fetch/publish, head mismatch, uncommitted review fix, or missing fix commit prevents communication or resolution. Reconcile remote changes the checkout lacks before relying on its code evidence.

For a skip-only or already-fixed pass, no new commit is needed, but verify the rationale against the **published PR head**, not an unpublished working-tree fix. Unrelated pre-existing changes do not authorize committing them or using them as resolution evidence.

## 4. Refresh the review, then communicate and resolve

Re-fetch the complete review inventory and thread discussions using the triage workflow, including all pages and human replies. Reconcile new or changed requests. Evidence must still cover the current published head; an outdated thread is not automatically addressed.

Read [GitHub communication](github-communication.md) now. It implements Ben's skip replies and single summary with the GitHub compatibility fixes:

- Reply on existing inline threads using `addPullRequestReviewThreadReply`; resolve them with `resolveReviewThread` and their actual GraphQL thread IDs.
- Handle human feedback as well as CodeRabbit and Codex. Human threads get a concise response linking the published fix or explaining the disposition before resolution. Unsettled disagreements remain open.
- Keep top-level PR comments and review-body findings distinct from inline threads. They have no individual thread-resolution mutation.
- Preserve the CodeRabbit summary/resolve command only for a fully addressed CodeRabbit review, after publication and confirmed thread results. It does not resolve Codex or human feedback.

A failed reply must not be followed by resolving that thread. A permission error is recorded as a capability limit; do not try another identity or assume another API bypasses it.

If the cloud token permits inline operations but denies the single top-level summary, retain confirmed replies and resolutions and report the summary as unavailable. The denied summary does not erase those results or authorize repeated attempts with another identity.

## 5. Update triage artifacts

Append implementation and GitHub communication tables to `06-triage-decisions.md`. Preserve the source IDs, reviewer authorship, source URLs, and thread mappings in `05-comments-structured.json`.

Record:

- `implementation_status` and verification evidence for each fix
- `published_head_oid` and published fix commits
- `github_reply_url` for posted thread replies, and `github_skip_reply_url` for skips
- `thread_resolved: true` only after a confirmed mutation or fresh read shows resolution; otherwise `false` with the error/blocker
- Body-only/top-level `communication_status: addressed | needs_input | unavailable`, without claiming they have a resolved thread
- `global_resolve_status: posted | not_needed | blocked | unavailable` and the CodeRabbit summary URL/error, if applicable

An attempted command is not proof that a thread was resolved. Refresh the final PR head and complete review inventory; report new or still-open findings. If the head changed during communication, reconcile that state before claiming completion.

## 6. Report

Provide counts by reviewer of implemented, already fixed, skipped, blocked, and unverified findings; changed files and checks; the PR link; published fix evidence; reply/summary links; confirmed resolutions; and remaining discussion or capability failures.

This pass does not merge the PR or dismiss a human's review approval/request-changes state. Resolved conversations alone do not establish merge readiness. Apply the [review merge gate](../../references/review-merge-gate.md) before declaring the PR merge-ready.

## Related skills

- `coderabbit-review-triage` — download and classify review feedback
- `coderabbit-review-implement` — Ben's implementation workflow, kept local
- `update-pr` — update PR wording when requested
- `ready-for-pr` — assess readiness when requested
