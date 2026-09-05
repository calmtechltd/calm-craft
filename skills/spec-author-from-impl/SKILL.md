---
name: spec-author-from-impl
description: Document a scoped existing feature from its implementation and current verification evidence. Use to backfill specs without changing product code, adding tests, or inventing intended behavior.
---

# Author a Spec From Existing Behavior

Document what the feature actually does. Use the repository's format policy and [packaged format](../../references/spec-format.md) where applicable. Keep product code and tests unchanged.

Trace scoped entry points, callers, permission boundaries, jobs, and user-visible outcomes. Read relevant existing assertions and available verification evidence. Translate implementation into behavior, rules, and decision cases; do not transcribe function names as requirements.

Apply [write-tests](../write-tests/SKILL.md) before treating absent automation as a gap. An implemented badge requires complete behavior and appropriate current evidence under repository policy, which may be automated, static, or observed browser verification. Reuse evidence and state its limitations. Missing required evidence is a gap; an explicit no-test decision is not proof the behavior works. Do not create tests or run full suites merely to backfill badges.

Record suspicious behavior accurately and raise the question of intent rather than silently speccing an imagined fix. Describe disagreements between paths and unresolved requirements. Keep unimplemented possibilities as future work only when supported by the supplied scope or actual design, not guesses about what the code could do.

For an existing stateful journey, trace its real navigation, guards, recovery, and exits. Write the factual YAML contract first and generate the Mermaid view. Include questionable transitions with an Open Question; do not hide them or introduce target-state storyboard intent. Improving the captured journey is a separate requested design action.

Report spec paths, behavior statuses, evidence gaps, suspicious outcomes, and genuine open questions. New and changed stable IDs must remain coherent with the existing estate.
