---
name: coderabbit-review-implement-all
description: Publish CodeRabbit review fixes and resolve the review threads. Runs coderabbit-review-implement first if the local fixes are not done, then commits and publishes those commits to the current branch's PR, then replies on existing threads and resolves them with GraphQL. Never gh pr comment, GitHub MCP addComment, or @coderabbitai resolve as a new issue comment — those 403. Never resolve before the remote has the fixes. Use only when the user explicitly asks to implement all, fix and resolve, or ship the review and resolve.
---

# CodeRabbit Review — Implement All

The outward-facing pass: local implement, then publish this branch, then resolve CodeRabbit **review threads** with GraphQL.

Never open a new GitHub issue comment to talk to the bot. `gh pr comment`, GitHub MCP `addComment` / `add_issue_comment`, REST `POST .../issues/.../comments`, and `@coderabbitai resolve` as a top-level comment all hit **`addComment` and 403**. The working path is:

- reply on an **existing** thread: `addPullRequestReviewThreadReply`
- mark a thread resolved: `resolveReviewThread`

Both take the GraphQL thread id (`PRRT_…`) from triage.

This skill can change a live PR. Use it only for the **current branch's** review, and only when I explicitly asked for the full pass. A loop of ordinary implement work must stay on `coderabbit-review-implement`.

**Prerequisite:** A completed triage folder at `.active/coderabbit-pr-<N>-review/` with `06-triage-decisions.md` and `05-comments-structured.json`. The PR number in `00-pr-metadata.json` must be this branch's PR.

Pairs with `coderabbit-review-triage` and `coderabbit-review-implement`.

## Hard rules

1. **Current branch only.** Confirm `git branch --show-current` and `gh pr view` match the triage PR. Stop if the triage folder is for another PR or another developer's branch.
2. **Never resolve before the remote has the fixes.** Do not reply on threads or run `resolveReviewThread` while fix changes are still uncommitted or only on the local branch.
3. **Publish, then resolve.** If this pass produced code changes, commit them and publish so the existing PR branch on the remote contains every fix commit. Fetch and confirm that before any thread reply or resolve.
4. **Never `gh pr comment` / `addComment`.** Do not post `@coderabbitai resolve` as a new PR comment. Do not use GitHub MCP comment tools.
5. A request to **implement all**, **fix and resolve**, or **ship the review and resolve** authorises this commit and publish. A generic "implement the fixes" does not — use `coderabbit-review-implement`.
6. Skip-only passes have nothing to publish. Resolve those only when the working tree is clean of unpublished review-fix changes.

## When to use

- "Implement all"
- "Fix and resolve the CodeRabbit comments"
- "Ship the triaged review and resolve"

Do **not** use this skill after an ordinary triage hand-off, or inside a loop that only applies more local fixes.

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

### 4. Talk to CodeRabbit on existing threads only

**Always run this step** when implementation is complete, a PR exists, **and** step 3 has confirmed either that the remote has the fix commits **or** that this was a skip-only / already-fixed-only pass with no unpublished review-fix changes.

Requires `gh api graphql` and network. **Forbidden:** `gh pr comment`, GitHub MCP `addComment`, REST POST of a new issue/PR comment, `@coderabbitai resolve` as a top-level comment, `POST .../pulls/comments` (the REST in-reply-to path), and `/pulls/comments/{id}/replies`.

Thread ids come from `.active/coderabbit-pr-<N>-review/05-comments-structured.json` (`thread_id`). If a finding has no `thread_id`, skip GraphQL for that item and record why — do not invent a new comment to carry `@coderabbitai`.

Write mutation bodies to a file and pass them with `-F` / `--input`. Never interpolate triage or bot text into the shell command line.

**Pre-mutation read (required, every thread).** Before 4a or 4b, load the thread's current `isResolved` and all comments (paginate nested comments). Treat existing replies from humans **and** bots as duplicates when the body already contains the same skip rationale. Then:

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
trap 'rm -f "$BODY_FILE" "$GQL_FILE"' EXIT
jq -n --arg id "<finding_id>" --slurpfile triage .active/coderabbit-pr-<N>-review/05-comments-structured.json '
  ($triage[0].findings[] | select(.id == $id) | .triage_rationale) as $rationale
  | "**Skipping** — " + $rationale
' > "$BODY_FILE"

GQL_FILE=$(mktemp)
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

Resolve **per thread**. Do not post a summary issue comment. Record the mutation result in triage artifacts (`thread_resolved` true or false).

If a mutation returns 403, stop that path and report it. Do not fall back to `gh pr comment` or GitHub MCP.

### 5. Update triage artifacts

Append thread communication to `06-triage-decisions.md`:

```markdown
## Thread communication

| Item                          | Result                                      |
| ----------------------------- | ------------------------------------------- |
| Skip reply: `file.ts`         | comment url, or `none` (duplicate / already resolved) |
| Resolved thread: `file.ts`    | `isResolved: true`                          |
| Failed resolve: `file.ts`     | `isResolved: false` — GraphQL error text    |
```

Update `05-comments-structured.json`:

- Skips: `"github_skip_reply_url"` when a thread reply was posted; omit or `null` if the reply was skipped as a duplicate
- `"thread_resolved": true` when the thread is resolved (mutation or already resolved)
- `"thread_resolved": false` when resolve was not performed or the mutation failed
- `"graphql_error"`: string when a mutation returned an error; omit when none

### 6. Report

Provide:

- Count implemented vs already fixed vs blocked
- Files touched (grouped)
- Confirmation that fix commits were on the remote before resolve
- One PR link
- Count of inline skip-reply threads posted
- Anything that failed verification or needs follow-up

## Quality gate

- [ ] Triage PR matches the current branch's PR
- [ ] Local implement finished or was already done
- [ ] Step 3 passed: fix commits are on the remote, or this was a skip-only / already-fixed-only pass with a clean worktree, before any resolve
- [ ] Every **Skip** with a `thread_id` has a GraphQL thread reply (or note why not)
- [ ] No inline replies posted on **fixed** findings
- [ ] Each skip/fixed thread with a `thread_id` was `resolveReviewThread`'d (or already resolved)
- [ ] No `gh pr comment`, GitHub MCP `addComment`, or `@coderabbitai resolve` issue comment
- [ ] Triage JSON + markdown updated with thread results

## Anti-patterns

- **Using this skill as the default after triage.** Default is `coderabbit-review-implement`.
- **Running this in a local-fix loop.**
- **Publishing another developer's branch.**
- **Resolving then pushing.** Publish first.
- **Replying inline on fixed findings.** Only skips get thread replies.
- **Posting `@coderabbitai resolve` or `gh pr comment`.** Use `resolveReviewThread`.
- **Using REST `in_reply_to` or `/replies`.** Reply with `addPullRequestReviewThreadReply` and the `PRRT_…` thread id.

## Related skills

- `coderabbit-review-triage` — download, parse, and classify review feedback first
- `coderabbit-review-implement` — apply obvious fixes locally; no publish or resolve
- `update-pr` — refresh the PR description after the review lands
- `ready-for-pr` — run the gates if I want merge-readiness as well
