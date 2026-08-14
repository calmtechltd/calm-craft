---
id: calmcraft-spec-model
area: CalmCraft
status: partial
---

# Spec Model

CalmCraft turns a repository's Markdown specs and flow contracts into one stable product model. A malformed file produces a precise finding without hiding healthy features.

## Behaviours

### B1 — Discover the spec estate deterministically 🟢 implemented

CalmCraft reads Markdown specs beneath the configured specs root, excluding the format guide, template, generated output, and non-spec supporting files. Repeated reads of unchanged sources produce the same ordered estate.

### B2 — Read spec identity and sections 🟢 implemented

Each spec exposes its stable ID, area, roll-up status, title, description, behaviours, invariants, decision tables, user flows, open questions, future considerations, and out-of-scope statements.

### B3 — Address behaviours by stable key 🟢 implemented

Behaviours retain their `B<n><suffix>` key, title, status, partial note, body, and source location. Duplicate keys and malformed headings produce findings.

### B4 — Explain status consistency 🟢 implemented

CalmCraft checks the spec roll-up status against its behaviour statuses. A mismatch appears as a finding and does not rewrite the source.

### B5 — Model questions and blockers 🟢 implemented

Open questions retain their text, resolved state, source location, and any behaviour keys they block. A blocker that points at no behaviour produces a finding.

### B6 — Model decision rows 🟢 implemented

Decision tables retain headers, rows, source locations, and stable row fingerprints so branch review can distinguish added, removed, and changed outcomes.

### B7 — Build relationships and backlinks 🟢 implemented

Links between specs produce forward relationships and backlinks. Missing targets, paths outside the repository, and unsupported link schemes produce findings.

### B8 — Treat flow YAML as authority 🟢 implemented

CalmCraft reads sibling `.flow.yaml` contracts, validates their states and transitions, and links transition coverage to real behaviour keys. Mermaid is a generated view; a mismatch appears as a finding and YAML wins.

### B9 — Preserve healthy specs around errors 🟢 implemented

An unreadable or malformed spec produces file-level findings. CalmCraft still exposes every spec and section it can read safely, and it marks incomplete data instead of silently omitting it.

### B10 — Render safe Markdown 🟢 implemented

CalmCraft renders supported Markdown tables, lists, links, code, and text. It removes scripts, event handlers, active embeds, remote media, and unsafe URL schemes before content reaches the browser.

### B11 — Version the content contract 🔵 future

A repository can declare a supported `specVersion` in `calmcraft.json`. CalmCraft reports an unsupported version and does not guess how to reinterpret the content.

### B12 — Give findings stable identities 🟢 implemented

Each parser or validation finding has a stable code, severity, source path, source location when known, and repair guidance. Re-reading unchanged invalid content produces the same finding identity.

## Rules (Invariants)

- The normalized model contains product intent, source evidence, and findings; it contains no executable repository code.
- Stable IDs take precedence over display text when CalmCraft connects or compares entities.
- YAML owns flow intent. Mermaid cannot add a state, transition, guard, or outcome.
- Sanitized HTML contains no remote resource request or active browser content.
- One malformed file cannot erase a healthy file from the estate.
- CalmCraft never changes a spec while parsing or validating it.

## Decision Tables

### File outcome

| Source state                                            | Model result                           | Finding result                                  |
| ------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| Canonical spec                                          | Complete normalized spec               | No parser finding                               |
| Canonical sections with one malformed behaviour heading | Remaining safe sections and behaviours | Heading finding at the source line              |
| Missing frontmatter                                     | Safe body sections when readable       | Identity finding                                |
| Unsupported `specVersion`                               | Estate metadata only                   | Unsupported-version error                       |
| Unsafe Markdown                                         | Safe rendered subset                   | Content-safety finding when content was removed |
| Unreadable file                                         | Placeholder with source path           | File-read error                                 |

### Question state

| Marker                                       | Resolved state                            | Blocker links                           |
| -------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| No decision marker                           | Open                                      | Parsed from an optional `Blocks` marker |
| `Settled`, `Resolved`, `Decided`, or `Moved` | Resolved                                  | Retained as historical context          |
| `Blocks` points at an existing behaviour     | Open unless a decision marker also exists | Linked to that behaviour                |
| `Blocks` points at no behaviour              | Open                                      | Finding records the invalid target      |

## User Flows

_None._

## Open Questions

- **Settled:** The first public parser supports CalmCraft spec version 1 only.
- **Settled:** The visualizer reports repair guidance but does not change source files.

## Future Considerations

- Versioned migration assistance after the content contract gains a second version.
- Optional project-defined fields that remain declarative and safe to parse.

## Out of Scope

- Executing repository configuration, plugins, Markdown HTML, or code blocks.
- Inferring product intent from application source code.
- Editing specs or applying automated repairs.
