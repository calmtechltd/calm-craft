---
name: update-pr
description: Write or update the current branch's GitHub PR title and description via the gh CLI, grounded in the branch diff and commits, preserving existing ticket references. Use for a full rewrite before or after opening a PR, an incremental sync after new commits, or a title-only fix — "update my PR", "refresh the PR description", "sync PR with my changes", "fix the PR title", "write the PR description", "tidy up this PR". This skill is the authority on PR title and body format.
---

# Update PR

Rewrite or incrementally sync the **current branch's** open PR title and body using `gh`. Pairs with `ready-for-pr` before the first update and `coderabbit-review-triage` after review feedback lands.

Requires `gh` authenticated for the repo (`gh auth status`). Ticket pattern, default branch, and tracker URL: `.engineering/config.yaml`. Spec format: [`references/spec-format.md`](../../references/spec-format.md).

This file owns the **PR title and body format**. A repo submit skill should follow it rather than restate it.

## When to use

- "Update my PR" / "sync PR with my changes."
- "Refresh the PR description" / "rewrite the PR" / "tidy up this PR."
- "Fix the PR title" / "write the PR description."

**Not this skill:** opening, merging, or retargeting a PR; running gates (`ready-for-pr`); processing bot review (`coderabbit-review-triage`).

## Modes

| Mode | When | What changes |
| --- | --- | --- |
| **Full refresh** | First update, big scope change, or I say "rewrite" / "refresh" | New title + full body from branch state |
| **Incremental** | New commits since last update, small follow-up edits | Merge into existing body; adjust title only if scope shifted |
| **Title only** | I say "fix the PR title" | `gh pr edit --title` alone |

Default to **incremental** when the PR already has a substantive body and I am continuing work. Default to **full refresh** when the body is empty, a template stub, or clearly stale vs the diff.

Ask once if ambiguous: "Full refresh or incremental update?"

---

## 1. Resolve the PR

```bash
set -e
git branch --show-current
gh pr view --json number,title,body,url,baseRefName,headRefName,commits
BASE=$(gh pr view --json baseRefName --jq .baseRefName) || exit 1
test -n "$BASE" || { echo "PR base branch is empty"; exit 1; }
git fetch origin "$BASE" || { echo "Failed to refresh origin/$BASE"; exit 1; }
```

If no PR exists for the branch, stop and ask whether to open one. Do not create it from this skill. If the repo has a submit skill, that is the path; otherwise I open it.

Run the commands in one shell invocation so `BASE` remains available through the fetch. Record `number`, `baseRefName`, and the current `title` / `body`.

For **title only**, skip steps 2–6 after resolving the PR. Use the title-only command in step 7, then verify that the body still matches the value read here.

## 2. Collect ticket identifiers — before drafting anything

Extract every ticket reference **first**, so a rewrite can never drop one. Search in this order:

1. Current PR title
2. Current PR body — ignoring bot blocks (see step 6)
3. Commit messages on the branch vs base
4. Branch name (rare)

Use `tickets` in `.engineering/config.yaml`. With `provider: none`, skip this step — do not invent a prefix. With a provider, use `pattern` and `url` when they exist (`github` can also infer from the repo). Common shapes: bracketed `[ABC-123]`, bare `ABC-123`, a tracker URL.

```bash
set -e
BASE=$(gh pr view --json baseRefName --jq .baseRefName) || exit 1
test -n "$BASE" || { echo "PR base branch is empty"; exit 1; }
git log --format=%B "origin/${BASE}...HEAD"
```

Dedupe, preserve first-seen order, and store the list. Every ticket found **must** appear in the updated metadata. Never invent, renumber, or drop one.

## 3. Gather branch context

```bash
set -e
BASE=$(gh pr view --json baseRefName --jq .baseRefName) || exit 1
test -n "$BASE" || { echo "PR base branch is empty"; exit 1; }
git log --oneline "origin/${BASE}...HEAD"
git diff --stat "origin/${BASE}...HEAD"
git diff "origin/${BASE}...HEAD"
```

The description describes **the branch**, not the last commit. Read the substantive files, not just the stat.

Scan for:

- **Specs touched** (`specs/**/*.md`) — cite the spec path and the behaviour IDs that shipped
- **Schema or migration changes** — the Notes convention below applies when the repo has them
- **Implementation plans** (`.active/**`, `.plans/**`) — mention the chunk if the branch completes one
- Breaking, risky, or permission-sensitive areas worth a test-plan line

For **incremental**, identify what is genuinely new since the body was last accurate by cross-checking commit subjects and changed files against the existing body. Describe only what changed.

## 4. Draft the title

- **Verb first** — Add, Ship, Fix, Replace, Refactor, Reorder, Allow.
- **Specific and reviewer-facing** — what the PR achieves, never the branch slug. No full stop.
- Backticks for code identifiers.
- **Ticket prefix** when `tickets.provider` is not `none` and tickets were found. Multiple tickets: prefix with each, space-separated. Do not invent a prefix the repo does not use.
- Longer and more explicit than a commit subject; one line, ideally ≤72 chars.
- Preserve intentional existing prefixes (`[DONT MERGE]`, `fix:`, `feat(scope):`) unless asked to remove them.

