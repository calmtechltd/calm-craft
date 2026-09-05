#!/usr/bin/env python3
"""Read-only survey of a repo's local branches, worktrees and Graphite stacks.

Emits JSON describing every local branch, every worktree, every Graphite stack
and every stale remote branch, along with the evidence needed to decide whether
each is safe to delete.

This script never deletes a branch, never removes a worktree, never rewrites
history and never pushes. Fetching updates remote-tracking refs, fetch metadata and Git objects
(skippable with --no-fetch). Deciding and deleting is the
caller's job -- that separation is deliberate, so a bad scan can never destroy
anything on its own.

Usage:
    scan.py [--repo PATH] [--no-fetch] [--json-only]
"""

import argparse
import json
import os
import re
import shlex
import shutil
import sqlite3
import subprocess
import sys
import time

# A worktree touched more recently than this probably has an agent live in it
# (Claude Code / Codex sessions leave no other trace git can see).
RECENT_ACTIVITY_SECONDS = 24 * 60 * 60

# Branch names that should never be offered for deletion regardless of evidence.
PROTECTED_NAMES = {
    "main",
    "master",
    "develop",
    "development",
    "trunk",
    "staging",
    "production",
    "prod",
}
# Deliberately anchored on a slash. A looser `release-` prefix swallows ordinary
# feature branches like `release-channels-self-hosted-ci`, which then never get
# offered for cleanup and quietly accumulate.
PROTECTED_PATTERNS = (
    re.compile(r"^release/"),
    re.compile(r"^releases?$"),
    re.compile(r"^hotfix/"),
)


def run(args, cwd=None, timeout=120):
    """Run a command, returning (returncode, stdout, stderr) with output stripped."""
    try:
        proc = subprocess.run(
            args, cwd=cwd, capture_output=True, text=True, timeout=timeout,
            env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"}
        )
    except (OSError, subprocess.TimeoutExpired) as err:
        return 1, "", str(err)
    return proc.returncode, proc.stdout.strip(), proc.stderr.strip()


def git(args, cwd, timeout=120):
    return run(["git", *args], cwd=cwd, timeout=timeout)


# ---------------------------------------------------------------- repo basics


def repo_root(start):
    code, out, err = git(["rev-parse", "--show-toplevel"], start)
    if code != 0:
        raise SystemExit(f"Not a git repository: {start}\n{err}")
    return out


def common_git_dir(root):
    """The shared .git directory -- shared by every worktree of the repo."""
    code, out, _ = git(["rev-parse", "--path-format=absolute", "--git-common-dir"], root)
    if code == 0 and out:
        return out
    return os.path.join(root, ".git")


def detect_trunk(root, git_dir):
    """Find the trunk branch, preferring Graphite's own declaration."""
    config = os.path.join(git_dir, ".graphite_repo_config")
    if os.path.exists(config):
        try:
            with open(config, encoding="utf-8") as handle:
                trunk = json.load(handle).get("trunk")
            if trunk:
                return trunk, "graphite config"
        except (OSError, ValueError) as err:
            print(f"warning: could not read graphite config: {err}", file=sys.stderr)

    code, out, _ = git(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], root)
    if code == 0 and out.startswith("origin/"):
        return out[len("origin/") :], "origin/HEAD"

    for candidate in ("main", "master", "develop"):
        code, _, _ = git(
            ["show-ref", "--verify", "--quiet", f"refs/heads/{candidate}"], root
        )
        if code == 0:
            return candidate, "fallback guess"

    code, out, _ = git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    return out or "main", "current branch (no trunk found)"


def trunk_ref(root, trunk):
    """Prefer origin/<trunk> -- a local trunk is often stale and yields false negatives.

    This matters more than it looks: a local `main` that has not been pulled
    since the last merge makes every recently merged branch look unmerged.
    """
    code, _, _ = git(
        ["show-ref", "--verify", "--quiet", f"refs/remotes/origin/{trunk}"], root
    )
    if code == 0:
        return f"origin/{trunk}"
    return trunk


# ---------------------------------------------------------------- github prs


