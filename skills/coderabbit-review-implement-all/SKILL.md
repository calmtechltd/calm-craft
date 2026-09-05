---
name: coderabbit-review-implement-all
description: Publish CodeRabbit review fixes and resolve the review. Runs coderabbit-review-implement first if the local fixes are not done, commits and publishes them to the current PR, resolves inline threads with GraphQL, and when necessary posts one PR-level @coderabbitai resolve summary for completed review-body-only findings. Never resolves before the remote has the fixes. Use only when explicitly invoked or the user clearly requests CodeRabbit publication and resolution; a generic implement-all request stays local.
---

# CodeRabbit Review — Implement All

The outward-facing pass: local implement, publish this branch, resolve CodeRabbit **review threads** with GraphQL, then close completed review-body-only findings with one PR-level summary when the environment permits it.

Use the narrowest mutation that can represent the result:

- reply on an **existing** thread: `addPullRequestReviewThreadReply`
- mark a thread resolved: `resolveReviewThread`
- close completed findings that exist only in the review body: one final `@coderabbitai resolve` PR comment containing the fixed/skipped summary

The first two take the GraphQL thread id (`PRRT_…`) from triage and remain the primary path. A top-level comment uses GitHub's `addComment` permission, which some cloud agent tokens lack. Attempt it only in the guarded review-body case below; a 403 is a reported capability limitation, not a reason to undo successful inline resolutions or try other comment APIs.

This skill can change a live PR. Use it only for the **current branch's** review, and only when I explicitly asked for the full pass. A loop of ordinary implement work must stay on `coderabbit-review-implement`.

**Prerequisite:** A completed triage folder at `.active/coderabbit-pr-<N>-review/` with `06-triage-decisions.md` and `05-comments-structured.json`. The PR number in `00-pr-metadata.json` must be this branch's PR.

Pairs with `coderabbit-review-triage` and `coderabbit-review-implement`.

## Hard rules

1. **Current branch only.** Confirm `git branch --show-current` and `gh pr view` match the triage PR. Stop if the triage folder is for another PR or another developer's branch.
2. **Never resolve before the remote has the fixes.** Do not reply on threads or run `resolveReviewThread` while fix changes are still uncommitted or only on the local branch.
3. **Publish, then resolve.** If this pass produced code changes, commit them and publish so the existing PR branch on the remote contains every fix commit. Fetch and confirm that before any thread reply or resolve.
4. **No general PR comments.** The only allowed top-level comment is the single guarded `@coderabbitai resolve` summary in step 5, after remote verification, when completed review-body-only findings exist and no finding remains blocked. Never use GitHub MCP comment tools.
5. An explicit invocation of this publication workflow, or a clear request to **publish the CodeRabbit fixes and resolve their review**, authorises its commit, publish, and review communication. A generic "implement the fixes" does not — use `coderabbit-review-implement`.
6. Skip-only passes have nothing to publish. Resolve those only when the working tree is clean of unpublished review-fix changes.

## Workflow

### 1. Confirm this is the current branch's PR

```bash
branch=$(git branch --show-current)
gh pr view --json number,url,headRefName
```

Stop if `headRefName` is not `$branch`, or if `.active/coderabbit-pr-<N>-review/00-pr-metadata.json` names a different PR.

### 2. Run local implement if needed

If Obvious Fix items are still unimplemented, run `coderabbit-review-implement` to completion first. Do not skip verification there.

If implement already finished and the worktree matches that triage status, continue.

### 3. Publish the fixes to the remote

Do this **before** any resolve comment, thread resolve, or skip reply that closes a review comment. The PR must not look mergeable while the fixes exist only locally.

If this pass produced code changes:

1. Commit the review fixes. Stage named paths only. Do not include generated migration artifacts unless I opted in. If the repo has a checkpoint-commit helper (`commands.checkpoint_commit` in `.engineering/config.yaml`), use that; otherwise a normal commit of the named paths.
2. Publish those commits to the existing PR branch. If the repo has a submit skill, use it. Otherwise `git push` the current branch. Do not open a new PR.
3. Fetch and confirm the remote branch contains every local fix commit:

