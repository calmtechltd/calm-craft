---
name: spec-visualize
description: Generate a single self-contained HTML dashboard of every spec in the estate — roll-up counts, status filtering, free-text search, module grouping, and filters for open questions and blocked behaviours. Use when the user says "show me all our specs", "spec dashboard", "give me a status overview of the estate", or wants a shareable snapshot.
---

# Visualise Specs as a Dashboard

One self-contained HTML file showing the whole estate. Useful for browsing, for a status conversation with someone who won't read markdown, and for seeing shape — which modules are thin, which features are mostly 🔵.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Spec root: `.engineering/config.yaml`.

## When to use

- "Show me the state of our specs."
- Preparing a status conversation with a stakeholder.
- Getting a feel for the estate before planning.

**Not this skill:** finding maintenance debt (`spec-gap-sweep` — same data, actionable output).

## Workflow

### 1. Parse every spec

Front matter, behaviours with badges and notes, invariants, decision tables, open questions with their prefixes, flow contracts and their transitions.

Report parse failures rather than dropping them silently. A spec the dashboard can't read is one nobody's tooling can read.

### 2. Compute, don't trust

Recompute roll-up status from behaviour badges. Where the file's front matter disagrees, show the **computed** value and mark the discrepancy — a dashboard that repeats a wrong badge is worse than no dashboard.

### 3. Generate one file

Write a single HTML file to `<specs root>/_site/index.html` with **no external dependencies** — no CDN scripts, no remote fonts, no network calls. It must open from disk and work when emailed to someone.

Include:

- **Estate summary** — specs by status, behaviours by badge, open questions by kind, flow transition count.
- **Grouping by module and feature area**, collapsible.
- **Per-spec cards** — title, area, status, behaviour badges, counts, and the discrepancy marker where relevant.
- **Free-text search** across titles, behaviour text, and open questions. Behaviour text matters — that's where the answer usually is.
- **Filters:** by status; *open questions only*; *blocked behaviours only*. The last one is the most useful view in the whole dashboard — it's the list of things a decision would unblock.
- **Behaviour detail** on expand, including notes on 🟡 behaviours and the questions blocking a 🔵.

Link each spec to its source file with a relative path so the dashboard is a way in, not a replacement.

### 4. Respect the theme, and the page

Readable in light and dark. Wide content scrolls within its own container rather than the page scrolling sideways. Nothing here needs a framework; keep the file small enough to open instantly.

### 5. Hand back

Path, estate counts, discrepancies found between recorded and computed status, and any spec that failed to parse.

## Quality gate

- [ ] Single file, zero external requests, opens from disk.
- [ ] Roll-ups recomputed; discrepancies shown, not hidden.
- [ ] Parse failures reported.
- [ ] Search covers behaviour text, not just titles.
- [ ] Blocked-behaviours filter present and correct.
- [ ] Readable in both light and dark; no horizontal page scroll.
- [ ] No spec files modified.

## Anti-patterns

- **External dependencies.** It stops working exactly when someone else opens it.
- **Displaying front-matter status without checking it.** Propagates the error to an audience.
- **Silently skipping specs that don't parse.**
- **Searching titles only.** The behaviour text is the content.
- **Rebuilding `spec-gap-sweep` in HTML.** This is for browsing; that one is for acting.

## Related skills

- `spec-gap-sweep` — the actionable version of the same data
- `spec-maintain-on-ship` — fix the discrepancies this surfaces
