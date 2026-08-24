import { parse } from "yaml";

import type { Flow, FlowContract, FlowState, FlowStoryboard, FlowTransition } from "./model";

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function readStoryboard(value: unknown, stateId: string): FlowStoryboard {
  assertRecord(value, `${stateId} storyboard`);
  assertString(value.user_goal, `${stateId} storyboard user_goal`);
  assertString(value.enters_with, `${stateId} storyboard enters_with`);
  assertString(value.sees, `${stateId} storyboard sees`);
  if (value.primary_transition !== undefined) {
    assertString(value.primary_transition, `${stateId} storyboard primary_transition`);
  }
  assertString(value.feedback, `${stateId} storyboard feedback`);
  assertString(value.preserves, `${stateId} storyboard preserves`);
  assertString(value.accessibility, `${stateId} storyboard accessibility`);
  return {
    userGoal: value.user_goal,
    entersWith: value.enters_with,
    sees: value.sees,
    primaryTransition: value.primary_transition,
    feedback: value.feedback,
    preserves: value.preserves,
    accessibility: value.accessibility,
  };
}

function readState(value: unknown, flowId: string): FlowState {
  assertRecord(value, `${flowId} state`);
  assertString(value.id, `${flowId} state id`);
  assertString(value.kind, `${flowId}.${value.id} kind`);
  assertString(value.label, `${flowId}.${value.id} label`);
  if (!(["screen", "action", "terminal"] as const).includes(value.kind as FlowState["kind"])) {
    throw new Error(`${flowId}.${value.id} has an unsupported state kind.`);
  }
  if (value.outcome !== undefined) assertString(value.outcome, `${flowId}.${value.id} outcome`);
  return {
    id: value.id,
    kind: value.kind as FlowState["kind"],
    label: value.label,
    outcome: value.outcome,
    storyboard:
      value.storyboard === undefined
        ? undefined
        : readStoryboard(value.storyboard, `${flowId}.${value.id}`),
  };
}

function readTransition(value: unknown, flowId: string): FlowTransition {
  assertRecord(value, `${flowId} transition`);
  assertString(value.id, `${flowId} transition id`);
  assertString(value.from, `${value.id} from`);
  assertString(value.event, `${value.id} event`);
  assertString(value.to, `${value.id} to`);
  if (value.guard !== undefined) assertString(value.guard, `${value.id} guard`);
  if (value.outcome !== undefined) assertString(value.outcome, `${value.id} outcome`);
  if (!Array.isArray(value.covers) || value.covers.length === 0) {
    throw new Error(`${value.id} must cover at least one behaviour.`);
  }
  const covers = value.covers.map((item, index) => {
    assertString(item, `${value.id} covers[${index}]`);
    return item;
  });
  return {
    id: value.id,
    from: value.from,
    event: value.event,
    to: value.to,
    guard: value.guard,
    outcome: value.outcome,
    covers,
  };
}

export function parseFlowContract(source: string): FlowContract {
  const value: unknown = parse(source);
  assertRecord(value, "flow contract");
  if (value.version !== 1) throw new Error("Flow contract version must be 1.");
  if (!Array.isArray(value.flows) || value.flows.length === 0) {
    throw new Error("Flow contract must contain at least one flow.");
  }

  const flowIds = new Set<string>();
  const transitionIds = new Set<string>();
  const flows = value.flows.map((flowValue, flowIndex): Flow => {
    assertRecord(flowValue, `flow[${flowIndex}]`);
    assertString(flowValue.id, `flow[${flowIndex}] id`);
    assertString(flowValue.name, `${flowValue.id} name`);
    assertString(flowValue.start, `${flowValue.id} start`);
    const flowId = flowValue.id;
    const flowName = flowValue.name;
    const flowStart = flowValue.start;
    if (flowIds.has(flowId)) throw new Error(`Duplicate flow id ${flowId}.`);
    flowIds.add(flowId);
    if (!Array.isArray(flowValue.states) || flowValue.states.length === 0) {
      throw new Error(`${flowId} must contain states.`);
    }
    if (!Array.isArray(flowValue.transitions))
      throw new Error(`${flowId} must contain transitions.`);

    const states = flowValue.states.map((state) => readState(state, flowId));
    const stateIds = new Set(states.map((state) => state.id));
    if (stateIds.size !== states.length) throw new Error(`${flowId} has duplicate state ids.`);
    if (!stateIds.has(flowStart)) throw new Error(`${flowId} start state does not exist.`);

    const transitions = flowValue.transitions.map((transition) =>
      readTransition(transition, flowId),
    );
    for (const transition of transitions) {
      if (transitionIds.has(transition.id))
        throw new Error(`Duplicate transition id ${transition.id}.`);
      transitionIds.add(transition.id);
      if (!transition.id.startsWith(`${flowId}.T`)) {
        throw new Error(`${transition.id} must use the ${flowId}.T<n> prefix.`);
      }
      if (!stateIds.has(transition.from) || !stateIds.has(transition.to)) {
        throw new Error(`${transition.id} references an unknown state.`);
      }
    }

    for (const state of states) {
      const outgoing = transitions.filter((transition) => transition.from === state.id);
      if (state.kind === "terminal" && outgoing.length > 0) {
        throw new Error(`${flowId}.${state.id} is terminal and has an outgoing transition.`);
      }
      if (state.kind !== "terminal" && outgoing.length === 0) {
        throw new Error(`${flowId}.${state.id} has no outgoing transition.`);
      }
      if (state.kind === "terminal" && !state.outcome) {
        throw new Error(`${flowId}.${state.id} needs a user-visible outcome.`);
      }
      if (state.kind === "terminal" && state.storyboard?.primaryTransition) {
        throw new Error(
          `${flowId}.${state.id} terminal storyboard cannot have a primary_transition.`,
        );
      }
      if (state.storyboard?.primaryTransition) {
        if (!outgoing.some((transition) => transition.id === state.storyboard?.primaryTransition)) {
          throw new Error(
            `${flowId}.${state.id} storyboard primary_transition must reference an outgoing transition.`,
          );
        }
      } else if (state.storyboard && state.kind === "screen") {
        throw new Error(`${flowId}.${state.id} storyboard needs a primary_transition.`);
      }
    }

    const hasStoryboard = states.some((state) => state.storyboard !== undefined);
    if (hasStoryboard) {
      const missingStoryboard = states.find(
        (state) =>
          (state.kind === "screen" || state.kind === "terminal") && state.storyboard === undefined,
      );
      if (missingStoryboard) {
        throw new Error(
          `${flowId}.${missingStoryboard.id} needs storyboard details because this flow is storyboarded.`,
        );
      }
    }

    const reachable = new Set([flowStart]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const transition of transitions) {
        if (reachable.has(transition.from) && !reachable.has(transition.to)) {
          reachable.add(transition.to);
          changed = true;
        }
      }
    }
    const unreachable = states.find((state) => !reachable.has(state.id));
    if (unreachable) throw new Error(`${flowId}.${unreachable.id} is unreachable.`);

    return { id: flowId, name: flowName, start: flowStart, states, transitions };
  });

  return { version: 1, flows };
}
