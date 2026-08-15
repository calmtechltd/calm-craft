# Spec Format

The authority on how specs are written. `engineering-setup` copies this into the repo (default `specs/README.md`) and every spec skill links here rather than restating it. Format rules live in exactly one place; the moment a skill repeats the badge table, the two drift.

A spec describes **what a feature is supposed to do** — observable behaviour, written independently of the implementation. Not BDD, not Gherkin. Close to how you'd explain a feature to a smart colleague.

The design constraint behind every rule below: **everything must be addressable by a stable ID**, so code, tests, tickets, plans, and agents can cite the same thing.

## Folder structure

```
specs/<module>/<feature-area>/<spec-name>.md
```

kebab-case, no number prefixes. Ordering comes from the folder and the front-matter `id`.

## Front matter

```yaml
---
id: billing-invoicing-refund-processing   # globally unique, mirrors the folder path
area: Billing / Invoicing                 # Title Case, used for grouping
status: partial                           # implemented | partial | future — roll-up of behaviours
---
```

### Ticket references are optional, and off by default

`tickets.provider` in `.engineering/config.yaml` defaults to `none`. With `none` there is **no ticket field at all** — not a blank one. A field nobody fills in is worse than no field: it makes the format look more rigorous than it is, and every author has to decide whether they were supposed to complete it.

With a provider set, a `ticket` field becomes available in front matter and on 🟡 behaviours:

| Provider | Setup |
| --- | --- |
| `none` | Default. No ticket field |
| `github` | Inferred from the repository. `gh` is already authenticated, so skills can genuinely resolve issue state |
| `linear`, `jira`, `custom` | Require `pattern` and a `url` template. Skills can link, but usually cannot resolve state without credentials |

**What never changes:** a 🟡 behaviour always carries a one-line note on what's missing. The note is the valuable half — it describes the state of the product. The ticket is optional metadata recording that someone made a card.

**The spec owns intent; the tracker owns scheduling.** A closed ticket never promotes a badge. It makes `spec-gap-sweep` report the behaviour as worth verifying, and `spec-maintain-on-ship` still demands evidence — the code and the test, named. Anything else and badges go back to being optimistic rather than honest, which is the one property worth protecting.

Discussion flows the other way, through `spec-harvest-discussion`: it proposes spec changes from an issue or review thread and never writes back to the tracker.

## Sections

Every spec has all of these headers, always, in this order. Empty sections are written `_None._` rather than deleted — a spec should be recognisable at a glance.

- `# Feature Name` + a one or two sentence plain-English description
- `## Behaviours` — observable outcomes from the user's perspective
- `## Rules (Invariants)` — what must always be true regardless of path. Most often missing from tests
- `## Decision Tables` — combinatorial logic, mapping the input space to expected outcomes
- `## User Flows` — optional; see below
- `## Open Questions` — an unresolved question blocks marking a behaviour implemented
- `## Future Considerations` — designed, deliberately not being built. A design record, not a backlog
- `## Out of Scope` — what the feature deliberately does not do, so an assessor doesn't flag intentional gaps

## Behaviour IDs and status badges

Status lives at the **behaviour level**, not just the file level — a spec can describe a whole feature when only part is built. Behaviours are numbered `B1`, `B2`, … so anything can cite them.

| Badge | Meaning |
| --- | --- |
| 🟢 `implemented` | Built and tested |
| 🟡 `partial` | Built but incomplete. **Must** carry a one-line note on what's missing, plus a ticket if the repo links them |
| 🔵 `future` | Designed, not scheduled. No ticket required |

```markdown
### B3 — Refunding a partially paid invoice 🟡 partial
> ABC-123 — the refund succeeds but the customer is not notified

A customer can be refunded before their invoice is fully paid, up to the amount
already received. Today the refund is recorded but no notification is sent.
```

Front-matter `status` is the roll-up: `implemented` only if every behaviour is; `future` if nothing is built; `partial` otherwise.

## Voice — requirements, not implementation

