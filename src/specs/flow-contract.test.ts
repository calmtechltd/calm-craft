import { describe, expect, it } from "vitest";

import { parseFlowContract } from "./flow-contract";

const STORYBOARDED_FLOW = `version: 1
flows:
  - id: F1
    name: Review
    start: ready
    states:
      - id: ready
        kind: screen
        label: Ready
        storyboard:
          user_goal: Check the work before submitting it.
          enters_with: A complete draft.
          sees: The draft, warnings, and the expected result.
          primary_transition: F1.T1
          feedback: Validation appears beside the field that needs attention.
          preserves: The complete draft and valid corrections.
          accessibility: Focus enters on the review heading and errors link to their fields.
      - id: done
        kind: terminal
        label: Done
        outcome: The review finishes.
        storyboard:
          user_goal: Confirm that submission succeeded.
          enters_with: A submitted draft.
          sees: The result and the next available action.
          feedback: Success is announced without relying on colour.
          preserves: The submitted record and its audit history.
          accessibility: Focus enters on the result heading.
    transitions:
      - id: F1.T1
        from: ready
        event: Submit
        to: done
        covers: [B1]
`;

describe("flow contract storyboards", () => {
  it("normalizes durable scene details and their primary transition", () => {
    const contract = parseFlowContract(STORYBOARDED_FLOW);

    expect(contract.flows[0]?.states[0]?.storyboard).toEqual({
      userGoal: "Check the work before submitting it.",
      entersWith: "A complete draft.",
      sees: "The draft, warnings, and the expected result.",
      primaryTransition: "F1.T1",
      feedback: "Validation appears beside the field that needs attention.",
      preserves: "The complete draft and valid corrections.",
      accessibility: "Focus enters on the review heading and errors link to their fields.",
    });
  });

  it("rejects a storyboard whose primary action is not an outgoing transition", () => {
    const invalid = STORYBOARDED_FLOW.replace(
      "primary_transition: F1.T1",
      "primary_transition: F1.T9",
    );

    expect(() => parseFlowContract(invalid)).toThrow(
      "F1.ready storyboard primary_transition must reference an outgoing transition.",
    );
  });

  it("requires every user-visible state once a flow adopts storyboards", () => {
    const incomplete = STORYBOARDED_FLOW.replace(
      /\n        storyboard:\n          user_goal: Confirm[\s\S]*?result heading\./u,
      "",
    );

    expect(() => parseFlowContract(incomplete)).toThrow(
      "F1.done needs storyboard details because this flow is storyboarded.",
    );
  });

  it("rejects a primary action on a terminal storyboard", () => {
    const invalid = STORYBOARDED_FLOW.replace(
      "user_goal: Confirm that submission succeeded.",
      "user_goal: Confirm that submission succeeded.\n          primary_transition: F1.T1",
    );

    expect(() => parseFlowContract(invalid)).toThrow(
      "F1.done terminal storyboard cannot have a primary_transition.",
    );
  });
});
