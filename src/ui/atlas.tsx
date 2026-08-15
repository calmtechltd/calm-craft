import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import type { SpecDocument, SpecEstate, SpecStatus } from "../specs/model";
import type { WorktreeEntry } from "../git/model";
import { atlasHref, type AtlasSelection } from "./atlas-route";
import { ArrowIcon, CloseIcon, SearchIcon } from "./icons";
import { StatusBadge } from "./status";

const PAGE_SIZE = 120;

type AtlasFilters = {
  search: string;
  module: string;
  status: "all" | SpecStatus;
  blockers: boolean;
  findings: boolean;
  changed: boolean;
};

type AtlasProps = {
  estate: SpecEstate;
  worktreeEntries: WorktreeEntry[];
  onOpenSpec: (spec: SpecDocument) => void;
  selection: AtlasSelection;
  selectedId?: string;
};

function blockerCount(spec: SpecDocument): number {
  return new Set(spec.openQuestions.flatMap((question) => question.blocks)).size;
}

function searchableText(spec: SpecDocument): string {
  return [
    spec.title,
    spec.id,
    spec.path,
    spec.module,
    spec.featureArea,
    spec.descriptionMarkdown,
    ...spec.behaviours.flatMap((behaviour) => [behaviour.key, behaviour.title, behaviour.markdown]),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function worktreeSpecPaths(entries: WorktreeEntry[], specsRoot: string): Set<string> {
  const prefix = `${specsRoot.replace(/\/$/u, "")}/`;
  return new Set(
    entries.flatMap((entry) => {
      const paths = [entry.path, entry.originalPath].filter((path): path is string =>
        Boolean(path),
      );
      return paths.map((path) => (path.startsWith(prefix) ? path.slice(prefix.length) : path));
    }),
  );
}

function SpecRow({
  spec,
  changed,
  selected,
  tabIndex,
  onFocus,
  onKeyDown,
  onOpen,
  setButtonRef,
}: {
  spec: SpecDocument;
  changed: boolean;
  selected: boolean;
  tabIndex: number;
  onFocus: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onOpen: () => void;
  setButtonRef: (node: HTMLButtonElement | null) => void;
}) {
  const blockers = blockerCount(spec);
  return (
    <button
      aria-current={selected ? "true" : undefined}
      className="spec-row"
      data-spec-id={spec.id}
      onClick={onOpen}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      ref={setButtonRef}
      tabIndex={tabIndex}
      type="button"
    >
      <span className="spec-identity">
        <span className="spec-title">{spec.title}</span>
        <span className="spec-id">{spec.id}</span>
      </span>
      <StatusBadge status={spec.status} />
      <span className={`metric ${spec.behaviours.length === 0 ? "metric-zero" : ""}`}>
        <strong>{spec.behaviours.length}</strong>
        <span>behaviours</span>
      </span>
      <span className={`metric ${blockers > 0 ? "metric-alert" : "metric-zero"}`}>
        <strong>{blockers}</strong>
        <span>blockers</span>
      </span>
      <span className={`metric ${spec.findings.length > 0 ? "metric-alert" : "metric-zero"}`}>
        <strong>{spec.findings.length}</strong>
        <span>findings</span>
      </span>
      <span className="row-tail">
        {changed ? <span className="changed-marker">Changed</span> : null}
        <ArrowIcon className="row-arrow" />
      </span>
    </button>
  );
}

export function Atlas({ estate, worktreeEntries, onOpenSpec, selection, selectedId }: AtlasProps) {
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [focusIndex, setFocusIndex] = useState(0);
  const [searchDraft, setSearchDraft] = useState(selection.search ?? "");
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const changedPaths = useMemo(
    () => worktreeSpecPaths(worktreeEntries, estate.specsRoot),
    [estate.specsRoot, worktreeEntries],
  );
  const modules = useMemo(
    () => [...new Set(estate.specs.map((spec) => spec.module))].toSorted(),
    [estate.specs],
  );
  const filters = useMemo<AtlasFilters>(
    () => ({
      search: searchDraft,
      module: selection.module && modules.includes(selection.module) ? selection.module : "all",
      status: selection.status ?? "all",
      blockers: selection.blockers ?? false,
      findings: selection.findings ?? false,
      changed: selection.changed ?? false,
    }),
    [modules, searchDraft, selection],
  );
  const deferredSearch = useDeferredValue(filters.search.trim().toLocaleLowerCase());
  const filtered = useMemo(() => {
    const result: SpecDocument[] = [];
    for (const spec of estate.specs) {
      if (filters.module !== "all" && spec.module !== filters.module) continue;
      if (filters.status !== "all" && spec.status !== filters.status) continue;
      if (filters.blockers && blockerCount(spec) === 0) continue;
      if (filters.findings && spec.findings.length === 0) continue;
      if (filters.changed && !changedPaths.has(spec.path)) continue;
      if (deferredSearch && !searchableText(spec).includes(deferredSearch)) continue;
      result.push(spec);
    }
    return result.toSorted(
      (left, right) =>
        left.module.localeCompare(right.module) ||
        left.featureArea.localeCompare(right.featureArea) ||
        left.title.localeCompare(right.title),
    );
  }, [changedPaths, deferredSearch, estate.specs, filters]);
  const visible = filtered.slice(0, visibleLimit);
  const groups = useMemo(() => {
    const map = new Map<string, Map<string, SpecDocument[]>>();
    for (const spec of visible) {
      const areas = map.get(spec.module) ?? new Map<string, SpecDocument[]>();
      const specs = areas.get(spec.featureArea) ?? [];
      specs.push(spec);
      areas.set(spec.featureArea, specs);
      map.set(spec.module, areas);
    }
    return map;
  }, [visible]);
  const hasFilters =
    filters.search !== "" ||
    filters.module !== "all" ||
    filters.status !== "all" ||
    filters.blockers ||
    filters.findings ||
    filters.changed;

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
    setFocusIndex(0);
    setSearchDraft(selection.search ?? "");
  }, [selection]);

  const updateFilters = (update: Partial<AtlasFilters>): void => {
    const next = { ...filters, ...update };
    const href = atlasHref({
      search: next.search || undefined,
      module: next.module === "all" ? undefined : next.module,
      status: next.status === "all" ? undefined : next.status,
      blockers: next.blockers || undefined,
      findings: next.findings || undefined,
      changed: next.changed || undefined,
    });
    if (Object.keys(update).length === 1 && update.search !== undefined) {
      setSearchDraft(update.search);
      window.history.replaceState(window.history.state, "", href);
    } else {
      window.location.hash = href;
    }
  };
  const focusRow = (index: number): void => {
    const bounded = Math.max(0, Math.min(index, visible.length - 1));
    setFocusIndex(bounded);
    const spec = visible[bounded];
    if (spec) rowRefs.current.get(spec.id)?.focus();
  };
  const onRowKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusRow(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusRow(visible.length - 1);
    }
  };

  return (
    <main className="atlas" id="main-content">
      <header className="view-heading">
        <h1>Atlas</h1>
        <span className="view-count">
          <strong>{estate.specs.length}</strong> specifications
        </span>
      </header>

      <section aria-label="Atlas controls" className="atlas-controls">
        <label className="search-field">
          <SearchIcon />
          <span className="sr-only">Search specifications</span>
          <input
            aria-label="Search specifications"
            onChange={(event) => updateFilters({ search: event.currentTarget.value })}
            placeholder="Search intent, behaviour, or path…"
            type="search"
            value={filters.search}
          />
        </label>
        <div className="filter-row">
          <label>
            <span>Module</span>
            <select
              aria-label="Filter by module"
              onChange={(event) => updateFilters({ module: event.currentTarget.value })}
              value={filters.module}
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              aria-label="Filter by status"
              onChange={(event) =>
                updateFilters({ status: event.currentTarget.value as AtlasFilters["status"] })
              }
              value={filters.status}
            >
              <option value="all">Every status</option>
              <option value="implemented">Implemented</option>
              <option value="partial">Partial</option>
              <option value="future">Future</option>
            </select>
          </label>
          <button
            aria-pressed={filters.blockers}
            className="filter-toggle"
            onClick={() => updateFilters({ blockers: !filters.blockers })}
            type="button"
          >
            Has blockers
          </button>
          <button
            aria-pressed={filters.findings}
            className="filter-toggle"
            onClick={() => updateFilters({ findings: !filters.findings })}
            type="button"
          >
            Has findings
          </button>
          <button
            aria-pressed={filters.changed}
            className="filter-toggle"
            onClick={() => updateFilters({ changed: !filters.changed })}
            type="button"
          >
            Changed here
          </button>
          {hasFilters ? (
            <button
              className="clear-filters"
              onClick={() =>
                updateFilters({
                  search: "",
                  module: "all",
                  status: "all",
                  blockers: false,
                  findings: false,
                  changed: false,
                })
              }
              type="button"
            >
              <CloseIcon /> Clear
            </button>
          ) : null}
        </div>
      </section>

      <div aria-live="polite" className="result-summary">
        Showing {visible.length} of {filtered.length} matches
        {filtered.length !== estate.specs.length ? ` across ${estate.specs.length} specs` : ""}
      </div>

      {visible.length === 0 ? (
        <section className="empty-state">
          <span aria-hidden="true">∅</span>
          <h2>No specifications match</h2>
          <p>Clear a filter or try a broader phrase. Your repository session is unchanged.</p>
        </section>
      ) : (
        <div className="atlas-groups">
          {[...groups].map(([module, areas]) => (
            <section className="module-group" key={module}>
              <header>
                <h2>{module}</h2>
                <span>{[...areas.values()].reduce((total, specs) => total + specs.length, 0)}</span>
              </header>
              <div aria-hidden="true" className="spec-columns">
                <span>Specification</span>
                <span>Status</span>
                <span>Behaviours</span>
                <span>Blockers</span>
                <span>Findings</span>
                <span />
              </div>
              {[...areas].map(([area, specs]) => (
                <div className="feature-area" key={area}>
                  <div className="feature-area-label">
                    <span>{area}</span>
                    <span className="area-rule" />
                  </div>
                  <div className="spec-list" role="list">
                    {specs.map((spec) => {
                      const index = visible.indexOf(spec);
                      return (
                        <div key={spec.id} role="listitem">
                          <SpecRow
                            changed={changedPaths.has(spec.path)}
                            onFocus={() => setFocusIndex(index)}
                            onKeyDown={(event) => onRowKeyDown(event, index)}
                            onOpen={() => onOpenSpec(spec)}
                            setButtonRef={(node) => {
                              if (node) rowRefs.current.set(spec.id, node);
                              else rowRefs.current.delete(spec.id);
                            }}
                            selected={selectedId === spec.id}
                            spec={spec}
                            tabIndex={focusIndex === index ? 0 : -1}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}

      {visible.length < filtered.length ? (
        <button
          className="load-more"
          onClick={() => setVisibleLimit((limit) => limit + PAGE_SIZE)}
          type="button"
        >
          Show {Math.min(PAGE_SIZE, filtered.length - visible.length)} more
        </button>
      ) : null}
    </main>
  );
}
