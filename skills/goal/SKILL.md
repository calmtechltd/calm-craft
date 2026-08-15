---
name: goal
description: "Complete the incomplete behaviours in current scope. Keep working across turns until the run-implementation-plan definition of done is satisfied. Use when the user types /goal, /loop, or pastes a one-line objective such as complete the incomplete behaviours in current scope."
disable-model-invocation: true
---

# Goal

`/goal Complete the incomplete behaviours in current scope. You can confirm this if unsure.`

That is the default objective when I type `/goal` with nothing else. Then follow [`run-implementation-plan`](../run-implementation-plan/SKILL.md) in full — the before-implementation work, the twelve card steps, the definition of done, and the host continuation.

This skill is the slash command. That skill is the loop. Do not duplicate the card steps here.

## When to use

- I typed `/goal` or `/loop`.
- "Complete the incomplete behaviours in current scope."
- I pasted a one-line goal and expect the agent to keep going across turns.

**Not this skill:** writing a plan (`author-implementation-plan`).

## Supplementary text

The words after `/goal` replace or narrow the default objective. Honour them.

A consuming app can also keep a short overlay at `paths.goal` in `.engineering/config.yaml` (default `.engineering/goal.md`). That is the place for command names this portable skill must not hardcode — `db_generate`, `db_migrate`, `checkpoint_commit`, protected migration paths. Read it when it exists. If the slash text and the overlay disagree, the slash text wins for this run.

Do not invent a product decision to fill a gap in either.

## Host continuation

Detect the host from available slash commands, not from guessing.

| Host | Continue with | Stop when |
| --- | --- | --- |
| Cursor | `/loop` on this skill, or `/goal` again | `run-implementation-plan` definition of done |
| Codex and other hosts with `/goal` | `/goal` with the same scope | Same |
| Neither | Keep working in this session | Same |

The interval is **next card**, not a clock. If a checkpoint already exists under `.active/`, resume it.

## Related skills

- `run-implementation-plan` — the loop this command starts
