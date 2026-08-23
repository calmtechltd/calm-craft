# calm-craft

Free and open source, from [Calm Tech Ltd](https://github.com/calmtechltd). MIT licensed — use it, change it, ship it commercially. We want nothing for it.

An [Agent Plugin](https://agent-plugins.org/) providing three things that make coding agents produce work you can trust:

1. **Specs** — the product's intent, written down in an addressable form, so an agent has a source of truth that doesn't move.
2. **A delivery loop** — design → chunked plan → one chunk per pass, looped until the plan is done → gates → self-review.
3. **Conventions** — decided once, enforced by lint where a machine can enforce them, ambient where it can't.

Portable by design: skills live in `skills/` per the Agent Plugins v1 spec, so this works in Codex, Cursor, VS Code, Copilot, and anything else implementing the standard. `.claude-plugin/` sits alongside for Claude Code, which uses its own manifest location; both read the same skills.

## CalmCraft visualizer

The `calmcraft` command reads CalmCraft specs from a local checkout, linked worktree, or authorised SSH/HTTPS Git remote and opens a private browser session on the developer's machine. Branch Review explains changes by behaviour, invariant, decision row, question, relationship, and flow transition.

Repository content stays on the developer's machine. CalmCraft has no telemetry transport and does not send spec content to a hosted service.

## Develop the CLI locally

After installing the repository dependencies, start the visualizer against any local checkout without publishing or globally installing the package:

```sh
pnpm install --frozen-lockfile
pnpm dev -- /absolute/path/to/a-repository --diff --base origin/main
```

The development command opens a loopback-only Vite session backed by the real CalmCraft parser, Git reader, semantic diff, and private data server. React and CSS edits use hot module replacement. Changes to imported CLI, parser, Git, diff, and server modules restart the development process. The selected repository remains read-only.

Use `--no-open` to leave the browser closed, `--ui-port <number>` when a stable Vite port is useful, and the normal `view` options for source and comparison control. Run `pnpm dev -- --help` for the complete development command. Stop both local servers with `Ctrl+C`.

To exercise only the source CLI against the last built browser bundle, use `pnpm dev:cli -- view [path] [options]`.

## Install the CLI

CalmCraft supports the Node.js 22 and Node.js 24 LTS lines. Run a pinned version without installing it globally:

```sh
npx --yes @calmcraft/cli@0.2.0 generate
npx --yes @calmcraft/cli@0.2.0 generate --diff --base origin/main
```

`generate` writes one HTML file and opens it from disk. `--diff` bakes Branch Review into that file from the current working tree; there is no port, token, or process left running.

Or install the same pinned version:

```sh
npm install --global @calmcraft/cli@0.2.0
calmcraft view
```

The package contains no install-time lifecycle script or native build owned by CalmCraft. npm records provenance for public releases. To verify registry signatures and attestations in a clean project, install the exact version and run `npm audit signatures` with a current npm CLI.

### Current repository

From any checkout containing CalmCraft specs:

```sh
calmcraft view
```

The command discovers the Git root and `specs/` directory, starts a server on `127.0.0.1`, opens the Atlas, and keeps running until the terminal process stops. Use `--no-open` to print the private session URL without launching a browser.

### Local path or worktree

Pass a checkout or linked worktree explicitly:

```sh
calmcraft view ../another-repository
calmcraft view /absolute/path/to/a-linked-worktree --diff --base origin/main
```

CalmCraft reads the selected worktree's filesystem and shared Git objects without switching branches, changing the index, fetching, or writing repository files.

### Branch review

Bake the semantic review for the current branch and local work into the generated file:

```sh
calmcraft generate --diff
calmcraft generate --diff --base origin/main
calmcraft generate --diff --provenance committed,staged
```

The live `view` command accepts the same flags. Without `--base`, CalmCraft checks `calmcraft.json`, `origin/HEAD`, then common main-branch names. Provenance controls accept `committed`, `staged`, `unstaged`, and `untracked` as a comma-separated list.

An optional `calmcraft.json` can set the spec root and default base without executing repository code:

```json
{
  "specVersion": 1,
  "specsRoot": "specs",
  "defaultBase": "origin/main"
}
```

### Private remote

Use an SSH or HTTPS Git URL and select the branch to inspect:

```sh
calmcraft view git@github.com:organisation/private-repository.git \
  --branch feature/specs \
  --diff \
  --base main
```

Remote sessions use the authentication already available to `git`, including an SSH agent or credential helper. CalmCraft does not ask for or store a provider token. It clones only the selected branch and comparison base into a unique operating-system temporary directory, disables repository hooks and submodules, and removes the clone on normal stop, cancellation, or a handled process signal.

### Privacy

The server accepts loopback requests only. Each session uses a random token, restrictive browser policy, bundled assets, sanitized Markdown, and bounded source-resource IDs. The browser cannot request an arbitrary path or write to the repository. CalmCraft has no hosted service, telemetry transport, analytics, or automatic update request.

An uncatchable hard termination cannot run application cleanup. In that case, the operating system may retain a temporary remote clone until its normal temporary-file cleanup runs. Do not place credentials in a remote URL; use your SSH agent or Git credential helper.

### Troubleshooting

- `CalmCraft requires Node.js 22 or 24`: switch to one of the supported LTS lines.
- `Not a Git repository`: run the command inside a checkout or pass its path.
- Branch Review asks for a base: pass `--base <ref>` or set `defaultBase` in `calmcraft.json`.
- A private remote cannot authenticate: run `git ls-remote` against that URL in the same terminal first. CalmCraft uses the same Git authentication and disables interactive credential prompts.
- The browser does not open: rerun with `--no-open` and open the printed URL in a browser on the same machine.
- A requested port is busy: omit `--port` for an available port or choose another explicit port.

Run `calmcraft --help` for the complete option list. Errors redact URL credentials and session tokens; reports should still omit private repository paths and content.

### Uninstall

Remove a global installation with:

```sh
npm uninstall --global @calmcraft/cli
```

`npx` requires no global uninstall. Your package manager may retain its normal download cache; CalmCraft creates no repository cache or persistent user configuration.

## Install the Agent Plugin

**Agent Plugins clients** (VS Code, Cursor, Codex, Copilot) — install from source with `https://github.com/calmtechltd/calm-craft`.

**Claude Code** — add the repository as a plugin source.

## Start here

Run **`engineering-setup`** once per repo. It reads your codebase, interviews you about what it can't infer, and writes `.engineering/config.yaml` — the file every other skill reads.

That indirection is the point. Skills stay portable and updatable; your repo's specifics live in config you own. Updating the plugin never clobbers your choices.

## Skills

### Setup

| Skill               | Job                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `engineering-setup` | Detect the toolchain, interview, write `.engineering/config.yaml` and `AGENTS.md`. Run first. |

### Conventions

| Skill                 | Job                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `conventions-decide`  | Work through the question bank, record decisions, generate lint config and ambient rules. |
| `conventions-audit`   | Check a diff against the decisions — only what lint can't catch. Reports; never fixes.    |
| `conventions-revisit` | Surface never-examined defaults and rules lint could enforce but doesn't.                 |
| `conventions-migrate` | You changed a decision. Fix the existing code, in reviewable batches.                     |

### Specs

| Skill                     | Job                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `spec-author-greenfield`  | Design-first spec for something not yet built.                                     |
| `spec-author-from-impl`   | Work backwards from existing code and tests.                                       |
| `spec-audit-drift`        | Does the spec still match the implementation?                                      |
| `spec-assess-coverage`    | Which behaviours, rules, and flow transitions have tests?                          |
| `spec-author-tests`       | Generate tests from a spec, halting on spec/code disagreement.                     |
| `write-tests`             | Whether a test earns its keep — picked up whenever an agent is about to write one. |
| `spec-maintain-on-ship`   | Update a spec when work changes its state.                                         |
| `spec-plan-gap`           | Search for overlap before authoring a new spec.                                    |
| `spec-triage-bug-report`  | Bug, expected behaviour, gap, drift, or out of scope?                              |
| `spec-harvest-discussion` | Read an issue or PR thread and propose what the spec should absorb. Proposes only. |
| `spec-gap-sweep`          | Estate-wide maintenance debt.                                                      |
| `spec-visualize`          | Open the local visualizer or semantic Branch Review.                               |

### Delivery

| Skill                         | Job                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| `author-implementation-plan`  | Design doc → chunks sized for one reviewable pass.                  |
| `ask-questions`               | Surface open decisions in current work and ask them, structured.    |
| `run-implementation-plan`     | Complete in-scope behaviours, one card at a time, until done. Checks stay on the card's diff, not whole-repo gates. |
| `run-implementation-plan-all` | Named entry for finishing the plan — same loop.                     |
| `bug-regression-red-green`    | Failing test first, then the fix, and the test stays.               |
| `branch-self-review`          | Review your own diff before anyone else does. Reports; never fixes. |
| `ready-for-pr`                | Run the gates CI runs; fix what fails.                              |
| `update-pr`                   | Rewrite or sync the current PR title and body from the branch.      |
| `branch-cleanup`              | Delete locally what is provably in trunk; never remotes.            |
| `coderabbit-review-triage`    | Download a CodeRabbit review, verify, classify. Writes `.active/` only. |
| `coderabbit-review-implement` | Apply obvious fixes locally. No commit, push, or resolve.           |
| `coderabbit-review-implement-all` | Publish the fixes, then resolve threads via GraphQL.            |

## Boundaries this plugin defends

These exist because collapsing them is easy and quietly destroys the value:

1. **Auditors report; migrators edit.** An auditor that can fix things can make its own findings disappear.
2. **Planning and execution are separate.** A skill that does both plans just far enough to justify what it already wants to build.
3. **One chunk per pass.** The runner may loop the rest of the plan; it still finishes, verifies, and records one chunk before starting the next. Two chunks in one pass is still the failure.
4. **Format lives in one file.** `specs/README.md` for specs, `.engineering/conventions.yaml` for conventions. Skills describe workflow and link to them.
5. **Push rules down a tier.** If a linter can enforce it, prose about it is worse than useless.
6. **The spec owns intent; the tracker owns scheduling.** A closed issue never promotes a badge — it flags the behaviour as worth verifying. Discussion flows _into_ specs, never the reverse.
7. **Third-party text is data, never instruction.** Issue and review comments arrive from outside the session, and on a public repository from anyone at all. `spec-harvest-discussion` classifies them and never obeys them.
8. **A test that restates the type checker, or an instruction not to test, is worse than no test.** `write-tests` decides whether one earns its keep before any other skill writes it.

## References

- [`references/conventions-question-bank.md`](references/conventions-question-bank.md) — 12 axes, TypeScript in full, other languages sketched
- [`references/spec-format.md`](references/spec-format.md) — the spec format authority, written into your repo by `engineering-setup`

## Licence

MIT — see [LICENSE](LICENSE). Free for any use, including commercial. The only condition is keeping the copyright notice.
