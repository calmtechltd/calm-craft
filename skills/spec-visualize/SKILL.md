---
name: spec-visualize
description: Open the local CalmCraft visualizer for a spec estate or branch review. Use when the user asks to browse, visualize, search, or review the specs in a checkout, worktree, or private Git remote.
---

# Open the CalmCraft Visualizer

Use the packaged `calmcraft` command as the visual front door to the spec estate. It opens a loopback-only browser session and does not generate or commit an HTML dashboard.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). The CLI reads optional repository settings from `calmcraft.json`.

Use `spec-gap-sweep` instead when the user wants an actionable maintenance report rather than an interactive view.

## Workflow

### 1. Select the repository source

Use the current checkout when the user names no source. Otherwise use the exact local path, linked worktree, or SSH/HTTPS remote they supplied. Do not infer a different private repository or copy its specs elsewhere.

For a remote, use the branch the user supplied. CalmCraft delegates authentication to the installed `git`; never request a provider token for the command or place credentials in the URL.

### 2. Choose the view

Open the estate:

```sh
npx --yes @calmcraft/cli@0.1.0 view
npx --yes @calmcraft/cli@0.1.0 view /path/to/repository
```

Open Branch Review for a checkout or worktree:

```sh
npx --yes @calmcraft/cli@0.1.0 view /path/to/worktree --diff --base origin/main
```

Open a selected branch from a private remote:

```sh
npx --yes @calmcraft/cli@0.1.0 view git@github.com:organisation/repository.git \
  --branch feature/spec-review \
  --diff \
  --base main
```

If the pinned package is already installed globally, the equivalent `calmcraft view` command is fine. Use `--no-open` only when the user wants the URL or the environment cannot launch a browser. Never expose the session URL outside the local machine; it contains a short-lived secret.

### 3. Keep the session owned

Run the command in a terminal that can remain active while the user browses. The CLI owns its loopback server and any temporary remote clone. Stop it normally with `Ctrl-C` when the user is finished so handled cleanup runs.

Do not background an orphan process, upload repository data, start a public listener, or replace the local session with a hosted preview.

### 4. Hand back

Tell the user which repository or redacted remote identity is open, whether the session is Atlas or Branch Review, and which base was requested. Do not repeat a tokenized session URL in durable notes, commits, issues, or chat logs.

## Quality gate

- [ ] The exact requested checkout, worktree, or remote branch is open.
- [ ] Branch Review uses the requested base or reports that a base is still needed.
- [ ] The server remains bound to loopback and no repository content was uploaded.
- [ ] No repository file was generated or changed.
- [ ] The CLI process remains owned while the session is in use and stops cleanly afterward.

## Anti-patterns

- Generating a static dashboard in the selected repository.
- Copying private specs into a fixture, report, or hosted service.
- Opening a remote without an explicit branch when its default is ambiguous.
- Treating staged, unstaged, or untracked work as committed branch history.
- Sharing the tokenized local URL.

## Related skills

- `spec-gap-sweep` — report estate-wide maintenance debt
- `spec-maintain-on-ship` — update behaviour state when work ships
- `branch-self-review` — review the complete code branch before submission
