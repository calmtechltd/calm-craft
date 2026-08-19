---
name: branch-cleanup
description: Find and clean up merged branches, stale worktrees, and fully-merged Graphite stacks. Use whenever the user wants to tidy up branches or worktrees — "clean up my branches", "delete merged branches", "I've got too many branches", "prune worktrees", "what's safe to delete", "did this ever get merged", or after PRs land and they ask what's left to clear out. Handles squash-merges (which git branch --merged silently misses), Graphite stacks, and worktrees left behind by Claude Code and Codex/Cursor sessions. Always reports before deleting, separates what is provably merged from what needs a decision, and never touches remote branches.
---

# Branch Cleanup

Delete the branches whose work is already in trunk, and leave everything else alone. The hard part is not the deleting — it is proving a branch is merged when squash and rebase merges have destroyed the ancestry git would normally use.

`git branch --merged` is close to useless on a modern GitHub repo. A squash merge replays the branch as one new commit, so the tip is not an ancestor of trunk and the branch looks unmerged forever. Force-deleting on a weak signal throws away work with no undo beyond the reflog. Collect several independent signals per branch and only call something `safe` when the content is *provably* in trunk.

## When to use

- "Clean up my branches" / "delete merged branches" / "I've got too many branches."
- "Prune worktrees" / "what's safe to delete" / "did this ever get merged?"
- After PRs land and leftover local branches or agent worktrees are in the way.

**Not this skill:** reviewing a branch (`branch-self-review`), opening or editing a PR (`update-pr` / `ready-for-pr`).

## Workflow

### 1. Scan

Run the bundled scanner. It is read-only — it never deletes a branch, removes a worktree, rewrites history, or pushes. The only thing it changes is remote-tracking refs, via `git fetch --prune`.

The script lives next to this file, at `scripts/scan.py`. Plugin install paths vary by host — resolve it from this skill's directory, not from `~/.claude/skills`.

```bash
python3 <skill-dir>/scripts/scan.py
```

Add `--repo PATH` for another repo, `--no-fetch` to skip the fetch, `--json-only` to suppress the stderr digest. JSON goes to stdout; the digest goes to stderr.

**Fetch first, always.** A local trunk that hasn't been pulled since the last merge makes every recently merged branch look unmerged. The scanner compares against `origin/<trunk>` for this reason. If the fetch fails (SSH agent asleep, offline), say so in the report — the verdicts then under-report what is safe rather than over-report it, but I should know.

### 2. Report before doing anything

The scanner returns a verdict per branch, worktree, and stack. Present them grouped, in the format below, and stop. Deleting without showing the list first removes the chance to spot the one branch I still care about.

### 3. Delete only what was confirmed

Local branches only. Remote branches are reported with the command, never deleted.

## The three verdicts

**`safe`** — the content is provably in trunk and nothing depends on the branch. Proof is one of:

- the tip is an ancestor of `origin/<trunk>`, so git itself guarantees the content is there; or
- a merged PR whose `headRefOid` equals the local tip exactly — meaning what was merged is precisely what is local, nothing more.

**`ask`** — probably merged, but with a complication worth a sentence:

| Situation | Why it isn't automatic |
| --- | --- |
| PR merged, local tip ≠ merged head | There are local commits that never went through the PR |
| PR closed without merging | Abandoned, or about to be reopened — only I know |
| Upstream branch deleted on remote | Usually means merged and cleaned up, but that is an inference |
| Merged, but checked out in a worktree | An agent may be working in it right now |
| Merged, but has unmerged Graphite children | Deleting it strands the children |
| Content looks already applied to trunk | Weak squash hint only — see below |

**`keep`** — trunk, protected names, the current branch, open PRs, and anything with unmerged work.

### Resolving "merged, but the local tip differs"

This is the most common `ask`, and it is usually resolvable in under a minute rather than being handed back as a shrug. It happens whenever the branch was re-pushed after the PR record was written, or the PR's head commit has since been garbage-collected locally. Check whether the branch's own commits are already upstream:

```bash
git cherry -v origin/<trunk> <branch>          # a leading "-" means already upstream
git show <branch-commit> | git patch-id --stable
git show <trunk-commit>  | git patch-id --stable
```

Identical patch-ids mean it is the same change, squash-merged — promote it to `safe` and say in the report why it moved. If `git cherry` shows a `+`, there is genuinely a commit that never reached trunk: name that commit in the report and let me decide.

Do not confuse this with the branch simply being old. A large `git diff` against trunk usually just means trunk has moved on. `git log origin/<trunk>..<branch>` is the question that actually matters.

### The squash-merge hint is a hint

The scanner computes the classic "replay the branch tree onto the merge base and see if trunk already has that patch" check. On a real repo it produced one correct answer out of three — it goes wrong as soon as trunk moves on. It is reported as evidence, and it never on its own makes a branch `safe`. If it is the only signal, that branch belongs in `ask`.

## Deleting