```bash
branch=$(git branch --show-current)
git fetch origin "$branch" || {
  echo "FETCH FAILED — do not resolve CodeRabbit comments"
  exit 1
}
git rev-list --left-right --count "origin/$branch...HEAD"
```

The right-hand count must be `0` (no local-only commits). A non-zero left-hand count means the remote has commits this checkout lacks — stop and do not resolve.

If this pass produced no code changes (skips only), confirm the working tree has no unpublished review-fix changes, then continue.

Do **not** continue to step 4 when:

- fix changes are still uncommitted
- local fix commits are not on `origin/$branch`
- fetch, commit, or publish failed

Before resolution, refresh the PR head and review inventory. Reconcile newly added or changed CodeRabbit findings and pagination; stale triage cannot establish completeness. Reuse code evidence only if it still covers the published head. Even for skip-only/already-fixed passes, verify those decisions against the current published code, not unpublished local assumptions.

### 4. Resolve inline findings on their existing threads

**Always run this step** when implementation is complete, a PR exists, **and** step 3 has confirmed either that the remote has the fix commits **or** that this was a skip-only / already-fixed-only pass with no unpublished review-fix changes.

Requires `gh api graphql` and network. **Forbidden in this step:** top-level comments, GitHub MCP `addComment`, REST POST of a new issue/PR comment, `POST .../pulls/comments` (the REST in-reply-to path), and `/pulls/comments/{id}/replies`. The guarded PR-level summary, if needed, belongs only in step 5.

Thread ids come from `.active/coderabbit-pr-<N>-review/05-comments-structured.json` (`thread_id`). If a finding has no `thread_id`, skip GraphQL for that item and record it as a review-body-only finding for step 5.

Write mutation bodies to a file and pass them with `-F` / `--input`. Never interpolate triage or bot text into the shell command line.

**Pre-mutation read (required, every thread).** Confirm the thread still belongs to this PR and its root author is CodeRabbit. Every finding mapped to the thread must be verified and terminal before resolving it. An unverified, needs-input, or blocked sibling finding keeps the whole thread open. Before 4a or 4b, load the thread's current `isResolved` and all comments (paginate nested comments). Treat existing replies from humans **and** bots as duplicates when the body already contains the same skip rationale. Then:

- already `isResolved: true` — do not reply, do not resolve again; record `thread_resolved: true`, `mutation: none`
- skip + matching reply already present — do not reply again; still resolve if unresolved
- skip + unresolved + no matching reply — 4a then 4b
- obvious_fix (done / already fixed) + unresolved — 4b only, never 4a
- GraphQL error — do not retry as `addComment`; record `thread_resolved: false` and the error

#### 4a. Inline thread replies (skipped items only)

For each finding where `triage === "skip"` **and** `thread_id` is present **and** the pre-mutation read did not skip the reply:

```bash
THREAD_ID='PRRT_…'   # from triage JSON, not the numeric comment id
BODY_FILE=$(mktemp)
GQL_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE" "$GQL_FILE"' EXIT
jq -nr --arg id "<finding_id>" --slurpfile triage .active/coderabbit-pr-<N>-review/05-comments-structured.json '
  ($triage[0].findings[] | select(.id == $id) | .triage_rationale) as $rationale
  | "**Skipping** — " + $rationale
' > "$BODY_FILE"

jq -n --rawfile body "$BODY_FILE" --arg threadId "$THREAD_ID" '{
  query: "mutation($threadId:ID!, $body:String!) { addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) { comment { id url } } }",
  variables: { threadId: $threadId, body: $body }
}' > "$GQL_FILE"

gh api graphql --input "$GQL_FILE"
```

- **Never** reply on threads for `obvious_fix` items that were implemented — resolve those in 4b only.

Skipped review-body nitpicks with no `thread_id` get no reply.

#### 4b. Resolve threads (fixes + skips)

For each finding that has a `thread_id` and is either **skip** or **obvious_fix** with `implementation_status` done / already fixed, **and** the pre-mutation read shows `isResolved` is still false:

