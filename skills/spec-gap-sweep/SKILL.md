---
name: spec-gap-sweep
description: Sweep every spec in the estate for maintenance debt — partial behaviours with no ticket, ageing future behaviours, roll-up statuses that disagree with their behaviours, long-standing open questions, and modules with no specs at all. Use when the user asks "what state are our specs in", "review the spec estate", "which open questions are blocking work", or on a periodic cadence. Reports only.
---

# Sweep All Specs for Gaps

Estate-wide health. Individual spec skills go deep on one feature; this goes wide and finds what nobody maintained.

**Reports only.** Fixing is `spec-maintain-on-ship`.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Spec root: `.engineering/config.yaml`.

## When to use

- Periodic review — monthly or quarterly.
- "What state are our specs in?"
- Deciding where to spend maintenance effort.
- Finding which open questions are actually blocking work.

**Not this skill:** auditing one spec against code (`spec-audit-drift`), fixing anything (`spec-maintain-on-ship`).

## What to look for

### 1. Roll-up statuses that disagree with their behaviours

Recompute every front-matter `status` from the behaviour badges and report mismatches. A spec marked `implemented` containing a 🔵 behaviour is the common case, and it's how an estate starts overstating itself.

### 2. Partial behaviours with no note

Every 🟡 requires a one-line note on what's missing. A 🟡 without one is work nobody is tracking, described nowhere else. **The note is the requirement**; a ticket reference is optional, and absent entirely when `tickets.provider` is `none`.

Where a provider *is* configured, also flag 🟡 behaviours whose ticket is closed. With `provider: github`, resolve it properly — `gh` is authenticated, so this is a real check rather than a guess. With `linear`, `jira`, or `custom`, attempt it only if credentials exist and **say plainly when you couldn't**; an unresolvable ticket is evidence of nothing.

A closed ticket means the badge is **worth verifying** and nothing more. Report it as such and hand to `spec-maintain-on-ship`, which requires the code and the test before promoting anything. Never infer a badge from tracker state — the spec owns intent, the tracker owns scheduling, and collapsing the two puts the estate back to being optimistic.

A closed ticket with a long thread is also the best candidate for `spec-harvest-discussion`: that's where decisions were made that the spec never absorbed.

### 3. Ageing future behaviours

🔵 behaviours that have sat untouched for a long time. Report age from git history rather than guessing.

Old 🔵 behaviours are not automatically a problem — a design record is allowed to sit. But a cluster of them in one spec usually means the feature was designed far beyond what anyone intends to build, and the spec would read better with them moved to Future Considerations.

### 4. Open Questions, split by kind

- **`Blocks Bn:` questions** — these are the ones that matter. Each is a behaviour that cannot proceed until someone decides something. List them with the behaviour they block and how long they've been open. **Lead the report with these**: they're the only category unblockable by a single conversation.
- **Unprefixed questions** older than a few months — either they stopped mattering, or nobody owns them.
- **`Settled:` questions** — healthy. Count them but don't flag them; they're recorded reasoning, not debt.

### 5. Modules with no specs

Compare the module structure of the codebase against the spec estate. A module with substantial code and no spec is the largest kind of gap, and the least visible — you can't notice a spec that was never written.

Rank by code volume and change frequency. A large, frequently-changed, unspecced module is where the estate's blind spot costs most.

### 6. Structural problems

- Specs missing required section headers.
- Behaviour IDs that skip or repeat.
- Flow contracts whose Mermaid sibling is older than the YAML — the diagram is stale.
- `covers` references pointing at behaviour IDs that no longer exist.

## Report

Lead with **blocking questions**, then **unspecced modules by size**, then everything else. Order by what's costing most, not by category.

For each item: the spec path, the ID, the evidence with dates or counts, and the specific action. End with estate-level counts — specs by status, behaviours by badge, open questions by kind — so the trend is visible when you run it again.

Change nothing.

## Quality gate

- [ ] Every spec parsed; parse failures reported rather than skipped.
- [ ] Roll-ups recomputed, not read.
- [ ] Ages taken from git history, not estimated.
- [ ] Blocking questions separated from ordinary ones and led with.
- [ ] Unspecced modules ranked by size and change frequency.
- [ ] Settled questions counted, not flagged as debt.
- [ ] Nothing modified.

## Anti-patterns

- **Treating every open question as debt.** Settled ones are the system working; flagging them punishes recording your thinking.
- **Reporting counts with no ranking.** A list of 200 items with no order is not actionable.
- **Skipping unparseable specs.** Those are the most broken ones.
- **Ignoring modules with no specs** because the sweep only looks at files that exist.

## Related skills

- `spec-maintain-on-ship` — fix what this finds
- `spec-plan-gap` — plan a spec for an unspecced module
- `spec-audit-drift` — go deep on a spec this flagged
- `spec-visualize` — the same data, browsable
