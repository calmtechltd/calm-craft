---
name: conventions-decide
description: Interview the user through the code-convention question bank, record the decisions in .engineering/conventions.yaml, and generate lint config plus ambient agent rules from them. Use when the user says "decide our conventions", "set up coding standards", "we keep arguing about style", "write our conventions down", or after engineering-setup on a repo with no recorded conventions.
---

# Decide Conventions

Most codebases never decided their conventions — they have drift, plus whatever the loudest reviewer enforces. Fix that: run the decisions, record them, and enforce them where a machine can.

**The governing idea:** the conventions don't need to be *right*. The repo needs to state what they are, so someone arriving with different habits produces a visible diff instead of quiet drift. Any coherent answer beats no answer. "I don't care, take the default" is a valid response — record it as `defaulted`, not as a decision.

Question bank: [`references/conventions-question-bank.md`](../../references/conventions-question-bank.md). Config: `.engineering/config.yaml` (run `engineering-setup` first).

## When to use

- "Let's decide our conventions" / "set up coding standards".
- "Two people keep reformatting each other's code."
- A new repo, or a new language added to an existing one.

**Not this skill:** checking code against decisions already made (`conventions-audit`), changing a decision and fixing the code (`conventions-migrate`).

## Workflow

### 1. Detect what's already true

Before asking anything:

- What the toolchain **already enforces** — those questions get skipped, not asked.
- Where the codebase is **consistent** — that behaviour becomes the recommended default.
- Where it's **inconsistent** — count it ("62 named exports, 19 default, mostly in routes"). These matter most; drift already happened.
- Any existing convention doc that **contradicts** the actual code.
- **`package_manager` in `.engineering/config.yaml`**, and the install-time security the manager already has on (cooldown, script allowlist, exotic-source block, trust policy). Axis 10.1 is settled if a manager is recorded. 10.7–10.10 are settled if the manager's default or the repo's config already implements the recommended answer.

Report this before the first question.

### 2. Interview

Work through the question bank, instantiated for the languages in `config.yaml`.

- **Batch by axis.** Use a structured question tool with selectable options if you have one; otherwise present each axis as a numbered list answerable in one message.
- **Skip what the toolchain settles.** If the formatter owns quote style, say so and move on. Never ask about tabs, quotes, semicolons, trailing commas, or line width.
- Every question carries a **recommended default**, and every axis offers "accept the recommended defaults". A skipped axis is recorded as `defaulted`.
- **Say what each answer costs** before I answer it. "Banning this means changing 40 files" is information I need up front, not after.
- Target **twenty questions**. Drop axes that don't apply. Do not pad.
- If an answer contradicts an earlier one, say so and ask which wins.
- **Do not ask which package manager to switch to.** 10.1 pins the one `engineering-setup` recorded. Instantiating 10.7–10.10 means writing *that* manager's config, from *that* manager's current docs — not a favourite's, and not a table copied from an older interview. If the manager cannot enforce a question (trust downgrade is the usual case), mark it N/A and skip it.
- **Secrets (S.1–S.5)** belong in the same interview when the repo has env files, a client bundle, or neither and you still need the ignore rule. Skip S.5 if there is no client bundle. Skip S.3's local-scanner option if they already have platform push protection and no appetite for a hook.

### 3. Sort into tiers, and push everything down

| Tier | Mechanism |
| --- | --- |
| **Enforced** | Lint rule, formatter setting, compiler flag, CI gate |
| **Ambient** | Rule file, glob-scoped to the files it governs |
| **Documented** | Prose — only when neither of the above can express it |

A prose rule is advisory; a lint rule that fails the build is not. Before writing anything as prose, state why it can't be enforced. "No rule exists" is valid; "it'd be fiddly" is not.

Show the tier assignment as a table and let me object before generating.

### 4. Generate

**`.engineering/conventions.yaml`** — the source of truth:

```yaml
version: 1
decisions:
  - id: module-default-exports
    axis: module-boundaries
    answer: banned
    status: decided        # decided | defaulted
    tier: enforced
    enforcement: <the rule that implements it>
    note: <optional context worth keeping>
```

`status` is what lets `conventions-revisit` surface untouched defaults later without relitigating real decisions. Never omit it.

