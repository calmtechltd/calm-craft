# GitHub access for PR review workflows

Read before fetching or publishing review feedback. Keep Ben's classify, implement, skip-reply, and single-summary workflow; use these transport rules on both desktop and cloud hosts.

## Credentials and PR identity

Use the host's existing `gh` credentials and network policy, including its instructions for sandboxed network access. Preserve a desktop host's configured Keychain or SSH-agent authentication. Cloud hosts use their supplied credentials and Git transport; do not require macOS Keychain or an SSH agent there. Do not print tokens, replace the host's identity, or start an interactive login because one endpoint failed.

Use the selected PR's **base repository** for API requests and its **head repository and branch** for publishing, including fork PRs. When the cloud checkout has detached HEAD, use the explicit PR URL/number from the user or task context and verify its repository and head against the checkout. Do not infer a PR from an empty branch name or switch to someone else's branch.

## Reads and pagination

REST reads of inline comments, top-level comments, and review bodies retain Ben's original material. GraphQL review threads supply the actual thread IDs and reply/resolve capabilities. Numeric REST comment IDs and GraphQL comment node IDs are not thread IDs; map comments by `databaseId`.

Inspect both the command result and GraphQL `errors`, including partial-data responses. Paginate every source and nested thread discussion before claiming a complete review. A failed source fetch is missing evidence, not an empty source. Save successful reads, report the missing source, and keep affected findings unverified until it is available.

## Writes with restricted cloud credentials

- Reply on an existing thread with `addPullRequestReviewThreadReply`; resolve it with `resolveReviewThread`. Use its GraphQL thread ID and check `viewerCanReply` / `viewerCanResolve` separately. These are the supported operations, subject to the current token's permissions.
- Do not use REST inline-reply routes or a new top-level comment to work around an inline-thread failure. Do not assume changing APIs fixes a permission denial.
- Ben's single top-level fixes-and-skips summary remains part of the publication pass when permitted. Its commenting permission is separate from inline replies and resolution. If denied, record the summary as unavailable, preserve confirmed inline results, and report the missing summary to the user without repeated attempts.
- `@coderabbitai resolve` is only a top-level PR command for CodeRabbit. It is not a substitute for resolving Codex or human threads and must not be placed in an inline reply.

A permission-denied response identifies an unavailable operation, not necessarily an invalid login. Distinguish permission errors from rate limits and transport failures; follow the server's retry timing for rate limits. A 404 can also conceal inaccessible private resources; check the PR identity, endpoint, and host authentication evidence before diagnosing it. Continue independent supported work and report each failed operation precisely. Never claim a posted summary or resolved thread without confirmed results.

References: [GitHub review threads and mutations](https://docs.github.com/en/graphql/reference/pulls), [GitHub API authentication and permission errors](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api), [CodeRabbit resolve command](https://docs.coderabbit.ai/guides/commands#resolve-comments-and-request-approval).
