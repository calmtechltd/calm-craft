import { useEffect, useMemo, useRef, useState } from "react";

import type { SpecDocument } from "../specs/model";
import { CALMCRAFT_VERSION } from "../meta";
import { Atlas } from "./atlas";
import { atlasHref, parseAtlasSelection, type AtlasSelection } from "./atlas-route";
import { BranchChangeDetail } from "./branch-change";
import { BranchReviewNotStarted, BranchReviewView } from "./branch-review";
import { CommandPalette } from "./command-palette";
import { featureHref, FeatureView, type FeatureSelection } from "./feature";
import {
  buildHealthItems,
  healthHref,
  HealthView,
  parseHealthSelection,
  type HealthSelection,
} from "./health";
import { AtlasIcon, BranchIcon, HealthIcon, MoonIcon, SunIcon } from "./icons";
import { parseReviewSelection, reviewHref, type ReviewSelection } from "./review-route";
import type { CalmCraftSession, SessionSourceDescriptor } from "./session";

type Theme = "light" | "dark";

function initialTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = window.localStorage?.getItem("calmcraft.theme") ?? null;
  } catch {
    // A restricted browser may deny local storage; the system theme remains a safe default.
  }
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function repositoryName(root: string): string {
  return (
    root
      .replace(/[\\/]$/u, "")
      .split(/[\\/]/u)
      .at(-1) ?? "repository"
  );
}

function openSpec(spec: SpecDocument): void {
  window.location.hash = featureHref(spec.id);
}

type AppRoute =
  | { view: "atlas"; selection: AtlasSelection }
  | { view: "review"; selection: ReviewSelection }
  | { view: "health"; selection: HealthSelection }
  | { view: "feature"; id: string; selection: FeatureSelection };

