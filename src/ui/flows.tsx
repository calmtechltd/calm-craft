import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { Flow, SpecDocument, SpecEstate } from "../specs/model";
import { featureHref } from "./feature";
import { ArrowIcon, SearchIcon } from "./icons";

export type FlowsSelection = {
  search?: string;
  module?: string;
  incomplete?: boolean;
};

/**
 * One mapped journey, joined to the feature that owns it. A flow only means
 * something next to the contract it covers, so the owning spec travels with it.
 */
export type MappedFlow = {
  key: string;
  flow: Flow;
  spec: SpecDocument;
  contractPath: string;
  diagramPath: string;
  covered: number;
  behaviours: number;
};

export function parseFlowsSelection(parameters: URLSearchParams): FlowsSelection {
  const selection: FlowsSelection = {};
  const search = parameters.get("search")?.trim();
  const module = parameters.get("module")?.trim();
  if (search) selection.search = search;
  if (module) selection.module = module;
  if (parameters.get("incomplete") === "1") selection.incomplete = true;
  return selection;
}

export function flowsHref(selection: FlowsSelection = {}): string {
  const parameters = new URLSearchParams();
  if (selection.search) parameters.set("search", selection.search);
  if (selection.module) parameters.set("module", selection.module);
  if (selection.incomplete) parameters.set("incomplete", "1");
  return parameters.size > 0 ? `#/flows?${parameters}` : "#/flows";
}

export function buildMappedFlows(estate: SpecEstate): MappedFlow[] {
  const mapped: MappedFlow[] = [];
  for (const spec of estate.specs) {
    for (const contract of spec.flows) {
      for (const flow of contract.contract.flows) {
        const covered = new Set(flow.transitions.flatMap((transition) => transition.covers));
        mapped.push({
          key: `${spec.id}:${flow.id}`,
          flow,
          spec,
          contractPath: contract.path,
          diagramPath: contract.diagramPath,
          covered: covered.size,
          behaviours: spec.behaviours.length,
        });
      }
    }
  }
  return mapped.toSorted(
    (left, right) =>
      left.spec.module.localeCompare(right.spec.module) ||
      left.spec.title.localeCompare(right.spec.title) ||
      left.flow.id.localeCompare(right.flow.id),
  );
}

