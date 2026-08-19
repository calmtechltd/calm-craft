---
name: ask-questions
description: Surface the open questions in the current work and put them to the user as structured choices. Use whenever the user says "ask questions", "ask me questions", "what do you need to know", "what's still open", "any open questions?", "quiz me on this", "check with me before you build", or otherwise invites being asked rather than guessed at — mid-design, before implementing, or when the conversation has accumulated unresolved decisions. Also use when the user wants the open questions on the current branch or plan reviewed. Never invents answers or options.
---

# Ask Questions

I have stopped and invited questions. That is an unusual and valuable offer — I'd rather answer three questions now than review the wrong thing later. Spend it on the decisions that actually change the work, and put them as structured choices so answering is a couple of clicks rather than an essay.

Format authority: [`references/spec-format.md`](../../references/spec-format.md). Recording answers: [`spec-maintain-on-ship`](../spec-maintain-on-ship/SKILL.md).

## When to use

- "Ask questions" / "ask me questions" / "what do you need to know?"
- "What's still open?" / "any open questions?" / "check with me before you build."
- Mid-design, before implementing, or when the conversation has accumulated unresolved decisions.
- Open questions on the current branch or plan.

**Not this skill:** estate-wide debt (`spec-gap-sweep` reports; this asks). A fixed convention interview (`conventions-decide`). Inventing a product decision so a queue can keep moving (`run-implementation-plan` already forbids that — this is how you stop and ask instead).

## The one rule that matters

**Never manufacture a question, an option, or a recommendation.**

Every question must trace back to something real: an assumption made silently, a fork in the code with no obvious winner, a spec section marked open, a stub in the diff. Every option must be an answer someone could actually implement — a real file, a real approach, a real trade-off. If a question only has one credible answer, it is not a question; just do it and say so.

Padding the list to look thorough is worse than asking nothing. Three real questions beat eight, and if there is genuinely nothing open, say so plainly and stop.

## 0. Enter a host that can ask

Detect the host from available tools, not from guessing.

| Host | How to ask |
| --- | --- |
| Cursor | Switch to Plan mode first, then `AskQuestion`. Do not call a Plan-only question tool from Default mode. |
| Codex | `request_user_input`. |
| Structured question tool on another host | Use it. |
| None of the above | Present each decision as a numbered list with distinguishable options, answerable in one message — the same fallback as `conventions-decide`. |

Do this automatically; do not make me ask for the switch separately. If the host has no Plan mode, do not stall the workflow waiting for one, and do not turn that limitation into a questionnaire that invents options.

## 1. Find the open questions

Sweep, in this order of value:

**The conversation.** Highest yield, and easy to skip past. Re-read this session for: assumptions stated but never confirmed; things I said in passing that were never resolved; places where a choice was made silently because it was easier to keep moving; requirements that were interpreted one of two ways. Be honest here — the useful questions are usually the ones already guessed at.

**The plan or spec.** If there is a plan file, design doc or feature spec in play (`.active/`, `specs/`, an implementation plan), read its Open Questions section and any chunk marked blocked, deferred or TBD.

**The branch — only when it is this session's work.** A repo often has unrelated work in flight: another agent's uncommitted changes, a finished commit from yesterday, a parallel migration. Questions about those are noise, and worse, they imply ownership of work that isn't in hand. So check first that the branch or working tree is what this session has been building. If it isn't, skip this step and say in one line what was skipped and why.

When it is this session's work, look at what the diff actually contains:

```bash
git diff $(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master) --stat
```

Then read the diff for `TODO`, `FIXME`, `XXX`, hardcoded placeholder values, `it.todo(` / skipped tests, error paths that swallow rather than handle, and config or copy that reads like a first guess. Each of those is a decision someone deferred.

**The gaps.** Cases the code doesn't handle yet and probably should: empty states, permissions, what happens on failure, migration of existing data, multi-tenancy boundaries. Only raise these where the current work makes the answer necessary — not as a general audit.

## 2. Keep only what changes the outcome

Drop a candidate question if:

- The answer would not change any code, copy, or decision — it is trivia.
- The repo already answers it (a convention, an existing pattern, a prior decision in this session). Follow the convention instead.
- It is a judgement call inside a decision I already made — reopening it is second-guessing, not asking.
- It only matters for work beyond what was asked for.

Then rank by blast radius: what blocks the next step, or would be expensive to unpick, goes first. Answers to big questions often dissolve the small ones, so ask in that order.

## 3. Ask them

Up to 4 questions per call, 2–4 options each.

If there are fewer than 4 real questions, ask fewer. Group related decisions into one call so they can be answered together.

If there are more than 4, ask the top 4 — then re-derive the rest from the answers and ask the next round without waiting to be prompted. Answers routinely collapse questions further down the list, so re-derive properly rather than firing the leftovers verbatim; the second round is usually short, and often empty. Keep going until nothing real is left, then start work.

Per question:

- **Header** — ≤12 chars, names the decision: `Scope`, `Storage`, `Copy`, `Rollout`.
- **Question** — self-contained. I may have context-switched away; don't rely on the previous message to make it legible.
- **Options** — real, distinguishable answers. Each needs a description saying what actually happens if picked, including the cost. Don't write four paraphrases of the same choice.
- **Multi-select** when the options genuinely combine (which checks to run, which surfaces to cover). Leave it off for mutually exclusive forks, and phrase the question accordingly.

**Recommendation.** When there is a genuine view, put that option first and append `(Recommended)` to its label, with the reason in its description. When there is no honest favourite — the trade-off is real and depends on something only I know — recommend nothing. A recommendation on every question makes all of them worthless.

**Always leave a way out.** Never ship a question where the recommended option is the only real answer. Alongside it there must be at least one substantive alternative, and where deferring is genuinely viable, offer it explicitly — `Leave as-is for now`, `Ship without it and revisit`, `Your call, I'll pick`. The question UI may append its own **Other** for free-text, so don't write an "Other" option; do make sure the listed options aren't a false binary that pushes me into it.

**When options can't be derived.** If a question is real but has no enumerable answers — it depends on facts not in the repo, a customer, a date, a number — don't invent four plausible-looking options to satisfy the format. Ask it in plain text alongside the structured call, or list what you'd need in order to offer options.

## 4. Close the loop

Once answered:

1. Say back what was decided, in one line each — short enough to catch a misread, so I can correct it before it becomes code.
2. Write decisions down where they belong: resolve the Open Question in the spec via `spec-maintain-on-ship`, update the plan file, note the constraint in the relevant file. Answers that live only in the transcript get lost at the next compaction.
3. Say which questions went unasked and why, if any were dropped for being lower-value — once, briefly.
4. Get on with the work. The point of asking was to unblock, not to produce a questionnaire.

## Scope hints

Invoked bare, the skill sweeps everything above. If I name a scope — "ask questions about the branch", "on the plan", "just the API bit" — restrict the sweep to that and skip the rest.

## Anti-patterns

- **Inventing a product decision** so the queue can keep moving.
- **Asking about a branch this session didn't build.**
- **Padding to four questions** when only one is real.
- **Reopening a choice I already made.**
- **Estate-wide audit** of every Open Question in `specs/` — that is `spec-gap-sweep`.

## Related skills

- `run-implementation-plan` — batch blocking product decisions here before coding
- `author-implementation-plan` — unresolved questions found while chunking
- `spec-author-greenfield` — record Open Questions; this skill asks them
- `spec-maintain-on-ship` — write the answers into the spec
- `spec-gap-sweep` — reports estate-wide open questions; does not ask
- `conventions-decide` — a fixed question bank, not current-work context