def gh_pull_requests(root):
    """Map branch name -> newest PR record. Returns (map, status_string)."""
    if not shutil.which("gh"):
        return {}, "gh not installed"

    code, _, err = run(["gh", "auth", "status"], cwd=root, timeout=30)
    if code != 0:
        return {}, f"gh authentication unavailable ({err.splitlines()[0] if err else 'unknown'})"

    limit = 1000
    code, out, err = run(
        [
            "gh",
            "pr",
            "list",
            "--state",
            "all",
            "--limit",
            str(limit),
            "--json",
            "number,headRefName,state,mergedAt,headRefOid,url,mergeCommit,baseRefName",
        ],
        cwd=root,
        timeout=180,
    )
    if code != 0:
        first = err.splitlines()[0] if err else "unknown error"
        return {}, f"gh pr list failed ({first})"

    try:
        records = json.loads(out or "[]")
    except ValueError as err:
        return {}, f"could not parse gh output ({err})"

    by_branch = {}
    for record in records:
        name = record.get("headRefName")
        if not name:
            continue
        # A branch can be reused across PRs; the highest number is the newest.
        existing = by_branch.get(name)
        if existing is None or record.get("number", 0) > existing.get("number", 0):
            by_branch[name] = record

    status = f"ok ({len(records)} PRs)"
    if len(records) >= limit:
        # Long-lived repos exceed the listing ceiling, so older PRs are missing
        # and some merged branches will look unmerged. Say so rather than let it
        # silently shrink the safe list.
        status = f"ok but truncated at {limit} PRs -- older PRs were not checked"
    return by_branch, status


# GitHub is asked about individual commits only for the handful of branches the
# bulk listing missed; the cap keeps a large repo from turning into a request storm.
COMMIT_PR_LOOKUP_CAP = 25


def gh_pr_for_commit(root, sha):
    """Ask GitHub which PR has this exact commit as its head.

    Returns a PR record or "unknown-commit" when the provider cannot find it.
    Missing provider evidence does not prove that equivalent work is unmerged.
    """
    code, out, err = run(
        [
            "gh",
            "api",
            f"repos/{{owner}}/{{repo}}/commits/{sha}/pulls",
            "--jq",
            "[.[] | {number, state, merged_at, head_sha: .head.sha, url: .html_url, merge_commit_sha, base: .base.ref}]",
        ],
        cwd=root,
        timeout=30,
    )
    if code != 0:
        if "No commit found" in err or "422" in err:
            return "unknown-commit"
        return None

    try:
        records = json.loads(out or "[]")
    except ValueError:
        return None
    for record in sorted(records, key=lambda r: r.get("number", 0), reverse=True):
        if record.get("head_sha") != sha:
            continue
        state = "MERGED" if record.get("merged_at") else record.get("state", "").upper()
        return {
            "number": record.get("number"),
            "state": state,
            "mergedAt": record.get("merged_at"),
            "headRefOid": record.get("head_sha"),
            "url": record.get("url"),
            "mergeCommit": {"oid": record.get("merge_commit_sha")},
            "baseRefName": record.get("base"),
        }
    return None


# ---------------------------------------------------------------- worktrees


def list_worktrees(root):
    code, out, _ = git(["worktree", "list", "--porcelain"], root)
    if code != 0:
        raise SystemExit("Could not inventory worktrees; no deletion advice available")

    worktrees = []
    current = {}
    for line in out.splitlines():
        if not line.strip():
            if current:
                worktrees.append(current)
                current = {}
            continue
        key, _, value = line.partition(" ")
        if key == "worktree":
            current = {
                "path": value,
                "branch": None,
                "head": None,
                "detached": False,
                "prunable": False,
                "prunable_reason": None,
                "locked": False,
            }
        elif key == "HEAD":
            current["head"] = value
        elif key == "branch":
            current["branch"] = value.replace("refs/heads/", "", 1)
        elif key == "detached":
            current["detached"] = True
        elif key == "prunable":
            current["prunable"] = True
            current["prunable_reason"] = value or "gitdir missing"
        elif key == "locked":
            current["locked"] = True
    if current:
        worktrees.append(current)
    return worktrees


def classify_agent(path):
    """Identify which tool created a worktree, from the path conventions in use."""
    lowered = path.lower()
    if "/.claude/worktrees/" in lowered:
        return "claude-code"
    if "/.cursor/worktrees/" in lowered:
        return "cursor-or-codex"
    if "/.codex/" in lowered or "/codex/worktrees/" in lowered:
        return "codex"
    return "manual"


