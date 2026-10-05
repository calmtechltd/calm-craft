---
name: author-implementation-plan
description: Turn agreed requirements into a proportionate implementation plan for the selected delivery scope, with reviewable chunks, acceptance criteria and necessary dependencies. Use when the user requests a plan or authorized implementation needs a durable multi-chunk plan. Size alone does not trigger this skill. The runner handles authorized execution.
---

# Author an Implementation Plan

Author a proportionate implementation plan for the agreed delivery scope. Each chunk contributes to satisfying its requirements. Prefer the simplest complete solution, using the existing implementation where sufficient. This workflow writes the plan; execution follows when requested.

Keep planning and execution in separate workflows within the same turn. If the original request authorizes implementation, pass the completed plan to `run-implementation-plan` or `run-implementation-plan-all`. Do not ask the user to repeat that authorization. During active implementation, treat a concrete, in-scope suggestion such as “we should…”, “maybe do X”, or “it would be better if…” as a request to make the change when the intended result is clear. Pause for a material product decision, a destructive or external action that needs authorization, or a material expansion of scope.

Use the configured plans path when present, otherwise the repository's existing convention or `.plans/`. Read the governing specs and [format](../../references/spec-format.md), supplied requirements and decisions, and the relevant existing implementation.

## Establish the scope and approach

The user's latest instructions and accepted decisions establish the delivery scope. The governing spec defines the required behaviour; the plan selects the work needed to deliver it. Identify what the existing implementation already satisfies and plan the remaining changes.

Connect every material deliverable to a selected requirement or agreed decision. Include technical prerequisites where they are necessary to satisfy a selected acceptance criterion or applicable repository rule, and briefly explain which outcome they enable. Product behaviour and user flows follow the agreed requirements.

Use existing capabilities and patterns where sufficient. Group the required changes into coherent, reviewable chunks. Include UI where a selected requirement needs it, following the agreed user flow. Choose phases or vertical slices when they clarify the actual delivery dependencies.

Keep the executable queue limited to the selected delivery scope. Record deferred or optional context separately; a future phase becomes executable when the user includes it in the assignment.

Resolve ordinary implementation choices through established code and conventions. Record material unresolved product decisions or conflicts for the user to settle, and identify which chunks depend on them. A complete brief can proceed directly to planning.

## Define the delivery sequence

Each chunk records:

- **ID**: a stable chunk identifier.
- **Depends on**: necessary prerequisites implemented and appropriately verified in the working state. Require a merge only for a real external dependency.
- **Contract**: governing requirements/spec paths and IDs; state/transition IDs for a governed journey.
- **Work**: concrete affected areas and behaviour changes, with the requirement or necessary prerequisite behind each material deliverable.
- **Done when**: observable acceptance criteria and proportionate verification.
- **Out of scope**: explicit exclusions relevant to the assignment. The selected requirements establish the boundary even where an exclusion is not listed.

Use [write-tests](../write-tests/SKILL.md) for test value, verification ownership and evidence reuse. Distinguish required checks from recommendations and justified omissions. Focused browser verification follows task/repository policy and explicit skips. For UI work, describe the observable result in the app and any required manual checks.

For governed user journeys, use the authoritative YAML contract and its supported states, transitions, recovery/exits and storyboard intent. Resolve product-contract questions through existing agreed decisions or record them as unresolved before the dependent work becomes executable.

Keep the plan's structure proportionate to the work. Size chunks by a coherent responsibility and its consumers. Use a compact coverage map when it prevents selected requirements being lost. Dependencies must be acyclic and satisfiable within the intended workflow.

## Review and hand back

Check both sides of the assignment: the chunks cover the selected requirements, and every material deliverable serves one of them or a justified necessary prerequisite. Simplify the plan wherever the agreed outcomes and repository rules can be satisfied with less work.

Save the dependency-ordered plan with an initial Next up marker, unresolved decisions and each chunk's completion criteria. Keep deferred context outside executable chunks, dependencies and completion checklists.

Separate local implementation completion from external publication/rollout. Preserve existing authorisation and identify genuine external prerequisites at the stage where they matter. An ordinary plan does not create a host goal or automation.

Report the path, sequence, first executable chunk and material assumptions. Use `run-implementation-plan` or `run-implementation-plan-all` when the original or current request authorizes execution.
