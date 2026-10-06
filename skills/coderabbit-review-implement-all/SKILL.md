---
name: coderabbit-review-implement-all
description: Publish triaged PR review fixes, then reply and resolve addressed CodeRabbit, Codex, and human review feedback. Use when explicitly asked to publish and resolve the review or to run this full pass; ordinary local fixes use coderabbit-review-implement.
---

# PR Review — Publish and Resolve

Complete Ben's review implementation workflow with publication **before** GitHub communication. Use `coderabbit-review-implement` for local fixes, then follow this pass only when the user requests publication and resolution. The original skill names and `.active/coderabbit-pr-<N>-review/` paths remain compatible.

## 1. Confirm the PR and requested review scope

Read `00-pr-metadata.json`, `05-comments-structured.json`, and `06-triage-decisions.md`. Confirm the current checkout is the requested PR branch. Do not switch to another developer's branch or publish unrelated changes.

```bash
git branch --show-current
gh pr view --json number,url,headRefName,headRefOid,headRepository,headRepositoryOwner,isCrossRepository
```

Compare the repository, PR number, head repository, and branch with triage. Refresh old CodeRabbit-only or CodeRabbit/Codex-only triage when the request includes human feedback. Respect an explicitly narrowed reviewer scope; otherwise include all actionable review feedback.

## 2. Implement and verify

Run `coderabbit-review-implement` if local fixes are incomplete. Retain Ben's implementation priorities, batching, and verification. Do not implement skipped findings or guess unresolved decisions. Record `done`, `skipped_already_fixed`, or `blocked` for each fix.

## 3. Publish before replying or resolving

If there are local review-fix changes:

1. Commit only the named review-fix paths after verification. Follow the repository's commit workflow and generated-file rules.
2. Publish to the **existing PR's head repository and branch**, using the repository's submit workflow or the matching Git remote. Do not create a new PR or assume the head is `origin/<local-branch>`: fork PRs and differently named remotes must use the actual head repository/branch from step 1. Do not force-push.
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