def worktree_activity(path, root):
    """Seconds since the worktree last showed signs of life, or None if gone."""
    if not os.path.isdir(path):
        return None
    stamps = []
    try:
        stamps.append(os.path.getmtime(path))
    except OSError:
        return None
    # The index is rewritten by nearly every git operation, so it is the best
    # single indicator that something was actively working in here.
    code, gitdir, _ = git(["rev-parse", "--absolute-git-dir"], path)
    if code != 0:
        return None
    index = os.path.join(gitdir, "index")
    try:
        stamps.append(os.path.getmtime(index))
    except OSError:
        return None
    return time.time() - max(stamps)


def worktree_dirty(path):
    """True if the worktree has uncommitted changes; None if it cannot be checked."""
    if not os.path.isdir(path):
        return None
    code, out, _ = git(["status", "--porcelain"], path, timeout=60)
    if code != 0:
        return None
    return bool(out.strip())


# ---------------------------------------------------------------- graphite


def graphite_metadata(git_dir):
    """Read Graphite's branch metadata read-only. Returns {branch: {parent, state}}.

    Graphite owns this sqlite file, so retain unavailable metadata as None
    rather than guessing -- being wrong about stack shape risks orphaning work.
    """
    db_path = os.path.join(git_dir, ".graphite_metadata.db")
    if not os.path.exists(db_path):
        return None if os.path.exists(os.path.join(git_dir, ".graphite_repo_config")) else {}
    try:
        uri = f"file:{db_path}?mode=ro"
        with sqlite3.connect(uri, uri=True, timeout=5) as conn:
            rows = conn.execute(
                "SELECT branch_name, parent_branch_name, state FROM branch_metadata"
            ).fetchall()
    except sqlite3.Error as err:
        print(f"warning: could not read Graphite metadata: {err}", file=sys.stderr)
        return None
    return {
        name: {"parent": parent, "state": state}
        for name, parent, state in rows
        if name
    }


# ---------------------------------------------------------------- branch facts


def local_branches(root):
    fmt = "%(refname:short)%09%(objectname)%09%(upstream:short)%09%(upstream:track)"
    code, out, _ = git(["for-each-ref", "--format", fmt, "refs/heads"], root)
    if code != 0:
        return []

    branches = []
    for line in out.splitlines():
        parts = line.split("\t")
        while len(parts) < 4:
            parts.append("")
        name, tip, upstream, track = parts[:4]
        ahead = behind = 0
        match = re.search(r"ahead (\d+)", track)
        if match:
            ahead = int(match.group(1))
        match = re.search(r"behind (\d+)", track)
        if match:
            behind = int(match.group(1))
        branches.append(
            {
                "name": name,
                "tip": tip,
                "upstream": upstream or None,
                "upstream_gone": "gone" in track,
                "ahead": ahead,
                "behind": behind,
            }
        )
    return branches


def is_ancestor(root, branch, ref):
    code, _, _ = git(["merge-base", "--is-ancestor", branch, ref], root)
    return code == 0


def pr_merge_reached_trunk(root, tip, pr, ref):
    """Exact reviewed head plus a merge result reachable from the selected trunk."""
    merge = (pr or {}).get("mergeCommit") or {}
    oid = merge.get("oid")
    return bool(pr and pr.get("state") == "MERGED"
                and pr.get("headRefOid") == tip and oid
                and is_ancestor(root, oid, ref))


def stale_remote_branches(root, trunk, prs):
    """Remote branches whose PR is merged -- reported, never deleted."""
    code, out, _ = git(
        ["for-each-ref", "--format", "%(refname:short)", "refs/remotes/origin"], root
    )
    if code != 0:
        return []

    stale = []
    for ref in out.splitlines():
        name = ref[len("origin/") :] if ref.startswith("origin/") else ref
        if name in ("HEAD", trunk) or name in PROTECTED_NAMES:
            continue
        record = prs.get(name)
        code, tip, _ = git(["rev-parse", ref], root)
        if code == 0 and pr_merge_reached_trunk(root, tip, record, trunk_ref(root, trunk)):
            stale.append(
                {
                    "ref": ref,
                    "branch": name,
                    "pr_number": record.get("number"),
                    "pr_url": record.get("url"),
                    "merged_at": record.get("mergedAt"),
                }
            )
    return stale


