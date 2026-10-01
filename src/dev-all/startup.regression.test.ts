/**
 * Regression — repeat Run must not launch into an occupied localhost port.
 * Bug (2026-10-01): Vite failed on an existing ::1 listener, then the runner
 * blamed Inngest readiness. Repeating Run also treated an owned stack as an error.
 * Root cause: wildcard probes miss IPv6 loopback listeners on macOS; duplicate
 * leases were ordinary errors, and startup aborts lost the original child failure.
 * These tests require loopback conflict detection, idempotent CLI startup and
 * reporting the failed child rather than a secondary readiness timeout.
 * Spec context: dev-all B2/B3.
 */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { validateStackConfig, type StackConfig } from "./config";
import { availablePort } from "./ports";
import { runStackCommand } from "./index";
import { startStack, type StackSession } from "./runner";

const directories: string[] = [];
const sessions: StackSession[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(sessions.splice(0).map((session) => session.close()));
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});
async function fixture(): Promise<{ root: string; config: StackConfig }> {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-startup-regression-"));
  directories.push(root);
  execFileSync("git", ["init", "-q", root]);
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "localhost", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  const config = validateStackConfig({
    version: 1,
    project: "regression",
    slots: 1,
    ports: { app: { base: port } },
    services: {
      app: {
        command: ["node", "app.mjs", "${ports.app}"],
        ready: { url: "${urls.app}/", timeoutMs: 3000 },
      },
    },
  });
  await writeFile(join(root, "dev.yaml"), JSON.stringify(config));
  return { root, config };
}
it("detects an existing IPv6 loopback listener before spawning services", async () => {
  const { root, config } = await fixture();
  const server = createServer((_request, response) => response.end("existing"));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.ports.app!.base, "::1", resolve);
  });
  const port = (server.address() as { port: number }).port;
  try {
    expect(await availablePort(port)).toBe(false);
    const output: string[] = [];
    await expect(
      startStack(config, root, {
        stdout: (message) => output.push(message),
        stderr: (message) => output.push(message),
      }),
    ).rejects.toThrow(/app port .* is in use/u);
    expect(output).toEqual([]);
    expect(await (await fetch(`http://[::1]:${port}`)).text()).toBe("existing");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
it("repeating Run reports the owned stack and leaves the same process running", async () => {
  const { root, config } = await fixture();
  await writeFile(
    join(root, "app.mjs"),
    `import {createServer} from 'node:http';createServer((_req,res)=>res.end(String(process.pid))).listen(Number(process.argv[2]),'localhost');`,
  );
  const session = await startStack(config, root, { stdout: () => {}, stderr: () => {} });
  sessions.push(session);
  const url = `http://localhost:${session.ports.app}`;
  const pid = await (await fetch(url)).text();
  vi.spyOn(process, "cwd").mockReturnValue(root);
  const output: string[] = [];
  await expect(
    runStackCommand(
      { command: "dev-all", config: "dev.yaml", status: false, reset: false },
      { stdout: (message) => output.push(message), stderr: () => {} },
    ),
  ).resolves.toBe(0);
  expect(output.join("")).toContain("already running");
  expect(output.join("")).toContain(url);
  expect(await (await fetch(url)).text()).toBe(pid);
});
it("retains the child's startup failure instead of blaming service readiness", async () => {
  const { root, config } = await fixture();
  await writeFile(join(root, "app.mjs"), "process.exit(23);");
  await expect(startStack(config, root, { stdout: () => {}, stderr: () => {} })).rejects.toThrow(
    /app stopped unexpectedly \(exit 23\)/u,
  );
  expect(await availablePort(config.ports.app!.base)).toBe(true);
});
