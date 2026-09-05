# CodeRabbit Triage — Output Templates

## `04-categorized-breakdown.md` (header)

```markdown
# CodeRabbit Review Breakdown — PR #<N>

**PR:** [<title>](<url>)
**Branch:** `<branch>`
**Total findings:** <count>

## Source Files

| File | Description |
| --- | --- |
| `01-walkthrough-summary.md` | Bot walkthrough / PR summary |
| `02-review-body-full.md` | Full review body |
| `03-inline-comment-*.md` | Inline findings of every severity |
| `raw-comments/` | One file per finding |
| `05-comments-structured.json` | Machine-readable list |

## Overview

| Category | Count |
| --- | --- |
| Inline (all severities) | … |
| Outside Diff Range | … |
| Major | … |
| Nitpick | … |

## Quick Triage Checklist

- [ ] **Critical (N)** — …
- [ ] **Major (N)** — …
…
```

## `06-triage-decisions.md`

```markdown
# CodeRabbit PR #<N> — Triage Decisions

**PR:** [<title>](<url>)
**Branch:** `<branch>`
**Triaged:** <date> (against current workspace code)

## Summary

| Category | Count |
| --- | --- |
| **Obvious Fix** | N |
| **Skip** | N |
| **Needs Input** | N |
| **Unverified** | N |

---

## Obvious Fixes

Order by consequence. Include only verified in-scope fixes; assess nits by their actual value and governing rule.

1. **`<path>`** (L<lines>) — **<title>.**
   *Rationale:* <one line>

---

## Skipped

1. **`<path>`** (L<lines>) — **<title>.**
   *Rationale:* <one line citing why — e.g. already in helper X>

---

## Needs Input

### 1. <title>

- **File:** `<path>` (L<lines>)
- **Question:** <specific question for the user>

---

## Unverified

- <finding ID, missing evidence, and next useful check>

## Verification notes

- <evidence for each definitive verdict and limits on completeness>
```

## Needs Input question format

Each question must be **actionable** — the user's answer should map to Obvious Fix or Skip:

- ✅ "Should publish be blocked when the validation query errors, or only when it returns blocking issues?"
- ❌ "What do you think about this comment?"

After the user answers, update `triage` in `05-comments-structured.json` and move the item to Obvious Fixes or Skipped in `06-triage-decisions.md`.
