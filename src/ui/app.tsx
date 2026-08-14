import { useEffect, useMemo, useState } from "react";

import type { SpecDocument } from "../specs/model";
import { CALMCRAFT_VERSION } from "../meta";
import { Atlas } from "./atlas";
import { FeatureView, type FeatureSelection } from "./feature";
import { AtlasIcon, BranchIcon, HealthIcon, MoonIcon, SunIcon } from "./icons";
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
  window.location.hash = `/feature/${encodeURIComponent(spec.id)}`;
}

type AppRoute = { view: "atlas" } | { view: "feature"; id: string; selection: FeatureSelection };

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
  if (segments[0] !== "feature" || !segments[1]) return { view: "atlas" };
  const id = decodeRouteSegment(segments[1]);
  if (!id) return { view: "atlas" };
  const parameters = new URLSearchParams(query);
  return {
    view: "feature",
    id,
    selection: {
      behaviour:
        segments[2] === "behaviour" && segments[3] ? decodeRouteSegment(segments[3]) : undefined,
      flow: parameters.get("flow") ?? undefined,
      state: parameters.get("state") ?? undefined,
      transition: parameters.get("transition") ?? undefined,
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
  const snapshot = session.mode === "estate" ? session.snapshot : undefined;
  const [route, setRoute] = useState<AppRoute>(() => parseAppRoute(window.location.hash));

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

  const health = useMemo(() => {
    const findings = snapshot?.estate.findings ?? [];
    const errors = findings.filter((finding) => finding.severity === "error").length;
    return { findings: findings.length, errors };
  }, [snapshot]);

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
  const selectedSpec =
    route.view === "feature"
      ? snapshot.estate.specs.find((spec) => spec.id === route.id)
      : undefined;

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
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
            aria-current={route.view === "atlas" ? "page" : undefined}
            className={`nav-item ${route.view === "atlas" ? "active" : ""}`}
            href="#/atlas"
          >
            <AtlasIcon />
            <span>Atlas</span>
            <kbd>A</kbd>
          </a>
          <button className="nav-item" disabled type="button">
            <BranchIcon />
            <span>Branch Review</span>
            <small>Soon</small>
          </button>
          <button className="nav-item" disabled type="button">
            <HealthIcon />
            <span>Health</span>
            <small>{health.findings}</small>
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className={`health-summary ${health.errors > 0 ? "has-errors" : ""}`}>
            <span aria-hidden="true" className="health-dot" />
            <span>
              <strong>
                {health.errors > 0 ? `${health.errors} contract errors` : "Session healthy"}
              </strong>
              <small>{health.findings} total findings</small>
            </span>
          </div>
          <span className="version">Local · v{CALMCRAFT_VERSION}</span>
        </div>
      </aside>

      <div className="workspace">
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
          <div className="topbar-actions">
            <span className="privacy-label">
              <i aria-hidden="true" /> Private to this machine
            </span>
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
            worktreeEntries={repository.worktreeEntries}
          />
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
