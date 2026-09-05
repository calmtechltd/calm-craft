---
name: ask-questions
description: Surface consequential open decisions in the current task and ask through the host's available question tools. Use when asked for questions or when necessary facts remain unresolved; reuse settled decisions and authorized defaults.
---

# Ask Questions

Find consequential unresolved decisions in the current task and ask only what cannot be established from the conversation, authoritative requirements, or repository evidence.

## Find decisions

Read the current conversation and relevant plan/spec. Inspect the task-owned diff only when the request concerns that work; do not turn unrelated changes into questions. Resolve the comparison base from repository configuration or the actual remote default, not hardcoded main/master. Include task-owned uncommitted files when appropriate.

A question should identify a real fork and how its answer changes the result. Drop settled decisions, trivia, out-of-scope hypotheticals, and questions with only one credible answer. If the user authorized defaults, use reasonable defaults and record consequential assumptions. Do not invent uncertainty to fill a quota.

## Use the available host

Inspect callable tools and active mode. Use a supported structured or asynchronous question tool when available; obey its actual limits on question count, options, and selection. Do not switch modes unless the host supports it and the session permits it. A Plan-only tool is unavailable in Default mode even if its name is visible.

Otherwise ask a concise plain-text question consistent with the host's instructions. Do not stall waiting for a particular tool or make up unavailable multi-select support.

Batch related questions within the actual tool schema. Each question is self-contained, with distinguishable alternatives and their consequences. Recommend an option only when justified. Use free text for a missing fact instead of inventing plausible dates, customers, or numbers. Do not add an Other option when the UI provides it.

Ask optional questions without blocking independent work. When an answer is required, pause only dependent actions; elapsed time is not permission. Honor the user's request to ask at the end or proceed with defaults unless a necessary authorization or missing fact prevents safe execution.

## Record answers

Apply answers within the existing task scope, and update the governing plan or spec when a durable decision belongs there. Do not treat answering a design question as permission to publish or start unrelated work. Keep the hand-back to decisions made, material defaults, and remaining blockers. If nothing is unresolved, say so without a questionnaire.
