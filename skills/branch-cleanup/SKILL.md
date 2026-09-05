---
name: branch-cleanup
description: Survey local branches, worktrees, and Graphite stacks for cleanup, including squash-merged PRs. Use for branch or worktree cleanup and merge-status questions. Report merge evidence and ownership blockers before authorized local deletion; remote branches are report-only.
---

# Branch cleanup

Resolve `scripts/scan.py` relative to this skill's directory and run it with Python 3:

```bash
python3 -B <skill-dir>/scripts/scan.py --repo <repository>
```

Add `--no-fetch` for an offline survey and `--json-only` to suppress the stderr digest. The scanner fetches and prunes remote-tracking refs by default, which also updates Git's fetch metadata and object store. With fetch disabled it avoids Git object/index writes. It never deletes branches, removes worktrees, rewrites history, or pushes.

Use the host's required network/authentication permissions for the scanner's GitHub calls. A sandbox, Keychain, or network failure is unavailable evidence, not proof of invalid credentials. Report failed fetches, stale refs, missing Graphite metadata, and truncated PR inventories.

## Assess the evidence

The scanner compares against the selected trunk, preferring its origin ref. Confirm a guessed trunk before deletion. A branch's work is proved merged when either:

- Its tip is an ancestor of that trunk.
- A merged PR's head exactly matches its tip **and the PR's merge commit is an ancestor of that trunk**. This includes a stacked PR whose merge result eventually reached trunk.

A PR merged only into an unfinished parent branch is insufficient. A reused branch name, missing merge commit, or mismatched head retains uncertainty.

`git cherry -v <trunk> <branch>` can help investigate uncertain cases: `-` indicates an equivalent individual patch, while `+` means no equivalent patch was found. A plus does not prove the work is absent after squash, rebase, or later edits. One matching patch ID does not prove an entire branch is merged. The scanner does not manufacture temporary commits to estimate squash equivalence.

The verdicts include ownership checks:

- **safe:** sufficient merge evidence and no known deletion blockers.
- **ask:** evidence or ownership is incomplete, including unknown Graphite metadata.
- **keep:** protected/current branch, open PR, active or dirty worktree, or work whose merge is unproved.

A branch checked out in another worktree remains blocked. Worktree eligibility is evaluated separately, using the same merge evidence and stack guards. Main and current worktrees, locked or dirty worktrees, unreadable status/activity, and detached heads remain protected or uncertain. Activity within 24 hours blocks removal; older timestamps do not prove an agent session has ended. Confirm session ownership before removal. Locked entries stay protected even if Git marks them prunable.

## Report and act within authorization

Present the concrete branch/worktree list before deletion, with one reason per item. Group safe, uncertain, and protected items; collapse repeated stack blockers. Reuse existing authorization for those exact items when available. Otherwise obtain approval for the proposed local deletions. A survey request alone does not authorize deletion.

Immediately before deleting, refresh relevant refs and recheck tips, current branch, worktree status/locks/activity, session ownership, and Graphite relationships. Changed evidence requires reassessment. Do not treat a saved `safe` verdict as continuing authorization.

The scanner supplies `delete_command` only for eligible branches:

- Graphite-tracked branch: use `gt delete`, preserving Graphite's metadata.
- Confirmed untracked branch: use `git branch -D -- <branch>`. Force deletion is justified only by the verified merge evidence and the user's authorization.
- Unknown Graphite ownership: resolve the metadata uncertainty first.

Quote paths and branch names as arguments. Remove an approved clean worktree with `git worktree remove <path>`, then rescan its branch. Preview pruning with `git worktree prune --dry-run`; pruning affects every eligible stale entry, so its full scope must be authorized. Do not force removal of a dirty or locked worktree.

Do not run `gt sync`, track branches just to delete them, or rebase/restack live work as incidental cleanup. Check every stack member's current eligibility before using a stack-wide operation; a merged parent with unfinished descendants needs a separate decision.

Remote branches are reported only. Their continued existence may be deliberate; do not delete them as part of this skill.