**Enforcement config** — real rules in the repo's existing linter. Don't introduce a new linter unless there is none, and ask first.

**Package-manager config** — for Axis 10.7–10.10, write the recorded manager's native settings (and the matching update-bot cooldown, if a bot is already configured). Look up the current key names before writing; they have moved. The shape, as of 2026, so you know what to search for:

| Policy | npm | pnpm | Yarn Berry | Bun |
| --- | --- | --- | --- | --- |
| Cooldown | `min-release-age` in `.npmrc` (days; 11.10+) | `minimumReleaseAge` in `pnpm-workspace.yaml` (minutes; v11 default `1440`) | `npmMinimalAgeGate` in `.yarnrc.yml` | `install.minimumReleaseAge` in `bunfig.toml` (seconds) |
| Excludes | `min-release-age-exclude` | `minimumReleaseAgeExclude` | `npmPreapprovedPackages` | `install.minimumReleaseAgeExcludes` |
| Script allowlist | `allowScripts` in `package.json` (11.16+; advisory until v12) | `allowBuilds` + `strictDepBuilds` | `dependenciesMeta.<pkg>.built` (`enableScripts: false` is the default) | `trustedDependencies` |
| Exotic subdeps | git/remote opt-in on npm 12 | `blockExoticSubdeps` | partial | — |
| Trust downgrade | install-time: no. `npm audit signatures` is manual | `trustPolicy: no-downgrade` | — | — |

Python's closest cooldown is uv `exclude-newer`. If the manager is not in this table, look it up or skip.

A one-day cooldown is the recommended default because it matches what several managers now ship and does not sit on security patches. Do not set a seven-day window, a global `ignore-scripts`, or a trust policy that fails the install, unless I chose that option. Show the exact file and keys before writing them.

**Secrets** — add ignore rules and an example env file only after I confirm. Never put a real value in the example file. Never delete a tracked `.env` without saying that history may still contain it.

**Verify each rule fires.** Write a deliberate violation, run the linter, confirm it's caught, remove it. Report any decision you couldn't enforce — that's a result, not a failure to hide.

Set severity to error where the codebase already complies. Where violations exist, ask: start at warning, scope an ignore to legacy paths, or run `conventions-migrate` now.

**Ambient rules** — glob-scoped where the tool supports it, generated from the same file, and marked as generated. Never restate an enforced rule in prose; point at the config instead.

**`.engineering/conventions.md`** — human-readable, generated, covering only what lint can't enforce, plus a short list of what is enforced and where.

### 5. Hand back

- Decisions by tier, and decided vs defaulted.
- Which rules you verified actually fire; which you couldn't implement, and why.
- Violations per rule, and which need `conventions-migrate` before their rule can be an error.
- Existing convention docs now redundant or contradicted — list them for me to delete. Don't delete them yourself.

## Quality gate

- [ ] No question asked that the toolchain already settles.
- [ ] Every decision carries `status`, `tier`, and — if enforced — the rule implementing it.
- [ ] Every generated lint rule was verified to fire on a deliberate violation.
- [ ] Axis 10.7–10.10 written in the recorded manager's config, or skipped as N/A — never as a prose rule pretending to be enforcement.
- [ ] No enforced rule is also written as prose.
- [ ] Existing rule files merged, not clobbered.

## Anti-patterns

- **Asking about formatter-settled trivia.** It burns the attention needed for questions that matter.
- **Writing prose for something lintable.** The single most common failure, and it produces a document nobody follows.
- **Recommending a default that breaks most of the codebase** without saying so first.
- **Recording defaults as decisions.** It destroys the ability to revisit them honestly later.
- **A long always-on rule file.** Glob-scope it, or accept that it gets skimmed.
- **Prescribing a package manager, or copying another manager's keys into this one.** Detected manager, that manager's docs.
- **Turning on every supply-chain flag at once.** Cooldown plus an allowlist is the useful pair. Trust policy and a week-long gate are how you break the next install.

## Related skills

- `engineering-setup` — must run first; writes `.engineering/config.yaml`
- `conventions-audit` — check a diff against these decisions
- `conventions-migrate` — change a decision and fix the code
- `conventions-revisit` — periodic review of defaults and tiers