# ---------------------------------------------------------------- classify


def protected(name, trunk):
    if name == trunk or name in PROTECTED_NAMES:
        return True
    return any(pattern.match(name) for pattern in PROTECTED_PATTERNS)


def classify_branch(branch, context):
    """Assign safe / ask / keep with the reasons that drove it.

    'safe' is reserved for branches where the content is provably in trunk and
    nothing else depends on the branch. Everything merely probable lands in
    'ask' -- the cost of a wrong 'safe' is lost work, the cost of a wrong 'ask'
    is one question.
    """
    name = branch["name"]
    reasons = []

    if protected(name, context["trunk"]):
        return "keep", ["protected branch"]
    if branch["is_current"]:
        return "keep", ["currently checked out here"]

    pr = branch.get("pr")
    pr_state = pr.get("state") if pr else None
    exact_merge = branch.get("pr_merge_reached_trunk", False)

    if pr_state == "OPEN":
        return "keep", [f"PR #{pr['number']} is still open"]

    # Two independent proofs that the content is already in trunk.
    if branch["ancestry_merged"]:
        reasons.append(f"tip is an ancestor of {context['trunk_ref']}")
    if exact_merge:
        reasons.append(f"PR #{pr['number']} merge result reached trunk and its head matches the local tip")

    proven = bool(reasons)

    if branch.get("graphite_tracked") is None:
        return "ask", reasons + ["Graphite metadata unavailable; ownership is unknown"]

    # Blockers apply even to proven-merged branches.
    holder = branch.get("worktree")
    if holder and (not holder.get("prunable") or holder.get("locked") or os.path.lexists(holder["path"])):
        return "ask", reasons + [f"checked out in worktree {holder['path']}"]
    if branch.get("graphite_cycle"):
        return "ask", reasons + ["Graphite relationships contain a cycle"]
    if branch.get("unmerged_children"):
        children = ", ".join(branch["unmerged_children"])
        return "ask", reasons + [f"unmerged Graphite children depend on it: {children}"]

    if proven:
        if holder and holder.get("prunable"):
            reasons.append("held only by a stale worktree entry (prune first)")
        return "safe", reasons

    # Not proven -- work out what kind of doubt we have.
    if pr_state == "MERGED":
        return "ask", [
            f"PR #{pr['number']} merged, but its exact local head and merge result "
            f"in {context['trunk_ref']} are not both verified"
        ]
    if pr_state == "CLOSED":
        return "ask", [f"PR #{pr['number']} was closed without merging"]

    if context["gh_status"] != "ok" and not context["gh_status"].startswith("ok"):
        reasons.append(f"no PR data available ({context['gh_status']})")

    if branch.get("github_knows_tip") is False:
        return "keep", reasons + [
            "GitHub could not find this tip; merge state remains unverified"
        ]
    if branch["upstream_gone"]:
        return "ask", reasons + [
            "upstream branch was deleted on the remote (often means merged, but unproven)"
        ]
    if not branch["upstream"]:
        return "keep", reasons + ["no upstream configured; merge state unverified"]

    return "keep", reasons + ["merge not proved"]


def classify_worktree(worktree, context):
    path = worktree["path"]

    if path in (context["root"], context.get("main_worktree")):
        return "keep", ["main worktree"]
    if worktree["locked"]:
        return "keep", ["worktree is locked"]
    if worktree["prunable"]:
        if os.path.lexists(path):
            return "ask", ["prunable entry still has a directory; inspect it before pruning"]
        return "safe", [
            f"directory is gone ({worktree['prunable_reason']}) -- only stale bookkeeping remains"
        ]
    reasons = []
    if worktree["dirty"]:
        return "keep", ["has uncommitted changes"]
    if worktree["dirty"] is None:
        return "ask", ["could not read worktree status"]

    idle = worktree.get("idle_seconds")
    if idle is None:
        return "ask", ["could not establish worktree activity"]
    if idle < RECENT_ACTIVITY_SECONDS:
        hours = idle / 3600
        return "keep", [
            f"active {hours:.1f}h ago -- an agent session ({worktree['agent']}) may be live in it"
        ]

    if worktree["detached"]:
        return "ask", ["detached HEAD, so there is no branch whose merge state we can check"]

    branch_verdict = context["worktree_branch_verdicts"].get(worktree["branch"])
    if branch_verdict == "safe":
        reasons.append(f"branch {worktree['branch']} is merged")
        if idle is not None:
            reasons.append(f"idle for {idle / 86400:.1f} days")
        return "safe", reasons
    if branch_verdict == "keep":
        return "keep", [f"branch {worktree['branch']} is not merged"]
    return "ask", [f"branch {worktree['branch']} needs discussion"]


