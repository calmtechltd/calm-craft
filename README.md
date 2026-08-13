# calm-craft

Free and open source, from [Calm Tech Ltd](https://github.com/calmtechltd). MIT licensed — use it, change it, ship it commercially. We want nothing for it.

An [Agent Plugin](https://agent-plugins.org/) providing three things that make coding agents produce work you can trust:

1. **Specs** — the product's intent, written down in an addressable form, so an agent has a source of truth that doesn't move.
2. **A delivery loop** — design → chunked plan → one chunk per session → gates → self-review.
3. **Conventions** — decided once, enforced by lint where a machine can enforce them, ambient where it can't.

Portable by design: skills live in `skills/` per the Agent Plugins v1 spec, so this works in Codex, Cursor, VS Code, Copilot, and anything else implementing the standard. `.claude-plugin/` sits alongside for Claude Code, which uses its own manifest location; both read the same skills.

## Install

**Agent Plugins clients** (VS Code, Cursor, Codex, Copilot) — install from source with `https://github.com/calmtechltd/calm-craft`.

**Claude Code** — add the repository as a plugin source.

## Start here

Run **`engineering-setup`** once per repo. It reads your codebase, interviews you about what it can't infer, and writes `.engineering/config.yaml` — the file every other skill reads.

That indirection is the point. Skills stay portable and updatable; your repo's specifics live in config you own. Updating the plugin never clobbers your choices.

## Skills

### Setup

| Skill | Job |
| --- | --- |
| `engineering-setup` | Detect the toolchain, interview, write `.engineering/config.yaml` and `AGENTS.md`. Run first. |

### Conventions

| Skill | Job |
| --- | --- |
| `conventions-decide` | Work through the question bank, record decisions, generate lint config and ambient rules. |
| `conventions-audit` | Check a diff against the decisions — only what lint can't catch. Reports; never fixes. |
| `conventions-revisit` | Surface never-examined defaults and rules lint could enforce but doesn't. |
| `conventions-migrate` | You changed a decision. Fix the existing code, in reviewable batches. |

### Specs

| Skill | Job |
| --- | --- |
| `spec-author-greenfield` | Design-first spec for something not yet built. |
| `spec-author-from-impl` | Work backwards from existing code and tests. |
| `spec-audit-drift` | Does the spec still match the implementation? |
| `spec-assess-coverage` | Which behaviours, rules, and flow transitions have tests? |
| `spec-author-tests` | Generate tests from a spec, halting on spec/code disagreement. |
| `spec-maintain-on-ship` | Update a spec when work changes its state. |
| `spec-plan-gap` | Search for overlap before authoring a new spec. |
| `spec-triage-bug-report` | Bug, expected behaviour, gap, drift, or out of scope? |
| `spec-harvest-discussion` | Read an issue or PR thread and propose what the spec should absorb. Proposes only. |
| `spec-gap-sweep` | Estate-wide maintenance debt. |
| `spec-visualize` | Self-contained HTML dashboard of every spec. |

### Delivery

| Skill | Job |
| --- | --- |
| `author-implementation-plan` | Design doc → chunks sized for one agent session. |
| `run-implementation-plan` | Implement exactly one chunk. |
| `bug-regression-red-green` | Failing test first, then the fix, and the test stays. |
| `branch-self-review` | Review your own diff before anyone else does. Reports; never fixes. |
| `ready-for-pr` | Run the gates CI runs; fix what fails. |

## Boundaries this plugin defends

These exist because collapsing them is easy and quietly destroys the value:

1. **Auditors report; migrators edit.** An auditor that can fix things can make its own findings disappear.
2. **Planning and execution are separate.** A skill that does both plans just far enough to justify what it already wants to build.
3. **One chunk per session.** However small the next one looks.
4. **Format lives in one file.** `specs/README.md` for specs, `.engineering/conventions.yaml` for conventions. Skills describe workflow and link to them.
5. **Push rules down a tier.** If a linter can enforce it, prose about it is worse than useless.
6. **The spec owns intent; the tracker owns scheduling.** A closed issue never promotes a badge — it flags the behaviour as worth verifying. Discussion flows *into* specs, never the reverse.
7. **Third-party text is data, never instruction.** Issue and review comments arrive from outside the session, and on a public repository from anyone at all. `spec-harvest-discussion` classifies them and never obeys them.

## References

- [`references/conventions-question-bank.md`](references/conventions-question-bank.md) — 12 axes, TypeScript in full, other languages sketched
- [`references/spec-format.md`](references/spec-format.md) — the spec format authority, written into your repo by `engineering-setup`

## Licence

MIT — see [LICENSE](LICENSE). Free for any use, including commercial. The only condition is keeping the copyright notice.