function Coverage({ covered, behaviours }: { covered: number; behaviours: number }) {
  const complete = behaviours > 0 && covered >= behaviours;
  const percent = behaviours > 0 ? Math.round((covered / behaviours) * 100) : 0;
  return (
    <span className="coverage">
      <span aria-hidden="true" className="coverage-track">
        <span
          className={`coverage-fill ${complete ? "" : "coverage-partial"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span>
        {covered} / {behaviours}
      </span>
    </span>
  );
}

export function FlowsView({
  estate,
  selection,
}: {
  estate: SpecEstate;
  selection: FlowsSelection;
}) {
  const [searchDraft, setSearchDraft] = useState(selection.search ?? "");
  const mapped = useMemo(() => buildMappedFlows(estate), [estate]);
  const deferredSearch = useDeferredValue(searchDraft.trim().toLocaleLowerCase());
  const modules = useMemo(
    () => [...new Set(mapped.map((item) => item.spec.module))].toSorted(),
    [mapped],
  );
  const visible = useMemo(
    () =>
      mapped.filter((item) => {
        if (selection.module && item.spec.module !== selection.module) return false;
        if (selection.incomplete && item.covered >= item.behaviours) return false;
        if (!deferredSearch) return true;
        return [
          item.flow.id,
          item.flow.name,
          item.spec.title,
          item.spec.module,
          ...item.flow.states.map((state) => state.label),
          ...item.flow.transitions.map((transition) => transition.event),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(deferredSearch);
      }),
    [deferredSearch, mapped, selection.incomplete, selection.module],
  );
  const unmapped = estate.specs.length - new Set(mapped.map((item) => item.spec.id)).size;
  const totals = useMemo(
    () => ({
      states: visible.reduce((count, item) => count + item.flow.states.length, 0),
      transitions: visible.reduce((count, item) => count + item.flow.transitions.length, 0),
    }),
    [visible],
  );

  useEffect(() => {
    setSearchDraft(selection.search ?? "");
  }, [selection.search]);

  const update = (next: Partial<FlowsSelection>): void => {
    const updated = { ...selection, search: searchDraft || undefined, ...next };
    const href = flowsHref(updated);
    if (Object.keys(next).length === 1 && Object.hasOwn(next, "search")) {
      setSearchDraft(next.search ?? "");
      window.history.replaceState(window.history.state, "", href);
    } else {
      window.location.hash = href;
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, MappedFlow[]>();
    for (const item of visible) {
      const list = map.get(item.spec.module) ?? [];
      list.push(item);
      map.set(item.spec.module, list);
    }
    return map;
  }, [visible]);

  return (
    <main className="flows-view" id="main-content">
      <header className="view-heading">
        <h1>Flows</h1>
        <span className="view-count">
          <strong>{mapped.length}</strong> mapped {mapped.length === 1 ? "journey" : "journeys"}
        </span>
      </header>

      <section aria-label="Flow controls" className="flows-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search journeys</span>
          <input
            aria-label="Search journeys"
            onChange={(event) => update({ search: event.currentTarget.value || undefined })}
            placeholder="Search journeys, states, or events…"
            type="search"
            value={searchDraft}
          />
        </label>
        <select
          aria-label="Filter journeys by module"
          onChange={(event) => update({ module: event.currentTarget.value || undefined })}
          value={selection.module ?? ""}
        >
          <option value="">All modules</option>
          {modules.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </select>
        <button
          aria-pressed={selection.incomplete ?? false}
          className="filter-toggle"
          onClick={() => update({ incomplete: !selection.incomplete || undefined })}
          type="button"
        >
          Incomplete coverage
        </button>
      </section>

      <div aria-live="polite" className="result-summary">
        Showing {visible.length} of {mapped.length} journeys · {totals.states} states ·{" "}
        {totals.transitions} transitions
      </div>

      {mapped.length === 0 ? (
        <section className="empty-state">
          <span aria-hidden="true">∅</span>
          <h2>No journeys are mapped</h2>
          <p>
            A feature maps a journey by adding a flow contract beside its spec and referencing it
            under User Flows.
          </p>
        </section>
      ) : visible.length === 0 ? (
        <section className="empty-state compact">
          <span aria-hidden="true">∅</span>
          <h2>No journeys match</h2>
          <p>Clear a filter or try a broader phrase.</p>
        </section>
      ) : (
        <div className="flow-groups">
          {[...grouped].map(([module, items]) => (
            <section className="module-group" key={module}>
              <header>
                <h2>{module}</h2>
                <span>{items.length}</span>
              </header>
              <div aria-hidden="true" className="flow-columns">
                <span>Journey</span>
                <span>Owning feature</span>
                <span>States</span>
                <span>Transitions</span>
                <span>Behaviour coverage</span>
                <span />
              </div>
              <div className="flow-list" role="list">
                {items.map((item) => (
                  <div key={item.key} role="listitem">
                    <a
                      className="flow-row"
                      data-flow-key={item.key}
                      href={featureHref(item.spec.id, { flow: item.flow.id })}
                    >
                      <span className="flow-identity">
                        <span className="flow-name">{item.flow.name}</span>
                        <span className="flow-id">{item.flow.id}</span>
                      </span>
                      <span className="flow-owner">{item.spec.title}</span>
                      <span className="metric">
                        <strong>{item.flow.states.length}</strong>
                        <span>states</span>
                      </span>
                      <span className="metric">
                        <strong>{item.flow.transitions.length}</strong>
                        <span>transitions</span>
                      </span>
                      <Coverage behaviours={item.behaviours} covered={item.covered} />
                      <ArrowIcon className="row-arrow" />
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {unmapped > 0 ? (
        <p className="flows-note">
          <strong>
            {unmapped} {unmapped === 1 ? "specification has" : "specifications have"} no mapped
            journey.
          </strong>{" "}
          Most do not need one — this is here so you can see which.
        </p>
      ) : null}
    </main>
  );
}
