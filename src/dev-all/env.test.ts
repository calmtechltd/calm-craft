/**
 * Regression — watcher failures must go through owned-process cleanup.
 * Bug (2026-10-01): a filesystem error during polling escaped the timer callback,
 * leaving detached services alive. B3/B4 require a failed reload to stop the stack.
 * This test makes polling fail after a successful baseline and asserts delivery
 * to the runner's error handler without leaking the filesystem error's contents.
 */
import { statSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { watchEnvironment } from "./env";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, statSync: vi.fn(actual.statSync) };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("B4 reports a polling failure so the stack can stop its owned services", () => {
  vi.useFakeTimers();
  const failed = vi.fn();
  const changed = vi.fn();
  const stop = watchEnvironment("/nonexistent-calmcraft-fixture", [".env"], changed, failed);
  vi.mocked(statSync).mockImplementationOnce(() => {
    throw Object.assign(new Error("private filesystem details"), { code: "EACCES" });
  });
  try {
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    expect(failed).toHaveBeenCalledExactlyOnceWith();
    vi.advanceTimersByTime(1000);
    expect(changed).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledTimes(1);
  } finally {
    stop();
  }
});
