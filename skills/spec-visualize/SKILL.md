---
name: spec-visualize
description: Open the local CalmCraft visualizer for a spec estate or branch review. Use when the user asks to browse, visualize, search, or review the specs in a checkout or worktree.
---

# Open the CalmCraft Visualizer

Use the packaged `calmcraft` command as the visual front door to the spec estate. It writes a single self-contained HTML file outside the repository and opens it. Nothing is served, nothing keeps running, and nothing is added to the user's working tree.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). The CLI reads optional repository settings from `calmcraft.json`.

Use `spec-gap-sweep` instead when the user wants an actionable maintenance report rather than an interactive view.

## Workflow

### 1. Select the repository source

Use the current checkout when the user names no source. Otherwise use the exact local path or linked worktree they supplied. Do not infer a different private repository or copy its specs elsewhere.

### 2. Generate and open

```sh
npx --yes @calmcraft/cli@0.2.0 generate
npx --yes @calmcraft/cli@0.2.0 generate /path/to/repository
npx --yes @calmcraft/cli@0.2.0 generate --diff --base origin/main
```

The file lands in a temporary directory and opens in the default browser. Pass `--out <file>` only when the user wants to keep or share it, and put it where they ask — never inside their repository unless they say so, because it is several megabytes and easy to commit by accident.

`--diff` computes Branch Review now and writes it into the file. `--base <ref>` selects the comparison base; without it CalmCraft uses `calmcraft.json`, `origin/HEAD`, then common main-branch names. `--provenance` chooses which layers are visible when the file first opens.

Use `--no-open` when the environment cannot launch a browser; report the path instead.

### 3. Regenerate rather than refresh

The file is a snapshot. When the user edits a spec and wants to see the change, run the command again. There is no session to restart and nothing to stop.

Do not background an orphan process, upload repository data, start a public listener, or replace the local session with a hosted preview.

### 4. Hand back

Tell the user which repository is open, whether the file is Atlas or Branch Review, and which base was requested. Report the file path. Do not invent a session URL.

## Quality gate

- [ ] The exact requested checkout or worktree is open.
- [ ] Branch Review uses the requested base or reports that a base is still needed.
- [ ] No repository content was uploaded and no server was started.
- [ ] No repository file was generated or changed unless the user asked for `--out` there.
- [ ] The CLI exited after writing the file.

## Anti-patterns

- Generating a static dashboard in the selected repository.
- Copying private specs into a fixture, report, or hosted service.
- Treating staged, unstaged, or untracked work as committed branch history.
- Starting a server or sharing a tokenized local URL.

## Related skills

- `spec-gap-sweep` — report estate-wide maintenance debt
- `spec-maintain-on-ship` — update behaviour state when work ships
- `branch-self-review` — review the complete code branch before submission
