---
name: coderabbit-review-triage
description: Download CodeRabbit PR review feedback, save raw comments under .active/, verify findings against the codebase, and produce a triage breakdown of obvious fixes, skips, and items needing user input. Fetch via GitHub GraphQL review threads — never GitHub MCP addComment, never gh pr comment, never REST POST of new PR comments. Use when the user wants to process a CodeRabbit review, triage PR bot comments, or prepare review feedback before implementing fixes. Never invents verdicts.
---

# CodeRabbit Review Triage

Turn a bot PR review into an actionable triage package: raw comments on disk, a categorized breakdown, and a verdict per finding (**Obvious Fix**, **Skip**, or **Needs Input**). Pairs with `coderabbit-review-implement` for local fixes, and `coderabbit-review-implement-all` when I ask to publish and resolve.

This skill is **read-only** for product code — it may write files under `.active/` only.

**Do not talk to CodeRabbit through new GitHub issue comments during triage.** Reads and inline-thread resolution use **GraphQL review threads**. The later implement-all pass may post one guarded PR-level resolve summary after publication when completed findings exist only in the review body; some cloud agent tokens cannot post it and must report that limitation.

If the repo has no CodeRabbit review on the PR, say so and stop. Do not invent findings.

## When to use

- "Pull CodeRabbit feedback from my PR and triage it."
- "Download the review comments and tell me what to fix vs ignore."
- "Go through the CodeRabbit review and ask me about ambiguous items."
- Before running `coderabbit-review-implement`.

**Not this skill:** implementing fixes (`coderabbit-review-implement`), reviewing the branch yourself (`branch-self-review`), triaging a user bug (`spec-triage-bug-report`).

## Multitask rule

When the review has **more than ~10 findings** or spans many modules, **delegate investigation to a background subagent** (`Task` with `run_in_background: true`):

- Fetch and parse comments
- Verify Critical + sample Major items against current code
- Classify all findings
- Write output files

The foreground agent then **presents results** and asks **Needs Input** questions **one at a time**. Do not batch ambiguous questions.

For small reviews (≤10 items), inline triage is fine.

---

## Workflow

### 1. Identify the PR

```bash
git branch --show-current
gh pr view --json number,title,url,headRefName,baseRefName
```

If no PR exists for the branch, ask for the PR number or URL.

### 2. Download review material

Use `gh api graphql` (requires network). **Do not** use GitHub MCP comment tools, `gh pr comment`, or REST `POST` of comments. REST `GET` of `/pulls/.../comments` is also the wrong shape — it has no thread id, so implement-all cannot resolve the inline thread directly with GraphQL.

Paginate **every** connection until `hasNextPage` is false: issue `comments`, `reviews`, `reviewThreads`, and nested `reviewThreads.comments`. Accumulate pages before parsing findings. A capped first page with no `after` loop can drop threads or replies with no error.

Each page must request `pageInfo { hasNextPage endCursor }` and pass `after: $cursor` on the next request (`cursor` null on the first page). Nested thread comments need the same loop per thread when that thread's `comments.pageInfo.hasNextPage` is true.

