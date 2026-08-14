/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import { readSessionToken } from "./session";

describe("browser session bootstrap", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("moves the initial token into tab storage and removes it from the visible URL", () => {
    window.history.replaceState({}, "", "/?token=local-secret#/feature/example");

    expect(readSessionToken()).toBe("local-secret");
    expect(window.location.href).not.toContain("token=");
    expect(window.location.hash).toBe("#/feature/example");
    expect(readSessionToken()).toBe("local-secret");
  });
});