The right command is per-branch, not per-repo. The scanner puts the correct one in each branch's `delete_command` field — use it rather than assuming.

**Graphite-tracked branches** — `graphite_tracked: true`, meaning Graphite has a parent recorded for them:

```bash
gt delete <branch>
```

Graphite keeps its own parent/child metadata. Deleting one of these with plain git leaves that metadata pointing at a branch that no longer exists and orphans anything stacked on top. `gt delete` restacks the children onto the parent and cleans the metadata. It is local-only and does not touch GitHub.

**Everything else, including untracked branches inside a Graphite repo** — use plain git:

```bash
git branch -D <branch>
```

A Graphite repo is not uniformly Graphite. Any branch made with `git checkout -b` sits there untracked, and `gt delete` refuses it outright. Plain `git branch -D` is the correct tool for those, and it is safe precisely because there is no Graphite metadata to corrupt. Do not "fix" this by running `gt track` first.

**Run the deletes as separate commands, not chained with `&&`.** These are independent branches; one refusal should not silently cancel the rest.

Do **not** run `gt sync` to do the cleanup. It is interactive, it rebases every open stack, and rebasing branches that are checked out in agent worktrees is a good way to break a session that is mid-task. Mention it as something I can run myself if I want the full sync.

`-D` rather than `-d` is deliberate: `-d` refuses to delete squash-merged branches, because from git's point of view they were never merged. The PR evidence is what justifies the force. Only use `-D` on branches the scan proved `safe`.

## Worktrees

Claude Code creates them under `<repo>/.claude/worktrees/`, Codex and Cursor under `~/.cursor/worktrees/<repo>/`, often on a detached HEAD. The scanner labels which tool made each one.

The thing git cannot see is whether an agent is *live* in a worktree right now. A session with nothing uncommitted looks identical to an abandoned one. So the scanner uses three guards, and a worktree only counts as `safe` when all pass:

- **Uncommitted changes** → keep. Removing it destroys the work.
- **Touched in the last 24 hours** → keep, and say which tool owns it.
- **Locked** → keep, the lock is explicit intent.

`prunable` worktrees are the genuinely free win: the directory is already gone and only git's bookkeeping remains.

```bash
git worktree prune                 # clears every prunable entry at once
git worktree remove <path>         # a real worktree; refuses if dirty
```

Prune before deleting branches — a stale worktree entry can still pin a branch and make the delete fail.

## Graphite stacks

A stack is only fully cleanable when every branch in it is merged. The scanner reports each stack with a per-branch verdict and an `all_merged` flag.

```bash
gt delete --upstack <base-branch>   # whole stack, only when all_merged is true
```

Never delete a merged branch out of the middle of a live stack as a standalone action. A merged parent with unmerged children is an `ask`, not a `safe`.

Graphite keeps metadata for branches long after they are deleted, and branches created with plain `git checkout -b` have no Graphite parent at all. Treat a missing stack relationship as "unknown", not "no children".

## Remote branches

Report them, never delete them. Deleting `origin/<branch>` changes shared state, and a merged PR's branch is sometimes deliberately kept for a revert window or a deploy tag. List them with the command so I can run it deliberately:

```bash
git push origin --delete <branch>
```

`git fetch --prune` (which the scan runs) already removes local remote-tracking refs for branches deleted on the remote.

## Report format

Lead with the safe list. Keep reasons to one line each.

```
## Safe to delete — <n> branches
These are provably in <trunk>. I'll delete them locally on your say-so.

- <branch>            PR #123 merged, local tip is exactly what merged
- <branch>            tip is an ancestor of origin/main

## Worth a look — <n>
- <branch>            PR #456 merged, but you have 2 local commits that never went through it
- <branch>            PR #789 closed without merging — abandoned, or coming back?

## Worktrees
Safe:  <path>         directory already gone, bookkeeping only
Keep:  <path>         claude-code, uncommitted changes, active 20m ago

## Stale on the remote — reported only
- origin/<branch>     PR #123 merged
  git push origin --delete <branch>

## Keeping
<n> branches: trunk, 3 open PRs, 5 with unmerged work.
```

Collapse cascades. When four stacked branches are each `ask` solely because their child is unmerged, that is one fact about the stack — say "stack `a → b → c → d` is blocked by `d` being unmerged work" and move on.

If the safe list is empty, say why in one line — usually a failed fetch, a repo with no GitHub remote, `gh` not authenticated, or a PR listing truncated at 1000 (all of which the scanner reports).

## Anti-patterns

- **Deleting before the report.** I need to see the list first.
- **Deleting remote branches.** Report the command; do not run it.
- **`gt sync` as cleanup.** Interactive rebase of every open stack.
- **`gt track` just so `gt delete` will accept an untracked branch.**
- **Treating the squash-merge hint as proof.**

## Related skills

- `ready-for-pr` — gates on a live branch, not leftover ones
- `update-pr` — PR metadata on the current branch
- `branch-self-review` — review a live branch before anyone else does