Example `reviewThreads` page (loop on this connection's `endCursor` until `hasNextPage` is false). Paginate `comments` and `reviews` the same way, each with its **own** cursor — never reuse a thread cursor on those connections.

```bash
owner=$(gh repo view --json owner --jq .owner.login)
repo=$(gh repo view --json name --jq .name)
pr=<N>

gh api graphql -F owner="$owner" -F repo="$repo" -F pr="$pr" -F cursor=null -f query='
query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) {
  repository(owner:$owner, name:$repo) {
    pullRequest(number:$pr) {
      title
      url
      reviewThreads(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          comments(first: 50) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              body
              path
              line
              author { login }
            }
          }
        }
      }
    }
  }
}'
```

Then paginate nested `comments` per thread that still has `hasNextPage`.

GraphQL bot login is `coderabbitai` (no `[bot]` suffix). REST would be `coderabbitai[bot]` — do not mix the filters.

**Keep only threads whose root comment author is `coderabbitai`.** The root is the first comment on the thread. Replies from humans or other bots stay on those threads and are stored for later duplicate detection. Drop human-rooted threads entirely — `coderabbit-review-implement-all` must not reply on or resolve them.

Keep every accepted thread `id` (`PRRT_…`). That is what `resolveReviewThread` and `addPullRequestReviewThreadReply` need. `databaseId` alone is not enough.

| Source | Content |
| --- | --- |
| PR comment (`coderabbitai`) | Walkthrough / PR summary — read only |
| Review body (`coderabbitai`) | Major, Nitpick, Outside-diff comments — read only |
| Review threads | Inline findings — store `id` + root comment |

### 3. Create the review folder

```text
.active/coderabbit-pr-<N>-review/
├── 00-pr-metadata.json
├── 01-walkthrough-summary.md
├── 02-review-body-full.md
├── 03-inline-comment-*.md
├── 03-inline-comments.json
├── raw-comments/
├── 04-categorized-breakdown.md
├── 05-comments-structured.json
└── 06-triage-decisions.md
```

Folder name pattern: `.active/coderabbit-pr-<number>-review/`.

### 4. Parse findings

Extract each finding from the review body:

- Category sections: `Outside diff range`, `Major comments`, `Nitpick comments`
- Per finding: file path, line range, severity tags, title, summary
- Outside-diff comments may be nested in blockquotes — strip `> ` prefixes before parsing

Also include inline Critical comments as separate findings.

Write `04-categorized-breakdown.md` with:

- Overview counts
- Quick triage checklist
- **By Theme** (security, API patterns, accessibility, etc.)
- **By Category** (Critical / Major / Nitpick / Outside diff)
- **By File**

See [output-templates.md](output-templates.md) for section shapes.

### 5. Verify against code

**Do not trust bot findings blindly.** For each finding (at minimum Critical + a representative sample of Major):

1. Read the cited file and lines
2. Confirm the issue still exists on the current branch
3. Check whether the codebase already addresses it (a helper, middleware, a sibling pattern)

Mark stale or already-fixed findings as **Skip** with a one-line rationale citing the actual code path.

### 6. Classify each finding

Exactly one verdict per finding:

| Verdict | When |
| --- | --- |
| **Obvious Fix** | Valid, clear, minimal change aligned with this repo's conventions |
| **Skip** | Already fixed, bot misunderstood code, intentional design, or no current render/behaviour gap |
| **Needs Input** | Genuine product/design fork — not just "we could do it either way" |

**Be conservative with Needs Input.** Convention nits the repo has already decided (accessibility labels, date handling, toast policy, tenancy helpers) are **Obvious Fix**, not Needs Input. Follow `.engineering/conventions.yaml` and the existing pattern; do not reopen them.

### Low-value nitpicks (bundle rule)

CodeRabbit often tags doc-only or lint-only items as nitpicks or "low value" (JSDoc on new exports, a fence language hint, a one-line comment explaining a safe cast). Treat them differently from substantive **Skip** items (wrong bot analysis, intentional design, over-scoped refactors).

After classifying all findings, count **substantive** obvious fixes — anything that changes runtime behaviour, UX, types at boundaries, or security. **Do not** count pure-doc/lint nits in that count.

| Situation | Low-value nitpick verdict |
| --- | --- |
| **≥1 substantive Obvious Fix** on the PR | **Obvious Fix** — bundle with the same implement pass; cheap polish while the branch is already dirty |
| **No substantive Obvious Fix** (only nitpicks would ship) | **Skip** — do not recommend a PR that only lands JSDoc/README/comment nits |
| Substantive fix exists but nit is **over-scoped** (e.g. a generic typing refactor) | **Skip** — bundling rule does not apply |

Record bundled nits in `06-triage-decisions.md` under **Obvious Fixes** with a note such as *Bundled low-value nit (substantive fixes also shipping).*

`coderabbit-review-implement` should implement these bundled items together with other obvious fixes, not defer them.

Common **low-value nitpick** patterns (bundle → **Obvious Fix** when substantive fixes exist):

- JSDoc on new shared exports
- README / markdown fence language hints (MD040)
- Brief comment documenting an intentional type assertion (not a generic refactor)

### 7. Write triage output

Update `05-comments-structured.json` — add to each entry:

```json
{
  "id": "finding-1",
  "thread_id": "PRRT_…",
  "comment_database_id": 123,
  "path": "src/…",
  "line": 10,
  "is_resolved": false,
  "is_outdated": false,
  "triage": "obvious_fix | skip | needs_input",
  "triage_rationale": "One sentence why"
}
```

Every inline finding must have `thread_id`. Findings that only exist in the review body (no thread) omit it and cannot be resolved individually.

Write `06-triage-decisions.md` with summary counts and three sections: **Obvious Fixes**, **Skipped**, **Needs Input**. Order by severity within each section.

### 8. Present to me

1. Share summary counts and path to `06-triage-decisions.md`
2. For **Needs Input** items only: ask **one question at a time**, wait for an answer, update triage if I reclassify, then move to the next
3. When Needs Input is empty (or all answered), say I can run `coderabbit-review-implement` for local fixes only. Publishing and resolving is a separate, explicit skill — `coderabbit-review-implement-all`.

Do **not** start implementing fixes in this skill.

## Quality gate

- [ ] All bot comments captured (walkthrough + review body + inline)
- [ ] Finding count in breakdown matches parsed list
- [ ] Critical items verified against code
- [ ] Every **Skip** has a code-backed rationale, not "seems fine"
- [ ] **Needs Input** items have a specific question each (not vague)
- [ ] No product code modified outside `.active/`

## Anti-patterns

- **Posting a new PR comment during triage.** Resolve later in `coderabbit-review-implement-all`, primarily via GraphQL threads and, only when required for review-body findings, its guarded PR-level summary.
- **Implementing fixes during triage.**
- **Skipping code verification on "obvious" bot comments.**
- **Marking everything Needs Input.**
- **Asking multiple ambiguous questions in one message.**
- **Skipping all low-value nits when substantive fixes are already shipping.**

## Related skills

- `coderabbit-review-implement` — implement **Obvious Fix** items locally; no publish or resolve
- `coderabbit-review-implement-all` — publish those commits, then resolve CodeRabbit comments
- `branch-self-review` — review the branch yourself, before a bot does
- `spec-triage-bug-report` — triage user bug reports against specs
- `update-pr` — refresh the PR description after the review lands

## Additional resources

- Output file templates: [output-templates.md](output-templates.md)