function decodeRouteSegment(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export function parseAppRoute(hash: string): AppRoute {
  const [path = "", query = ""] = hash.replace(/^#/u, "").split("?");
  const segments = path.split("/").filter(Boolean);
  const parameters = new URLSearchParams(query);
  if (segments[0] === "atlas") {
    return { view: "atlas", selection: parseAtlasSelection(parameters) };
  }
  if (segments[0] === "review")
    return {
      view: "review",
      selection: parseReviewSelection(segments, parameters),
    };
  if (segments[0] === "health") {
    return { view: "health", selection: parseHealthSelection(segments, parameters) };
  }
  if (segments[0] !== "feature" || !segments[1]) return { view: "atlas", selection: {} };
  const id = decodeRouteSegment(segments[1]);
  if (!id) return { view: "atlas", selection: {} };
  const question = Number(parameters.get("question"));
  return {
    view: "feature",
    id,
    selection: {
      behaviour:
        segments[2] === "behaviour" && segments[3] ? decodeRouteSegment(segments[3]) : undefined,
      flow: parameters.get("flow") ?? undefined,
      state: parameters.get("state") ?? undefined,
      transition: parameters.get("transition") ?? undefined,
      finding: parameters.get("finding") ?? undefined,
      question: Number.isInteger(question) && question > 0 ? question : undefined,
    },
  };
}

export function CalmCraftApp({
  session,
  sources = [],
}: {
  session: CalmCraftSession;
  sources?: SessionSourceDescriptor[];
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const review = session.mode === "review" ? session.review : undefined;
  const snapshot = session.mode === "estate" ? session.snapshot : review?.target;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteReturnFocus = useRef<HTMLElement | null>(null);
  const [route, setRoute] = useState<AppRoute>(() =>
    !window.location.hash && session.mode === "review"
      ? {
          view: "review",
          selection: { provenance: session.initialProvenance, group: "module" },
        }
      : parseAppRoute(window.location.hash),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage?.setItem("calmcraft.theme", theme);
    } catch {
      // Theme persistence is optional when browser storage is restricted.
    }
  }, [theme]);

  useEffect(() => {
    const restore = (): void => setRoute(parseAppRoute(window.location.hash));
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);

  useEffect(() => {
    if (window.location.hash) return;
    const href =
      session.mode === "review"
        ? reviewHref({ provenance: session.initialProvenance, group: "module" })
        : atlasHref();
    window.history.replaceState(window.history.state, "", href);
    setRoute(parseAppRoute(href));
  }, [session]);

  useEffect(() => {
    const openPalette = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== "k") return;
      event.preventDefault();
      paletteReturnFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPaletteOpen(true);
    };
    window.addEventListener("keydown", openPalette);
    return () => window.removeEventListener("keydown", openPalette);
  }, []);

  const closePalette = (): void => {
    setPaletteOpen(false);
    queueMicrotask(() => paletteReturnFocus.current?.focus());
  };

  const health = useMemo(() => {
    const items = snapshot ? buildHealthItems(snapshot.estate, review) : [];
    const errors = items.filter((item) => item.finding.severity === "error").length;
    return { findings: items.length, errors };
  }, [review, snapshot]);

  if (!snapshot) {
    return (
      <div className="unsupported-view" id="main-content">
        <p className="eyebrow">Branch Review</p>
        <h1>The review interface arrives in the next product milestone.</h1>
        <p>The semantic comparison is ready and remains safely available to this session.</p>
      </div>
    );
  }

  const repository = snapshot.repository;
  const repositorySource = session.repositorySource ?? { kind: "local" as const };
  const selectedSpec =
    route.view === "feature"
      ? (snapshot.estate.specs.find((spec) => spec.id === route.id) ??
        review?.baseline?.estate.specs.find((spec) => spec.id === route.id))
      : undefined;
  const reviewNavigationHref =
    route.view === "review"
      ? reviewHref({
          ...route.selection,
          change: undefined,
          sourceDiff: false,
        })
      : reviewHref({
          provenance: session.mode === "review" ? session.initialProvenance : undefined,
          group: "module",
        });

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside aria-hidden={paletteOpen ? true : undefined} className="sidebar">
        <div className="brand">
          <span aria-hidden="true" className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>CalmCraft</strong>
            <small>Spec intelligence</small>
          </span>
        </div>

        <nav aria-label="Primary views">
          <a
            aria-label="Atlas"
            aria-current={route.view === "atlas" ? "page" : undefined}
            className={`nav-item ${route.view === "atlas" ? "active" : ""}`}
            href={route.view === "atlas" ? atlasHref(route.selection) : atlasHref()}
          >
            <AtlasIcon />
            <span>Atlas</span>
            <kbd>A</kbd>
          </a>
          <a
            aria-label="Branch Review"
            aria-current={route.view === "review" ? "page" : undefined}
            className={`nav-item ${route.view === "review" ? "active" : ""}`}
            href={reviewNavigationHref}
          >
            <BranchIcon />
            <span>Branch Review</span>
            <small>{review?.semanticChanges.length ?? "—"}</small>
          </a>
          <a
            aria-label="Health"
            aria-current={route.view === "health" ? "page" : undefined}
            className={`nav-item ${route.view === "health" ? "active" : ""}`}
            href={route.view === "health" ? healthHref(route.selection) : healthHref()}
          >
            <HealthIcon />
            <span>Health</span>
            <small>{health.findings}</small>
          </a>
        </nav>

        <div className="sidebar-foot">
          <a
            className={`health-summary ${health.errors > 0 ? "has-errors" : ""}`}
            href={healthHref()}
          >
            <span aria-hidden="true" className="health-dot" />
            <span>
              <strong>
                {health.errors > 0 ? `${health.errors} contract errors` : "Session healthy"}
              </strong>
              <small>{health.findings} total findings</small>
            </span>
          </a>
          <span className="version">Local · v{CALMCRAFT_VERSION}</span>
        </div>
      </aside>

      <div aria-hidden={paletteOpen ? true : undefined} className="workspace">
        <header className="topbar">
          <div className="repository-identity">
            <span className="repository-monogram" aria-hidden="true">
              {repositoryName(repository.root).slice(0, 2).toLocaleUpperCase()}
            </span>
            <span>
              <strong>{repositoryName(repository.root)}</strong>
              <small title={repository.root}>{snapshot.specsRoot}</small>
            </span>
          </div>
          <span className="branch-identity">
            <BranchIcon />
            {repository.branch ?? `detached · ${repository.head.slice(0, 7)}`}
          </span>
          {repositorySource.kind === "remote" ? (
            <span className="remote-identity" title={repositorySource.displayUrl}>
              Remote · temporary clone
            </span>
          ) : null}
          <div className="topbar-actions">
            <span className="privacy-label">
              <i aria-hidden="true" />
              {repositorySource.kind === "remote"
                ? "Private remote · removed on stop"
                : "Private to this machine"}
            </span>
            <button
              aria-label="Open command palette"
              className="command-trigger"
              onClick={(event) => {
                paletteReturnFocus.current = event.currentTarget;
                setPaletteOpen(true);
              }}
              type="button"
            >
              Search <kbd>⌘ K</kbd>
            </button>
            <button
              aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
              className="theme-toggle"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              type="button"
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
        </header>

        {route.view === "atlas" ? (
          <Atlas
            estate={snapshot.estate}
            onOpenSpec={openSpec}
            selection={route.selection}
            worktreeEntries={repository.worktreeEntries}
          />
        ) : route.view === "review" ? (
          review ? (
            route.selection.change ? (
              <BranchChangeDetail
                initialProvenance={session.mode === "review" ? session.initialProvenance : []}
                review={review}
                selection={route.selection}
                sources={sources}
              />
            ) : (
              <BranchReviewView
                initialProvenance={session.mode === "review" ? session.initialProvenance : []}
                review={review}
                selection={route.selection}
              />
            )
          ) : (
            <BranchReviewNotStarted />
          )
        ) : route.view === "health" ? (
          <HealthView estate={snapshot.estate} review={review} selection={route.selection} />
        ) : selectedSpec ? (
          <FeatureView
            estate={snapshot.estate}
            selection={route.selection}
            sources={sources}
            spec={selectedSpec}
          />
        ) : (
          <main className="route-not-found" id="main-content">
            <p className="eyebrow">Unknown feature</p>
            <h1>This specification is not part of the active estate.</h1>
            <a href="#/atlas">Return to Atlas</a>
          </main>
        )}
      </div>
      {paletteOpen ? (
        <CommandPalette estate={snapshot.estate} onClose={closePalette} review={review} />
      ) : null}
    </div>
  );
}

export function SessionError({ message }: { message: string }) {
  return (
    <main className="session-error" id="main-content">
      <span aria-hidden="true" className="brand-mark large">
        <i />
        <i />
        <i />
      </span>
      <p className="eyebrow">Local session unavailable</p>
      <h1>CalmCraft could not open this estate.</h1>
      <p>{message}</p>
      <p className="error-guidance">
        Return to the terminal, stop this process, and run the command again.
      </p>
    </main>
  );
}