**Never ship a commit message as the PR title.** For **incremental**, keep the existing title unless new commits materially change scope.

## 5. Draft the body

Full refresh and incremental modes use this step. Title-only mode skips it.

Write in **en-GB**.

```markdown
## Summary

- <User-facing change in one substantial sentence. Bold the key concept.>
- <One bullet per meaningful strand of the change.>
- Spec: `specs/path/to/thing.md` — behaviours B1–B12 implemented.

## Test plan

- [ ] <Concrete thing a reviewer can click through and verify>
- [ ] <Edge case or permission boundary worth checking>
- [ ] Run <the specific tests this branch touches>

## Notes

- **Migration required**: includes `<artifact>` (<what it adds>).
- <Anything you want the reviewer to look at especially hard.>

Resolves [<id>](<tracker url>)
```

| Section | When |
| --- | --- |
| **Summary** | Always. Outcome-focused bullets — not a file list. 1–3 for small PRs. Cite specs when the work is spec-driven. |
| **Test plan** | Always. Concrete checks a reviewer can run. Name test files or commands where they exist. If nothing was run, say `- Not run (not requested).` — never fabricate results. |
| **Notes** | When it applies. Schema/migration artifacts, feature flags, env vars, deploy ordering, follow-ups. |
| **Resolves** trailer | One line per ticket from step 2, using `tickets.url` when configured. Omit the trailer when `provider` is `none` or no tickets were found. |

Drop sections that genuinely don't apply, but Summary and Test plan always apply.

No AI filler — "This PR introduces…", "In order to…". Match the tone of recent merged PRs: direct and specific.

## 6. Preserve vs replace

Full refresh and incremental modes use this step. Title-only mode leaves the body unchanged.

**Bot blocks — strip while drafting, restore on apply.** These are two separate decisions:

- **Never draft from them.** CodeRabbit's `## Summary by CodeRabbit` section is not input for your Summary. Ticket extraction in step 2 ignores bot blocks too.
- **Never delete them.** `--body-file` replaces the entire body, so a blind overwrite destroys the block. Capture the current body first, and re-append everything from `<!-- This is an auto-generated comment: release notes by coderabbit.ai -->` onwards, verbatim, at the bottom of the new body.

**Always strip:** empty placeholder lines left by the PR template.

**Always carry forward**, in both modes:

- Every ticket reference from step 2
- Explicit deploy or migration warnings from the old body → merge into **Notes**
- User-written checklist items still accurate → merge into **Test plan**, preserving checked state

**Incremental merge rules:**

1. Preserve user-authored sections and reviewer callouts.
2. **Summary** — correct bullets that are now wrong; append one for meaningful new work. Don't duplicate.
3. **Test plan** — add checkboxes for new behaviour; leave existing checked items alone.
4. Never delete unrelated sections, or review threads someone pasted into the body.
5. If the change is trivial (typo, copy, no-behaviour refactor), a one-line append under **Notes** is enough — skip rewriting Summary.

**Full refresh** replaces the human-written prose, but the carry-forward list above still applies.

## 7. Apply

Preview the fields you will change before applying them.

**Title only:**

```bash
gh pr view --json number,title --jq '"#\(.number) \(.title)"'
gh pr edit --title "Add inbound email image attachments"
```

Compare the body returned in step 8 with the body read in step 1. Stop and report any unexpected difference.

**Full refresh or incremental:** write the complete body to a file, then edit both fields:

```bash
gh pr view --json number,title --jq '"#\(.number) \(.title)"'
gh pr edit --title "Add inbound email image attachments" --body-file /tmp/pr-body.md
```

With no argument, `gh pr edit` targets the current branch's PR. Use `--body-file` rather than a heredoc or `-b`.

**Before writing the file, confirm it ends with the preserved bot block** from step 6, if the PR had one.

## 8. Verify

```bash
gh pr view <number> --json title,body,url
```

Confirm:

- Every ticket from step 2 appears in the title and/or the `Resolves` trailer
- The title is not the branch name or a commit subject
- The test plan is honest about what was actually run
- For title-only mode, the body is byte-for-byte unchanged from step 1

## Do not

- **Touch any PR but the current branch's**, unless I name a different number or URL.
- Push commits, create, merge, close, or retarget the PR — this skill only edits metadata.
- Run builds or test suites merely to draft metadata.
- Replace a detailed user-written body with a generic stub on an incremental run.
- Fabricate test results or ticket IDs.
- Include secrets, `.env` values, or internal URLs.

## Final response

- PR URL
- Old title → new title
- One-line note on what the summary emphasises
- Tickets preserved, and any surfaced from commits that weren't on the PR before
- Anything you could not infer

## Quick triggers

| User says | Mode |
| --- | --- |
| "Update my PR" / "sync PR" | Incremental if a body exists, else full |
| "Refresh PR description" / "rewrite PR" / "tidy up this PR" | Full |
| "Fix the PR title" / "update PR title" | Title only |
| "Add test plan for …" | Incremental — Test plan section only |

## Related skills

- `ready-for-pr` — run the gates before updating a PR I'm about to ask for review on
- `coderabbit-review-triage` — process bot feedback once the PR is up
- `branch-cleanup` — leftover branches after the PR merges
