---
id: calmcraft-repository-sources
area: CalmCraft
status: partial
---

# Repository Sources

A developer can open a CalmCraft estate from the checkout or worktree they are using, another local repository, or an authorised private Git remote. CalmCraft reads the selected source without changing it and explains which snapshot and base drive the session.

## Behaviours

### B1 — Open the current checkout 🔵 future

Running `calmcraft view` inside a Git checkout opens the CalmCraft specs from that checkout. The session identifies the repository root, current branch or detached commit, and current filesystem.

### B2 — Open another local repository 🔵 future

A developer can pass a local path to `calmcraft view`. CalmCraft resolves the repository that owns that path and opens its spec estate without changing the developer's working directory.

### B3 — Keep worktrees isolated 🟢 implemented

Running CalmCraft inside a linked worktree reads spec files from that worktree. Shared Git metadata may inform branch and commit details, but files from another worktree never enter the session.

### B4 — Leave the repository unchanged 🟢 implemented

Opening, browsing, and comparing specs does not checkout a branch, stage a file, create a worktree, fetch a remote, change Git configuration, or write into the selected repository.

### B5 — Select a branch-review base 🟢 implemented

Branch review uses an explicit base when the developer supplies one. Otherwise CalmCraft uses the repository configuration, the symbolic origin default, or a conventional local or remote default branch in the documented order.

### B6 — Continue when no base exists 🟢 implemented

If CalmCraft cannot find a comparison base, it explains how to provide one and still opens the estate views. The session does not invent a base or present an empty comparison as proof that nothing changed.

### B7 — Include local work with honest provenance 🟢 implemented

The current-filesystem snapshot can include branch commits, staged edits, unstaged edits, deleted specs, and untracked specs. CalmCraft keeps those groups distinct so a reviewer can tell committed branch work from local work in progress.

### B8 — Open an authorised private remote 🔵 future

A developer can supply a supported SSH or HTTPS Git URL and an optional branch. CalmCraft clones the requested source into a session-specific temporary directory, then opens it through the same estate and branch-review experience as a local repository.

### B9 — Use installed Git authentication 🔵 future

Remote sessions use the authentication already configured for the developer's Git executable. CalmCraft does not ask for, receive, or store a GitHub token.

### B10 — Remove temporary repository data 🔵 future

CalmCraft removes a remote session's temporary clone after a normal stop, cancellation, or handled process signal. The session explains that the operating system may clean up remnants after an uncatchable process termination.

### B11 — Explain source failures 🔵 future

An invalid local path, non-Git directory, unsupported URL, authentication failure, missing branch, or insufficient history produces a clear error. Logged URLs redact credentials and sensitive query values.

### B12 — Control browser opening and shutdown 🔵 future

CalmCraft opens the local application unless the developer disables browser opening. It always prints the session URL, keeps the server active until shutdown, and releases its port when the session ends.

## Rules (Invariants)

- One session reads one resolved repository root.
- A local filesystem snapshot belongs to the selected worktree, even when Git metadata lives in a shared common directory.
- CalmCraft does not run repository hooks, submodule commands, package scripts, or code from the selected repository.
- Remote access starts only after the developer supplies a remote URL.
- Base inference uses local references and performs no network fetch in v1.
- Uncommitted content is never attributed to a commit.
- A failed base comparison cannot prevent estate browsing when specs remain readable.

## Decision Tables

### Source selection

| Input                                      | Resolution                              | Session result           |
| ------------------------------------------ | --------------------------------------- | ------------------------ |
| No source argument inside a Git repository | Current repository and worktree         | Open local estate        |
| Local path inside a Git repository         | Owning repository and selected worktree | Open local estate        |
| Local path outside a Git repository        | No repository                           | Exit with a source error |
| Supported SSH or HTTPS Git URL             | Temporary clone using installed Git     | Open remote estate       |
| Unsupported or ambiguous URL               | No clone                                | Exit with a source error |

### Base selection

| Available input                                                                        | Selected base                          |
| -------------------------------------------------------------------------------------- | -------------------------------------- |
| Valid `--base` value                                                                   | Explicit value                         |
| No explicit value, valid `defaultBase` in `calmcraft.json`                             | Configured value                       |
| No configured value, symbolic `origin/HEAD` target exists                              | Symbolic target                        |
| No symbolic target, first existing `origin/main`, `origin/master`, `main`, or `master` | First existing candidate in that order |
| No candidate exists                                                                    | Estate-only session with base guidance |

## User Flows

- **F1 — Repository Session:** [contract](./repository-sources.flow.yaml) · [diagram](./repository-sources.flow.mmd) — covers B1–B12

## Open Questions

- **Settled:** Local sessions do not fetch by default. The reviewer sees the state of references already present in the clone.
- **Settled:** Remote sessions do not keep a repository cache in v1.

## Future Considerations

- An explicit fetch option for developers who want remote references updated before comparison.
- A persistent repository cache with visible retention and deletion controls.
- Hosted repository connections for teams that choose server-side storage.

## Out of Scope

- OAuth or direct GitHub, GitLab, or Bitbucket API connections.
- Repository writes, commits, branches, worktrees, pushes, or pull request comments.
- Running repository setup, build, package, hook, or submodule commands.