def build_stacks(metadata, trunk, verdicts, known):
    """Group Graphite branches into stacks rooted at trunk.

    Graphite keeps metadata for branches long after they are deleted, so
    everything is filtered against the branches that actually exist -- otherwise
    stacks are reported full of ghosts with no verdict.
    """
    children = {}
    for name, info in metadata.items():
        parent = info.get("parent")
        if parent and name in known:
            children.setdefault(parent, []).append(name)

    stacks = []
    for base in sorted(children.get(trunk, [])):
        members = []
        queue = [base]
        while queue:
            current = queue.pop(0)
            if current in members:
                continue
            members.append(current)
            queue.extend(sorted(children.get(current, [])))
        if len(members) < 2:
            continue  # a lone branch is not a stack worth reporting separately
        member_verdicts = [verdicts.get(m) for m in members]
        stacks.append(
            {
                "base": base,
                "branches": members,
                "all_merged": all(v == "safe" for v in member_verdicts),
                "verdicts": dict(zip(members, member_verdicts)),
            }
        )
    return stacks


# ---------------------------------------------------------------- main


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=".", help="repository path (default: cwd)")
    parser.add_argument(
        "--no-fetch", action="store_true", help="skip `git fetch --all --prune`"
    )
    parser.add_argument(
        "--json-only", action="store_true", help="suppress the human-readable summary"
    )
    args = parser.parse_args()

    root = repo_root(os.path.abspath(args.repo))
    git_dir = common_git_dir(root)

    fetch_status = "skipped"
    if not args.no_fetch:
        code, _, err = git(["fetch", "--all", "--prune"], root, timeout=300)
        fetch_status = "ok" if code == 0 else f"failed: {err.splitlines()[0] if err else ''}"

    trunk, trunk_source = detect_trunk(root, git_dir)
    ref = trunk_ref(root, trunk)
    prs, gh_status = gh_pull_requests(root)
    metadata = graphite_metadata(git_dir)
    is_graphite = os.path.exists(os.path.join(git_dir, ".graphite_repo_config")) or os.path.exists(os.path.join(git_dir, ".graphite_metadata.db"))
    metadata_known = metadata is not None
    metadata = metadata or {}

    code, current_branch, _ = git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    if code != 0:
        current_branch = ""

    worktrees = list_worktrees(root)
    for worktree in worktrees:
        worktree["agent"] = classify_agent(worktree["path"])
        worktree["idle_seconds"] = worktree_activity(worktree["path"], root)
        worktree["dirty"] = worktree_dirty(worktree["path"])
    by_branch = {w["branch"]: w for w in worktrees if w["branch"]}

    branches = local_branches(root)
    for branch in branches:
        name = branch["name"]
        branch["is_current"] = name == current_branch
        branch["worktree"] = by_branch.get(name)
        branch["ancestry_merged"] = is_ancestor(root, name, ref)
        branch["patch_merged"] = None  # Retained for report consumers; no mutating hint.
        branch["pr"] = prs.get(name)
        branch["graphite_parent"] = metadata.get(name, {}).get("parent")
        # Graphite only tracks branches it has a parent for. Branches made with
        # plain `git checkout -b` sit in a Graphite repo untracked, and `gt
        # delete` refuses them outright ("Cannot perform this operation on
        # untracked branch"), so the right delete command differs per branch.
        branch["graphite_tracked"] = (branch["graphite_parent"] is not None) if metadata_known else None
        branch["github_knows_tip"] = None

    # Fill the gaps the bulk PR listing left. Only branches that were actually
    # pushed and are not already provably merged are worth an API round trip.
    if gh_status.startswith("ok"):
        budget = COMMIT_PR_LOOKUP_CAP
        for branch in branches:
            if budget <= 0:
                break
            if branch["pr"] or branch["ancestry_merged"] or not branch["upstream"]:
                continue
            budget -= 1
            found = gh_pr_for_commit(root, branch["tip"])
            if found == "unknown-commit":
                branch["github_knows_tip"] = False
            elif found:
                branch["github_knows_tip"] = True
                branch["pr"] = found

    for branch in branches:
        branch["pr_merge_reached_trunk"] = pr_merge_reached_trunk(
            root, branch["tip"], branch["pr"], ref
        )

    # Children must be resolved before verdicts, since a merged parent with live
    # children is not safe to delete outright.
    child_map = {}
    for name, info in metadata.items():
        parent = info.get("parent")
        if parent:
            child_map.setdefault(parent, []).append(name)

    known = {b["name"] for b in branches}
    provisional = {}
    for branch in branches:
        verdict, reasons = classify_branch(
            {**branch, "worktree": None},
            {
                "trunk": trunk,
                "trunk_ref": ref,
                "gh_status": gh_status,
                "branch_verdicts": {},
            },
        )
        provisional[branch["name"]] = verdict

    for branch in branches:
        pending = list(child_map.get(branch["name"], []))
        descendants = set()
        while pending:
            child = pending.pop()
            if child in descendants or child not in known:
                continue
            descendants.add(child)
            pending.extend(child_map.get(child, []))
        kids = sorted(descendants)
        branch["graphite_children"] = sorted(c for c in child_map.get(branch["name"], []) if c in known)
        branch["graphite_cycle"] = branch["name"] in descendants
        branch["unmerged_children"] = [
            c for c in kids if provisional.get(c) != "safe"
        ]

    context = {
        "trunk": trunk,
        "trunk_ref": ref,
        "gh_status": gh_status,
        "root": root,
        "main_worktree": worktrees[0]["path"] if worktrees else root,
        "branch_verdicts": {},
        "worktree_branch_verdicts": {},
    }
    for branch in branches:
        verdict, reasons = classify_branch(branch, context)
        branch["verdict"] = verdict
        branch["reasons"] = reasons
        branch["delete_command"] = (
            f"gt delete {shlex.quote(branch['name'])}"
            if is_graphite and branch["graphite_tracked"]
            else f"git branch -D -- {shlex.quote(branch['name'])}"
        )
        if verdict != "safe":
            branch["delete_command"] = None
        context["branch_verdicts"][branch["name"]] = verdict
        context["worktree_branch_verdicts"][branch["name"]] = classify_branch(
            {**branch, "worktree": None}, context
        )[0]

    for worktree in worktrees:
        verdict, reasons = classify_worktree(worktree, context)
        worktree["verdict"] = verdict
        worktree["reasons"] = reasons

    result = {
        "repo": root,
        "trunk": trunk,
        "trunk_source": trunk_source,
        "trunk_ref": ref,
        "current_branch": current_branch,
        "fetch": fetch_status,
        "gh_status": gh_status,
        "graphite": is_graphite,
        "graphite_metadata_known": metadata_known,
        "branches": branches,
        "worktrees": worktrees,
        "stacks": build_stacks(metadata, trunk, context["branch_verdicts"], known)
        if is_graphite
        else [],
        "stale_remote_branches": stale_remote_branches(root, trunk, prs),
    }

    if not args.json_only:
        summarise(result)
    print(json.dumps(result, indent=2, default=str))


def summarise(result):
    """Short human-readable digest to stderr, so JSON on stdout stays clean."""
    out = sys.stderr
    print(f"repo         {result['repo']}", file=out)
    print(f"trunk        {result['trunk']}  (via {result['trunk_source']})", file=out)
    print(f"compared to  {result['trunk_ref']}", file=out)
    print(f"fetch        {result['fetch']}", file=out)
    print(f"github       {result['gh_status']}", file=out)
    print(f"graphite     {'yes' if result['graphite'] else 'no'}", file=out)
    print("", file=out)
    for verdict in ("safe", "ask", "keep"):
        names = [b["name"] for b in result["branches"] if b["verdict"] == verdict]
        print(f"{verdict:5} branches ({len(names)}): {', '.join(names) or '-'}", file=out)
    for verdict in ("safe", "ask"):
        paths = [w["path"] for w in result["worktrees"] if w["verdict"] == verdict]
        if paths:
            print(f"{verdict:5} worktrees ({len(paths)}): {', '.join(paths)}", file=out)
    print("", file=out)


if __name__ == "__main__":
    main()
