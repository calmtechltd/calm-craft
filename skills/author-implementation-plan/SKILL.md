---
name: author-implementation-plan
description: Turn scoped requirements into a dependency-ordered implementation plan with reviewable chunks, acceptance criteria, and exclusions. Use when the user requests a plan or authorized implementation needs a durable multi-chunk plan. Size alone does not trigger this skill. This skill writes the plan; the runner handles authorized execution.
---

# Author an Implementation Plan

Turn an accepted design or scoped requirements into reviewable implementation chunks. Write the plan; do not implement it during this workflow.

Keep planning and execution in separate workflows within the same turn. If the original request authorizes implementation, pass the completed plan to `run-implementation-plan` or `run-implementation-plan-all`. Do not ask the user to repeat that authorization. During active implementation, treat a concrete, in-scope suggestion such as “we should…”, “maybe do X”, or “it would be better if…” as a request to make the change when the intended result is clear. Pause for a material product decision, a destructive or external action that needs authorization, or a material expansion of scope.

Use the configured plans path when present, otherwise the repository's existing convention or `.plans/`. Read the relevant specs and [format](../../references/spec-format.md), supplied decisions, deferrals, and existing implementation. Reuse settled intent. Ask only material unresolved questions; a complete brief does not require another outline approval round.

## Define the delivery sequence

Choose phases that produce observable capabilities. Prefer vertical slices after any necessary foundation work. Size chunks by a coherent responsibility and its consumers, not a fixed number of files, tests, or agents.

Each chunk records:

- **ID**: a stable chunk identifier.
- **Depends on**: prerequisites implemented and appropriately verified in the working state. Require a merge only for a real external dependency, not between every local chunk.
- **Contract**: governing requirements/spec paths and IDs; state/transition IDs for a governed journey.
- **Work**: concrete affected areas and behavior changes.
- **Done when**: observable acceptance criteria and proportional verification.
- **Out of scope**: exclusions needed to prevent likely expansion.

Use [write-tests](../write-tests/SKILL.md) for test value, verification ownership, and evidence reuse. A chunk does not require a new test, a suite run, or a commit merely to complete its checklist. Distinguish required checks from recommendations and permitted omissions. Focused browser verification follows task/repository policy and explicit skips; do not invent a browser requirement for non-UI work.

For user journeys, use the authoritative YAML contract, with explicit supported recovery/exits and storyboard intent when present. Do not invent transitions to make chunking convenient. Capture needed contract changes as work before implementation. Keep deferred features in later scope.

## Hand back

Save a dependency-ordered plan with an initial Next up marker, meaningful defaults, unresolved decisions, and each chunk's completion criteria. Use a compact coverage map when it prevents requirements being lost. Dependencies must be acyclic and satisfiable within the intended workflow.

Separate local implementation completion from external publication/rollout. Preserve existing authorization, and identify any genuine external prerequisite at the stage where it matters. An ordinary plan does not create a host goal or automation.

Report the path, sequence, first executable chunk, and material assumptions. Use `run-implementation-plan` or `run-implementation-plan-all` when the original or current request authorizes execution.
