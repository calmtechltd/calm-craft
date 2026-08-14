---
id: calmcraft-visualizer-ui
area: CalmCraft
status: implemented
---

# Visualizer Interface

The local CalmCraft application gives developers and reviewers a clear route through a large product-spec estate. Four connected views cover orientation, feature intent, branch change, and spec health.

## Behaviours

### B1 — Orient the session 🟢 implemented

The application shows the repository, worktree or remote-session state, current branch or detached commit, selected comparison base when present, and session health. Navigation exposes Atlas, Branch Review, and Health from every view.

### B2 — Browse the Atlas 🟢 implemented

Atlas groups specs by module and feature area in a dense list and matrix. Each feature shows status, behaviour count, blocker count, findings, and changed state without requiring a wall of repeated cards.

### B3 — Search and filter the estate 🟢 implemented

A user can search titles, IDs, descriptions, behaviours, and paths. Filters cover status, module, blockers, findings, and branch changes, and they can be cleared without losing the current repository session.

### B4 — Read one feature as a contract 🟢 implemented

Feature view shows identity, description, behaviours, invariants, decision tables, open and resolved questions, future considerations, out-of-scope statements, and source paths in the spec's canonical order.

### B5 — Navigate behaviour anchors 🟢 implemented

Each behaviour has an addressable anchor with its stable key, status, blocker state, partial note, and content. Copying or reloading that URL returns to the same feature and behaviour.

### B6 — Explore relationships and flows 🟢 implemented

Feature view shows outgoing relationships, backlinks, and authoritative user flows. Selecting a flow state or transition reveals its event, guard, outcome, and covered behaviours.

### B7 — Review branch changes by feature 🟢 implemented

Branch Review groups changed features by module, change type, or provenance. It shows the base and merge-base and lets the reviewer include or exclude committed, staged, unstaged, and untracked work.

### B8 — Inspect semantic before and after 🟢 implemented

Selecting a change shows the typed before-and-after comparison for behaviours, invariants, decision rows, questions, relationships, or flows. Raw source evidence remains available on demand.

### B9 — Move through a review without losing context 🟢 implemented

Reviewers can move to the next or previous change, change provenance filters, open source evidence, and return to the summary while retaining the selected feature.

### B10 — Inspect estate health 🟢 implemented

Health lists findings by severity, code, feature, source, and introduced or resolved state. Selecting a finding opens its feature and exact source context when available.

### B11 — Use browser history and durable local URLs 🟢 implemented

View, feature, behaviour, change, filter, and finding selection are represented in the session URL. Reload, back, and forward restore valid state without exposing the repository path or session token in copied content URLs.

### B12 — Work with keyboard and assistive technology 🟢 implemented

All navigation, filters, commands, tables, and comparison controls work by keyboard, expose useful names and state to screen readers, preserve visible focus, and honour reduced-motion preferences.

### B13 — Read status without relying on colour 🟢 implemented

Status and diff meaning use text, shape, and iconography alongside colour. Light and dark themes meet contrast requirements for body text, controls, focus, status, and additions or removals.

### B14 — Stay usable across estate size and viewport 🟢 implemented

The interface remains usable on narrow desktop viewports and large displays. Atlas search and filtering stay responsive at 1,000 specs, while a 300-spec estate reaches its first usable screen within the product budget.

## Rules (Invariants)

- Atlas, Feature, Branch Review, and Health read one session model and cannot disagree about identity or status.
- The UI never parses raw Markdown headings or flow YAML.
- A graph may explain selected relationships; it cannot become the only route through the estate.
- Status and diff meaning never depend on colour alone.
- The UI exposes no repository write control in v1.
- A parser error in one feature cannot prevent navigation to healthy features.

## Decision Tables

### Default view

| Session state                                    | Initial view                                                 |
| ------------------------------------------------ | ------------------------------------------------------------ |
| Estate-only session                              | Atlas                                                        |
| Diff requested with one or more semantic changes | Branch Review                                                |
| Diff requested with no semantic changes          | Branch Review empty state with Atlas available               |
| Diff requested but base unavailable              | Atlas with base guidance and Branch Review unavailable state |

### Finding navigation

| Finding evidence                 | Destination                             |
| -------------------------------- | --------------------------------------- |
| Feature and source location      | Feature section at source context       |
| Feature without source location  | Feature overview                        |
| Repository-level finding         | Health detail                           |
| Finding introduced by comparison | Branch Review change plus Health detail |

## User Flows

_None._

## Open Questions

- **Settled:** The primary estate navigation uses a dense list and matrix. Relationship graphs support a selected feature.
- **Settled:** CalmCraft ships light and dark themes in v1.

## Future Considerations

- Saved local filters and review positions with an explicit privacy policy.
- Shareable static review artifacts.
- IDE deep links from source locations.

## Out of Scope

- In-browser spec editing or automatic repair.
- Hosted accounts, shared review state, and product analytics.
- Mobile-first interaction design.
