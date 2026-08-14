/** @vitest-environment jsdom */

import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { SpecEstate } from "../specs/model";
import { loadSpecEstate } from "../specs/estate";
import { FeatureView, featureHref } from "./feature";
import { readSessionToken } from "./session";

const FIXTURE_ROOT = resolve(import.meta.dirname, "../../test/fixtures/spec-estate");
let estate: SpecEstate;

describe("Feature view", () => {
  beforeAll(async () => {
    estate = await loadSpecEstate(FIXTURE_ROOT);
  });

  beforeEach(() => {
    window.history.replaceState({}, "", "/?token=feature-token");
    readSessionToken();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the contract in canonical order with blockers and relationships", () => {
    const spec = estate.specs.find((item) => item.id === "billing-invoices-invoice-delivery");
    if (!spec) throw new Error("Invoice Delivery fixture was not parsed.");

    render(<FeatureView estate={estate} selection={{}} sources={[]} spec={spec} />);

    expect(screen.getByRole("heading", { name: /^Invoice Delivery$/u })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Send by email" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Retry an invalid address" })).toBeVisible();
    expect(screen.getByText("Blocked")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Invariants" })).toBeVisible();
    expect(screen.getByRole("table")).toHaveTextContent("Correction required");
    expect(screen.getByRole("heading", { name: "Questions" })).toBeVisible();
    const relationship = screen.getByRole("link", { name: /Case Routing Case routing/u });
    expect(relationship).toHaveAttribute("href", featureHref("support-cases-case-routing"));
    fireEvent.click(screen.getByRole("link", { name: "Case routing" }));
    expect(window.location.hash).toBe("#/feature/support-cases-case-routing");
  });

  it("explores YAML-owned states and transition evidence with behaviour links", () => {
    const spec = estate.specs.find((item) => item.id === "billing-invoices-invoice-delivery");
    if (!spec) throw new Error("Invoice Delivery fixture was not parsed.");

    const { rerender } = render(
      <FeatureView estate={estate} selection={{ flow: "F1" }} sources={[]} spec={spec} />,
    );
    expect(screen.getByRole("link", { name: /screen Ready to Send ready/u })).toBeVisible();
    expect(screen.getByRole("link", { name: /terminal Delivered delivered/u })).toBeVisible();
    expect(
      screen.getByRole("link", { name: /F1.T2 Ready to Send Correction Required Send B2a/u }),
    ).toHaveAttribute("href", featureHref(spec.id, { flow: "F1", transition: "F1.T2" }));

    rerender(
      <FeatureView
        estate={estate}
        selection={{ flow: "F1", transition: "F1.T2" }}
        sources={[]}
        spec={spec}
      />,
    );
    const detail = screen.getByRole("region", { name: "F1.T2 details" });
    expect(detail).toHaveTextContent("The address is invalid.");
    expect(within(detail).getByRole("link", { name: "B2a" })).toHaveAttribute(
      "href",
      featureHref(spec.id, { behaviour: "B2a" }),
    );
  });

  it("loads source only through a server-issued resource ID", async () => {
    const user = userEvent.setup();
    const spec = estate.specs.find((item) => item.id === "billing-invoices-invoice-delivery");
    if (!spec) throw new Error("Invoice Delivery fixture was not parsed.");
    const fetchMock = vi.fn(async () => new Response("# Invoice Delivery\n\nBounded source."));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FeatureView
        estate={estate}
        selection={{}}
        sources={[{ id: "server-issued-id", path: spec.path }]}
        spec={spec}
      />,
    );
    const sourceTrigger = screen.getByRole("button", { name: "Open spec source" });
    await user.click(sourceTrigger);

    expect(await screen.findByText(/# Invoice Delivery/u)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/source/server-issued-id", {
      headers: { "X-CalmCraft-Token": "feature-token" },
    });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close source evidence" });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(sourceTrigger).toHaveFocus();
  });

  it("keeps healthy sections visible around a malformed behaviour", () => {
    const spec = estate.specs.find((item) => item.id === "support-cases-case-routing");
    if (!spec) throw new Error("Case Routing fixture was not parsed.");

    render(<FeatureView estate={estate} selection={{}} sources={[]} spec={spec} />);

    expect(screen.getByRole("region", { name: "Feature findings" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Route a complete case" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Keep healthy behaviour after the error" }),
    ).toBeVisible();
  });
});