| Avoid | Use |
| --- | --- |
| "A projection is calculated in memory and cached…" | "A saved search shows the same results next time…" |
| "An hourly job scans the table and flips a flag…" | "An invitation stops working once it expires, without anyone acting…" |
| "We publish a message to the queue…" | "When someone leaves a team, their access ends everywhere…" |

If you couldn't say it to a non-developer, it doesn't belong in a spec. Implementation detail belongs in code, comments, or design docs.

## Test cross-references: none

Specs are deliberately test-agnostic. Never write "tested by file X". Reasoning from a behaviour ID to matching tests is the assessor's job; if it can't find them, that *is* the gap report. Hand-maintained test links rot.

## Open Question markers

Two optional prefixes, because open questions accumulate and they aren't equal:

- `**Settled:**` (also `**Resolved:**`, `**Decided:**`, `**Moved:**`) — decided, kept because the reasoning is the point. Stops recorded thinking from making a spec look worse than one that recorded none.
- `**Blocks B6:**` — this question is what stops B6 proceeding. Accepts several: `**Blocks B3a, B4:**`. Distinguishes "future because nobody scheduled it" from "future because a decision is outstanding". Only the second is unblockable by a conversation.

## User Flows

Add when order, branching, cancellation, retry, resumability, or asynchronous processing constrains the feature. Signals: three or more ordered steps, conditional navigation, back/cancel/retry/partial-success paths. **Not** for ordinary CRUD screens.

Two sibling files named after the spec:

- `<spec>.flow.yaml` — authoritative, hand-edited
- `<spec>.flow.mmd` — generated, never hand-edited, starting `%% Generated from <spec>.flow.yaml. Do not edit directly.`

They're supporting artifacts, not specs, and carry no front matter. One YAML may hold several flows for the same spec. The spec links both and inlines neither:

```markdown
## User Flows

- **F1 — Import Wizard:** [contract](./import-wizard.flow.yaml) ·
  [diagram](./import-wizard.flow.mmd) — covers B2, B5–B7
```

```yaml
version: 1
flows:
  - id: F1
    name: Import Wizard
    start: upload
    states:
      - id: upload
        kind: screen           # screen | action | terminal
        label: Upload File
      - id: complete
        kind: terminal
        label: Import Complete
        outcome: The import is recorded and the user sees the result.
    transitions:
      - id: F1.T1
        from: upload
        event: Continue
        to: validate
        guard: A supported file has been accepted.
        covers: [B2]
      - id: F1.T3
        from: validate
        event: Validation fails
        to: upload
        outcome: The user sees why the file was refused and can try again.
        covers: [B2, B5]
```

### Contract rules

- Flow IDs unique within the spec; state IDs unique within the flow; transition IDs `<flow>.T<n>`, unique within the spec.
- `start` and every `from`/`to` reference a declared state. Every state reachable from `start`.
- Every non-terminal state has an outgoing transition. Terminal states have none and state the user-visible outcome.
- Guards are in product language. Transitions sharing a `from` and `event` have mutually exclusive guards, with at most one unguarded fallback; branches are exhaustive or include that fallback.
- Back, cancel, retry, permission-denied, success, partial-success, and failure paths are **explicit** when the journey supports them — never inferred from prose. A happy-path-only flow gives the implementation permission to invent the rest.
- Loops are intentional and have an exit.
- `covers` cites real behaviour IDs. A flow clarifies behaviours; it never creates unbadged requirements.
- Mermaid node IDs are namespaced by flow (`F1_upload`) so flows can share state names.
- The diagram holds the same states and transitions as the contract. Regenerate after every YAML change. **If they disagree, the YAML wins.**

Code must not add a step, bypass, guard, or terminal outcome the contract doesn't allow. Change the YAML and regenerate before implementing, when product intent changes.

## Maintenance

A spec that drifts from reality is worse than no spec.

- A `partial` behaviour ships → `implemented`, drop the note and ticket.
- A `future` behaviour is prioritised → `partial`, add the note and ticket.
- An Open Question is resolved → document the decision, often as a new behaviour or invariant, and mark it `**Settled:**` or remove it.
- A journey changes → update the YAML first, regenerate the diagram, preserve IDs for unchanged paths.
- Specs are reviewed in the pull request for any significant feature change, alongside the code.
