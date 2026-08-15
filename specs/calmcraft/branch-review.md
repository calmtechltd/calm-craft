---
id: calmcraft-branch-review
area: CalmCraft
status: implemented
---

# Branch Review

A reviewer can see the product behaviour changed by a branch and separate committed work from local edits. Each semantic claim links back to source evidence.

## Behaviours

### B1 — Compare from the merge-base 🟢 implemented

Branch review compares the current target with the merge-base between `HEAD` and the selected base. The review shows the selected base, merge-base commit, current branch or detached commit, and target snapshot.

### B2 — Separate change provenance 🟢 implemented

CalmCraft classifies branch commits, staged changes, unstaged changes, deleted paths, and untracked spec files. A reviewer can include or exclude local work without changing the repository.

### B3 — Summarize changed features 🟢 implemented

The review groups changes by module and feature, then states which semantic elements changed. Unchanged features remain available in estate views but do not crowd the branch summary.

### B4 — Compare spec identity and metadata 🟢 implemented

The review reports added, removed, moved, renamed, and metadata-changed specs. Stable IDs distinguish a move from removal plus addition.

### B5 — Compare behaviours 🟢 implemented

The review reports added, removed, renamed, content-changed, and status-changed behaviours by stable behaviour key. Status changes show both states.

### B6 — Compare rules, decisions, and questions 🟢 implemented

The review reports added, removed, and changed invariants and decision rows. It distinguishes questions that were added, resolved, reopened, retargeted, or edited.

### B7 — Compare relationships and flows 🟢 implemented

The review reports relationships that were added, removed, or broken. Flow comparison covers states, transitions, events, guards, destinations, terminal outcomes, and behaviour coverage.

### B8 — Label inferred renames 🟢 implemented

If stable IDs cannot prove a rename, CalmCraft may suggest a text-similarity match. The review labels the match as inferred and keeps both original sources available.

### B9 — Show exact source evidence 🟢 implemented

Every semantic change links to the before and after source locations when they exist. A reviewer can open the raw Markdown or YAML diff without leaving the feature context.

### B10 — Handle a missing base honestly 🟢 implemented

If no base can be resolved, Branch Review explains how to supply one and does not present a fabricated or empty change set. Atlas, Feature, and Health remain available.

### B11 — Produce deterministic review data 🟢 implemented

The same base, target filesystem, configuration, and Git object state produce the same ordered semantic change set.

### B12 — Bake the review into a generated file 🟢 implemented

`calmcraft generate --diff` computes the comparison once from the current filesystem and writes it into the HTML file. Opening the file does not start a process, bind a port, or re-read the repository.

## Rules (Invariants)

- Uncommitted content is never attributed to a branch commit.
- A semantic change retains enough source evidence for the reviewer to challenge it.
- Stable IDs beat similarity when classifying identity.
- An inferred rename never deletes the underlying add and remove evidence.
- Branch review performs no fetch or write in a selected local repository. A remote session fetches only its selected branch and comparison base inside the owned temporary clone.
- Filtering provenance changes presentation only; it does not recalculate or mutate Git state.

## Decision Tables

### Provenance classification

| Content state                                             | Provenance shown                            |
| --------------------------------------------------------- | ------------------------------------------- |
| Difference between merge-base and `HEAD`                  | Branch commit                               |
| Difference between `HEAD` and index                       | Staged                                      |
| Difference between index and tracked filesystem           | Unstaged                                    |
| Spec path absent from Git index and present in filesystem | Untracked                                   |
| Tracked spec absent from target filesystem                | Deleted in the layer where removal occurred |

### Spec identity comparison

| Before                                 | After                          | Classification                                    |
| -------------------------------------- | ------------------------------ | ------------------------------------------------- |
| Same stable ID and path                | Same stable ID and path        | Content or metadata change                        |
| Same stable ID and path                | Same stable ID at another path | Moved                                             |
| Stable ID absent                       | New stable ID                  | Removed and added                                 |
| Stable ID absent, high text similarity | New stable ID                  | Removed and added with inferred rename suggestion |

## User Flows

_None._

## Open Questions

- **Settled:** v1 shows semantic summaries from typed comparisons; it does not generate a prose review with an AI model.

## Future Considerations

- Pull request metadata and direct links when a provider integration is configured.
- Review comments and approval state stored outside the repository.
- CI artifacts that publish a read-only branch review snapshot.

## Out of Scope

- Approving, commenting on, merging, or changing a pull request.
- Refreshing refs in a selected local repository or fetching branches outside a remote session's selected branch and comparison base.
- Generating or editing specs from review findings.
