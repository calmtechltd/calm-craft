import type { RepositorySnapshot } from "../git/model";
import type { BranchReview, Provenance } from "../diff/model";

export type EstateSession = {
  mode: "estate";
  snapshot: RepositorySnapshot;
};

export type ReviewSession = {
  mode: "review";
  review: BranchReview;
  initialProvenance: Provenance[];
};

export type CalmCraftSession = EstateSession | ReviewSession;

export type SessionSourceDescriptor = { id: string; path: string };

export type SessionResponse = {
  data: CalmCraftSession;
  sources: SessionSourceDescriptor[];
};

const TOKEN_STORAGE_KEY = "calmcraft.session-token";
let activeToken: string | undefined;

function storedToken(): string | undefined {
  try {
    return window.sessionStorage?.getItem(TOKEN_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function readSessionToken(location = window.location): string | undefined {
  const url = new URL(location.href);
  const supplied = url.searchParams.get("token") ?? undefined;
  if (supplied) {
    activeToken = supplied;
    try {
      window.sessionStorage?.setItem(TOKEN_STORAGE_KEY, supplied);
    } catch {
      // The in-memory token still supports this tab when browser storage is restricted.
    }
    url.searchParams.delete("token");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    return supplied;
  }
  activeToken ??= storedToken();
  return activeToken;
}

export async function loadSession(): Promise<SessionResponse> {
  const token = readSessionToken();
  if (!token) throw new Error("This CalmCraft session is missing its local access token.");
  const response = await fetch("/api/session", {
    headers: { "X-CalmCraft-Token": token },
  });
  if (!response.ok) throw new Error(`The local CalmCraft session returned ${response.status}.`);
  return (await response.json()) as SessionResponse;
}

export async function loadSessionSource(id: string): Promise<string> {
  const token = activeToken ?? storedToken();
  if (!token) throw new Error("This source request has no active local session token.");
  const response = await fetch(`/api/source/${encodeURIComponent(id)}`, {
    headers: { "X-CalmCraft-Token": token },
  });
  if (!response.ok) throw new Error(`The source resource returned ${response.status}.`);
  return response.text();
}
