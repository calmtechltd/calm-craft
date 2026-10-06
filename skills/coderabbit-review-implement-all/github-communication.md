# GitHub Review Communication

Read after verified publication and a complete refreshed triage. Use `gh` with the host's network/authentication rules. Use the PR's base repository for API reads and mutations, even when its head branch is in a fork.

## Existing inline threads

Work **once per thread**, retaining every mapped finding and follow-up request. Before any mutation, fetch the current thread, its PR identity, `isResolved`, `viewerCanReply`, `viewerCanResolve`, and all comment pages. Confirm it matches the triaged thread and requested review scope. Do not resolve a thread merely because a bot replied to it or its line is outdated.

Resolve only when every request on the thread is verified as addressed or has an agreed skip disposition. `needs_input`, `unverified`, blocked work, new concerns, or a human disagreement keep it open. For a human's contested skip, obtain reviewer agreement or an explicit user decision before closing the discussion.

- Already resolved: record the fresh state and do not reply or mutate again.
- Bot-only fixed/already-fixed discussion: resolve without a redundant fixed reply, following Ben's original approach.
- Skipped finding: reply with the code-backed rationale before resolving.
- Human feedback: reply with the published fix/evidence or agreed skip rationale before resolving. This includes human follow-up concerns on a bot-rooted thread.
- An equivalent reply already exists: reuse it if it covers the current findings and no later comment disputes it.
- Missing permission, reply failure, or GraphQL error: keep the thread open and record the limitation. A successful reply does not imply successful resolution.

Build a response body from the reviewed triage into a temporary UTF-8 file. Do not interpolate review text into shell source. Post with a structured JSON payload, using the **thread ID**, not its numeric comment ID:

```bash
GQL_FILE=$(mktemp)
GQL_RESULT=$(mktemp)
trap 'rm -f "$GQL_FILE" "$GQL_RESULT"' EXIT
jq -n --rawfile body "$BODY_FILE" --arg threadId "$THREAD_ID" '{
  query: "mutation($threadId:ID!, $body:String!) { addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) { comment { id url } } }",
  variables: { threadId: $threadId, body: $body }
}' > "$GQL_FILE"
gh api graphql --input "$GQL_FILE" > "$GQL_RESULT" || exit 1
jq -e '((.errors // []) | length) == 0 and (.data.addPullRequestReviewThreadReply.comment.url | type == "string")' "$GQL_RESULT" > /dev/null || exit 1
```

Check both transport status **and** the GraphQL `errors` array and expected `data` result. Save the returned reply URL. Resolve only after a required reply succeeded or an equivalent current reply was confirmed:

```bash
GQL_FILE=$(mktemp)
GQL_RESULT=$(mktemp)
trap 'rm -f "$GQL_FILE" "$GQL_RESULT"' EXIT
jq -n --arg threadId "$THREAD_ID" '{
  query: "mutation($threadId:ID!) { resolveReviewThread(input: { threadId: $threadId }) { thread { id isResolved } } }",
  variables: { threadId: $threadId }
}' > "$GQL_FILE"
gh api graphql --input "$GQL_FILE" > "$GQL_RESULT" || exit 1
jq -e --arg threadId "$THREAD_ID" '((.errors // []) | length) == 0 and .data.resolveReviewThread.thread.id == $threadId and .data.resolveReviewThread.thread.isResolved == true' "$GQL_RESULT" > /dev/null || exit 1
```

Require the returned thread ID to match and `isResolved: true`, then confirm with a fresh thread read. If the PR head or discussion changed since verification, reconcile before mutation.

These mutations support existing review threads from CodeRabbit, Codex, and human reviewers, subject to token/repository permissions. Do not depend on REST reply routes or use a new top-level issue comment as a substitute for resolving an inline thread. A 403 from one operation does not prove all operations are unavailable; record capability limits separately and continue only independent permitted operations.

## One summary for fixes and skips

Retain Ben's single concise summary of fixes and skips. Include reviewer/source attribution and links to the original body-only/top-level requests so human and Codex feedback remain accounted for. Thread replies above stay on the original discussions; the summary is not a replacement for those replies.

Generate the body from triage into a temporary file and pass it using `gh pr comment <PR> --body-file <file>`. Posting belongs only to the explicitly requested publication-and-resolution pass. Before posting, inspect top-level comments for an existing summary covering the same head and finding IDs; do not duplicate it. Reuse confirmed reply/summary URLs on retries.

```markdown
## PR review — implementation summary

Published fixes at <commit link>. Reviewed <TOTAL> findings: **<FIXED> fixed**, **<SKIPPED> skipped**, **<OPEN> open**.

### Fixed

| Reviewer | Source | File | What changed |
| --- | --- | --- | --- |
| <author> | <source link> | `path/to/file.ts` | One-sentence summary |

### Skipped

| Reviewer | Source | File | Why skipped |
| --- | --- | --- | --- |
| <author> | <source link> | `path/to/file.ts` | One-sentence code-backed rationale |

### Still open

- <source link and outstanding decision, evidence, or capability limit>
```

Omit empty sections. Do not include long copied review prose or a local-only triage path as the sole evidence. Record posted URLs and failures; a top-level human comment or review body is `addressed` only when its fix/disposition and response are recorded, not falsely `thread_resolved`.

### CodeRabbit resolve command

Ben's `@coderabbitai resolve` is supported **only as a top-level PR comment** and applies to CodeRabbit's previous comments. It cannot resolve Codex or human feedback, and CodeRabbit's configuration may forbid an author using it on their own PR.

Prepend `@coderabbitai resolve` to the single summary only when all CodeRabbit findings in the complete live inventory are terminal, every CodeRabbit inline thread has confirmed resolution, and no unpublished fixes, unverified items, unsettled human follow-ups on those threads, or blocked CodeRabbit items remain. A narrowed reviewer scope cannot justify a global command if unprocessed CodeRabbit feedback exists. For other reviewers alone, or incomplete CodeRabbit work, post the ordinary summary without that command and keep remaining work open.

If top-level commenting is unavailable with the current token, record `global_resolve_status: unavailable` and the summary communication limit. Preserve successful inline results. Do not fall back to another identity or claim the global command succeeded. Even when the comment posts, `posted` records delivery; re-read the actual thread state before claiming CodeRabbit closed anything.

References: [GitHub review-thread schema](https://docs.github.com/en/graphql/reference/pulls), [CodeRabbit resolve command](https://docs.coderabbit.ai/guides/commands#resolve-comments-and-request-approval).
