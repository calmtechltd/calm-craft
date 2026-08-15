---
name: conventions-revisit
description: Periodic review of recorded conventions — surface defaults nobody ever examined, rules a linter could enforce but doesn't, rules riddled with ignores, and drift between the decisions file and the generated config. Use when the user says "review our conventions", "are our standards still right", "what conventions did we never actually decide", or on a periodic cadence. Proposes; changes nothing.
---

# Conventions Revisit

Conventions rot in specific, predictable ways. This skill finds them. It **proposes and changes nothing** — acting on what it finds is `conventions-decide` or `conventions-migrate`.

## When to use

- Periodic review — quarterly is about right.
- "Are our conventions still right?"
- After a significant amount of new code, or a new language entering the repo.

**Not this skill:** making decisions (`conventions-decide`), fixing code (`conventions-migrate`), checking a diff (`conventions-audit`).

## What to look for

### 1. Defaults that have accumulated real code

Decisions with `status: defaulted` that now govern a substantial amount of code. Nobody ever examined these; they were accepted to get through the interview. Now they have consequences.

For each, report the decision, how much code it governs, and whether the codebase actually complies. **A default the code already violates everywhere is the strongest signal it was the wrong default** — the team voted with their editors.

### 2. Rules that could be enforced but aren't

Decisions at `tier: ambient` or `tier: documented` where a lint rule now exists that could enforce them. This changes as linters gain rules, and nobody goes back to check.

Every one of these is a rule you could stop relying on people to remember. Report the decision, the rule that would enforce it, and roughly how many existing violations there are.

Also report the inverse: decisions marked `enforced` with **no rule actually implementing them**. Those are lies in the config, and they're worse than an honest `documented`.

### 3. Rules that have become fiction

Enforced rules with so many scoped ignores that they no longer describe the codebase. Count the ignores per rule. Past a handful, either the rule is wrong or the migration never finished — say which you think it is.

Same for rules sitting at warning severity long after the migration that was meant to precede an error.

### 4. Drift between decisions and generated output

`conventions.yaml` is the source of truth; lint config, ambient rules, and the generated document are outputs. Check they still agree.

Where they don't, the usual cause is someone hand-editing a generated file. Report which file was edited and what it now says that the decisions don't — and say plainly that the fix is to change the decision and regenerate, not to keep the edit.

### 5. Unrecorded conventions

Patterns the codebase follows consistently that aren't in `conventions.yaml` at all. Sample across modules; consistency above roughly 90% with nothing recorded means the team has a convention nobody wrote down. Those are cheap wins — propose them as new decisions with the existing behaviour as the recommended answer.

Include the supply-chain and secrets questions if they are absent: a manager that now ships a release cooldown or a script allowlist by default, a `.env` ignore rule everyone follows but nobody recorded, an example env file that exists but isn't a decision. These are Axis 10.7–10.10 and S.1–S.5 — propose them, do not enable them here.

## Report

Group by the five categories above. For each item: the decision id (or "unrecorded"), the evidence with counts, and the specific next action — `conventions-decide` to change an answer, `conventions-migrate` to fix code, or a lint config change.

Lead with the items that would remove the most manual checking. A rule promoted from ambient to enforced pays back every time anyone touches the codebase.

Do not change anything.

## Quality gate

- [ ] Every finding carries counts, not impressions.
- [ ] Enforcement gaps and false `enforced` markings both reported.
- [ ] Each item names the skill or change that would act on it.
- [ ] Nothing was modified.

## Anti-patterns

- **Recommending changes because a rule is unfashionable.** The evidence is what the codebase does, not taste.
- **Treating a violated default as a compliance problem.** It's usually a signal the default was wrong.
- **Reporting drift without naming the hand-edited file.** That's the actual fix.
- **Fixing anything.** This skill proposes.

## Related skills

- `conventions-decide` — change an answer and regenerate
- `conventions-migrate` — fix the code behind a changed answer
- `conventions-audit` — per-diff checking
