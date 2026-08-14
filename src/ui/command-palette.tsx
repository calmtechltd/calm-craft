import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import type { BranchReview } from "../diff/model";
import type { SpecEstate } from "../specs/model";
import { atlasHref } from "./atlas-route";
import { featureHref } from "./feature";
import { buildHealthItems, healthHref } from "./health";
import { CloseIcon, SearchIcon } from "./icons";
import { reviewHref } from "./review-route";

export type CommandAction = {
  id: string;
  group: "Views" | "Features" | "Filters" | "Findings";
  title: string;
  detail: string;
  href: string;
};

const GROUP_ORDER: Record<CommandAction["group"], number> = {
  Views: 0,
  Filters: 1,
  Features: 2,
  Findings: 3,
};

export function commandPaletteActions(estate: SpecEstate, review?: BranchReview): CommandAction[] {
  const modules = [...new Set(estate.specs.map((spec) => spec.module))].toSorted();
  const actions: CommandAction[] = [
    {
      id: "view-atlas",
      group: "Views",
      title: "Open Atlas",
      detail: "Browse the estate",
      href: atlasHref(),
    },
    {
      id: "view-review",
      group: "Views",
      title: "Open Branch Review",
      detail: "Inspect branch intent",
      href: reviewHref(),
    },
    {
      id: "view-health",
      group: "Views",
      title: "Open Health",
      detail: "Inspect findings",
      href: healthHref(),
    },
    {
      id: "filter-blockers",
      group: "Filters",
      title: "Atlas · Has blockers",
      detail: "Filter unfinished decisions",
      href: atlasHref({ blockers: true }),
    },
    {
      id: "filter-findings",
      group: "Filters",
      title: "Atlas · Has findings",
      detail: "Filter contract issues",
      href: atlasHref({ findings: true }),
    },
    {
      id: "filter-changed",
      group: "Filters",
      title: "Atlas · Changed here",
      detail: "Filter worktree changes",
      href: atlasHref({ changed: true }),
    },
    {
      id: "filter-future",
      group: "Filters",
      title: "Atlas · Future",
      detail: "Filter future specifications",
      href: atlasHref({ status: "future" }),
    },
    {
      id: "filter-partial",
      group: "Filters",
      title: "Atlas · Partial",
      detail: "Filter partial specifications",
      href: atlasHref({ status: "partial" }),
    },
  ];

  for (const module of modules) {
    actions.push({
      id: `filter-module-${module}`,
      group: "Filters",
      title: `Atlas · ${module}`,
      detail: "Filter by module",
      href: atlasHref({ module }),
    });
  }
  for (const spec of estate.specs) {
    actions.push({
      id: `feature-${spec.id}`,
      group: "Features",
      title: spec.title,
      detail: `${spec.id} · ${spec.module}`,
      href: featureHref(spec.id),
    });
  }
  for (const item of buildHealthItems(estate, review)) {
    actions.push({
      id: `finding-${item.key}`,
      group: "Findings",
      title: item.finding.message,
      detail: `${item.finding.code} · ${item.finding.path}`,
      href: healthHref({ finding: item.key }),
    });
  }
  return actions.toSorted(
    (left, right) =>
      GROUP_ORDER[left.group] - GROUP_ORDER[right.group] || left.title.localeCompare(right.title),
  );
}

function searchableAction(action: CommandAction): string {
  return `${action.group} ${action.title} ${action.detail}`.toLocaleLowerCase();
}

export function CommandPalette({
  estate,
  onClose,
  review,
}: {
  estate: SpecEstate;
  onClose: () => void;
  review?: BranchReview;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase());
  const actions = useMemo(() => commandPaletteActions(estate, review), [estate, review]);
  const visible = useMemo(
    () =>
      (deferredQuery
        ? actions.filter((action) => searchableAction(action).includes(deferredQuery))
        : actions
      ).slice(0, 80),
    [actions, deferredQuery],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, visible.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter" && visible[activeIndex]) {
      event.preventDefault();
      window.location.hash = visible[activeIndex].href;
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>("input, button, a") ?? []),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();
      first.focus();
    }
  };

  let previousGroup: CommandAction["group"] | undefined;
  return (
    <div className="command-backdrop" role="presentation">
      <div
        aria-label="Command palette"
        aria-modal="true"
        className="command-palette"
        onKeyDown={handleKeyDown}
        ref={dialogRef}
        role="dialog"
      >
        <header>
          <label>
            <SearchIcon />
            <span className="sr-only">Search commands</span>
            <input
              aria-activedescendant={
                visible[activeIndex] ? `command-${visible[activeIndex].id}` : undefined
              }
              aria-autocomplete="list"
              aria-controls="command-results"
              aria-expanded="true"
              aria-label="Search commands"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Go to a view, feature, filter, or finding…"
              ref={inputRef}
              role="combobox"
              value={query}
            />
          </label>
          <button aria-label="Close command palette" onClick={onClose} type="button">
            <CloseIcon />
          </button>
        </header>
        <div aria-live="polite" className="command-count">
          {visible.length} commands
        </div>
        <div className="command-results" id="command-results" role="listbox">
          {visible.map((action, index) => {
            const showGroup = action.group !== previousGroup;
            previousGroup = action.group;
            return (
              <div key={action.id}>
                {showGroup ? <p>{action.group}</p> : null}
                <a
                  aria-selected={index === activeIndex}
                  href={action.href}
                  id={`command-${action.id}`}
                  onClick={onClose}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                >
                  <span>
                    <strong>{action.title}</strong>
                    <small>{action.detail}</small>
                  </span>
                  <kbd>↵</kbd>
                </a>
              </div>
            );
          })}
          {visible.length === 0 ? (
            <div className="command-empty">
              <strong>No matching command</strong>
              <span>Try a feature ID, finding code, or view name.</span>
            </div>
          ) : null}
        </div>
        <footer>
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </footer>
      </div>
    </div>
  );
}