```bash
GQL_FILE=$(mktemp)
jq -n --arg threadId "$THREAD_ID" '{
  query: "mutation($threadId:ID!) { resolveReviewThread(input: { threadId: $threadId }) { thread { id isResolved } } }",
  variables: { threadId: $threadId }
}' > "$GQL_FILE"

gh api graphql --input "$GQL_FILE"
```

Resolve **per thread**. Do not post a summary issue comment in this step. Record the mutation result in triage artifacts (`thread_resolved` true or false).

If a mutation returns 403, stop that path and report it. Do not fall back to `gh pr comment` or GitHub MCP.

### 5. Close completed review-body-only findings

Run this step only when at least one finding has no `thread_id` and is terminal:

- `triage === "skip"`, or
- `triage === "obvious_fix"` with `implementation_status` `done` / `skipped_already_fixed`

Because `@coderabbitai resolve` is global, **do not post it while any finding is `needs_input`, `unverified`, blocked, missing from the refreshed inventory, or otherwise incomplete**. Report that the review-body findings remain open instead.

Step 3 must already have proven that every fix commit is on the remote. Then build one concise PR comment from the structured triage data:

```markdown
@coderabbitai resolve

## CodeRabbit triage — implementation summary

Reviewed <TOTAL> findings: **<FIXED> fixed** and **<SKIPPED> skipped**.

### Fixed

| File | Finding | What changed |
| --- | --- | --- |
| `path/to/file.ts` | Short title | One-sentence implementation summary |

### Skipped

| File | Finding | Why skipped |
| --- | --- | --- |
| `path/to/file.ts` | Short title | One-sentence code-backed rationale |
```

Include all fixed and skipped findings so the comment is a useful audit summary, but keep each row to one sentence and omit empty sections. Generate the body from `05-comments-structured.json` into a temporary file; never interpolate bot text into shell source.

Post exactly once with `gh pr comment <PR> --body-file <file>`. Before posting, inspect existing top-level PR comments and do not duplicate a matching CodeRabbit triage summary. Record the comment URL.

If posting returns 403 or the token otherwise lacks permission:

- do not retry through GitHub MCP, REST, or another identity
- retain the successful per-thread GraphQL results from step 4
- record `global_resolve_status: "unavailable"` and the error in the triage artifacts
- report: `Inline CodeRabbit threads resolved; PR-level CodeRabbit resolve unavailable with this token.`

### 6. Update triage artifacts

Append thread communication to `06-triage-decisions.md`:

```markdown
## Thread communication

| Item                          | Result                                      |
| ----------------------------- | ------------------------------------------- |
| Skip reply: `file.ts`         | comment url, or `none` (duplicate / already resolved) |
| Resolved thread: `file.ts`    | `isResolved: true`                          |
| Failed resolve: `file.ts`     | `isResolved: false` — GraphQL error text    |
| Global resolve summary        | comment URL, `not needed`, `blocked`, or `unavailable` |
```

Update `05-comments-structured.json`:

- Skips: `"github_skip_reply_url"` when a thread reply was posted; omit or `null` if the reply was skipped as a duplicate
- `"thread_resolved": true` when the thread is resolved (mutation or already resolved)
- `"thread_resolved": false` when resolve was not performed or the mutation failed
- `"graphql_error"`: string when a mutation returned an error; omit when none
- At the top level, `"global_resolve_status"`: `"posted" | "not_needed" | "blocked" | "unavailable"`
- At the top level, `"global_resolve_comment_url"` when posted
- At the top level, `"global_resolve_error"` when unavailable

### 7. Report

Provide:

- Count implemented vs already fixed vs blocked
- Files touched (grouped)
- Confirmation that fix commits were on the remote before resolve
- One PR link
- Count of inline skip-reply threads posted
- Count of review-body-only findings and the global resolve status/comment link
- Anything that failed verification or needs follow-up

## Related skills

- `coderabbit-review-triage` — download, parse, and classify review feedback first
- `coderabbit-review-implement` — apply obvious fixes locally; no publish or resolve
- `update-pr` — refresh the PR description after the review lands
- `ready-for-pr` — run the gates if I want merge-readiness as well
