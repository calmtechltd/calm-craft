---
name: spec-author-greenfield
description: Write a design-first feature spec from supplied requirements and decisions, including flow contracts where warranted. Use for unbuilt features; ask only consequential unresolved questions and do not implement.
---

# Author a Greenfield Spec

Describe the intended behavior of an unbuilt feature from the user's requirements. Follow the repository's format policy and the [packaged format](../../references/spec-format.md) where applicable. Search for overlapping intent before adding a new spec.

## Establish scope

Read the brief, accepted decisions, relevant existing specs, and explicit deferrals. Determine the user goal, triggers, outcomes, rules, adjacent features, failures/recovery, and exclusions. Ask only unresolved consequential questions. If the user authorized defaults, record them without making speculative requirements.

A complete brief can proceed directly to a draft. Show an outline first when it resolves a real ambiguity; do not require an extra feedback round for settled work. Empty Open Questions are valid.

## Write

Use user-observable requirements and stable IDs. Unbuilt, unscheduled behavior is future; reflect the repository's actual prioritization/status policy when work is already scheduled. Do not add tickets when the repository disables them. Mark empty sections `_None._` rather than inventing content.

For a warranted stateful journey, author its YAML contract and generate the Mermaid view through the owning tool. Cover supported exits, guards, recovery, and terminal outcomes. Transitions cite existing behavior IDs; the flow does not add unbadged requirements. Add scene-level storyboard guidance only when the requested design work needs it, using `spec-storyboard-journey` within that scope.

## Verify and report

Inspect the spec against the supplied intent and applicable format. Validate authored structured examples/contracts with their owning parser when needed; regenerate affected outputs, never hand-edit them. Follow [write-tests](../write-tests/SKILL.md): spec authoring does not trigger application tests or running-app verification.

Report the path, scoped behaviors, important assumptions, and genuine unresolved decisions. Leave implementation and test authoring to the requested delivery workflow.
