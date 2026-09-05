---
name: conventions-revisit
description: Review recorded convention defaults, enforcement, exceptions, and drift. Use when revisiting standards; proposes evidence-backed changes without editing code or configuration.
---

# Revisit Conventions

Review recorded standards and propose changes without editing configuration or code. Read `.engineering/conventions.yaml`, actual enforcement, and representative current code.

Look for:

- Defaults that now govern substantial code and merit a deliberate decision.
- Ambient/documented rules that existing tooling can enforce.
- Decisions marked enforced whose recorded formatter, compiler, lint, or CI mechanism is missing or disabled.
- Excessive legacy allowances, long-lived warning severity, or inconsistent enforcement.
- Differences between the recorded decision and its implementation, including unrecorded but consistent conventions.

Use concrete examples/counts where they help establish impact. A violated default is evidence to investigate, not proof the default is wrong. Preserve deliberate exceptions and assess whether drift comes from incomplete migration, changed intent, or configuration.

When outputs have an owning generator, investigate its source and workflow. When they are maintained directly, propose an ordinary config/documentation correction; do not demand nonexistent regeneration or infer authorship from a mismatch.

For possible new enforcement, verify support in the repository's tool version before recommending it. Do not enable controls or run full gates here. Reuse existing evidence under [write-tests](../write-tests/SKILL.md).

Report each decision, evidence, impact, and proposed next action. Prioritize useful reductions in manual work, preserve decided/defaulted history, and leave execution to an authorized conventions change or migration.
