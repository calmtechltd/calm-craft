import type { RepositorySnapshot } from "../git/model";

export type EstateSession = {
  mode: "estate";
  snapshot: RepositorySnapshot;
};

export type ReviewSession = {
  mode: "review";
  review: unknown;
};

export type CalmCraftSession = EstateSession | ReviewSession;

type SessionResponse = {
  data: CalmCraftSession;
  sources: { id: string; path: string }[];
};

const TOKEN_STORAGE_KEY = "calmcraft.session-token";

export function readSessionToken(location = window.location): string | undefined {
  const url = new URL(location.href);
  const supplied = url.searchParams.get("token") ?? undefined;
  if (supplied) {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, supplied);
    url.searchParams.delete("token");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    return supplied;
  }
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? undefined;
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
