/**
 * Regression — repeated cancellation must finish owned-process cleanup.
 * Bug (2026-10-01): the bridge can forward a terminal signal already received by
 * the CLI. A once-only listener lets that second signal terminate the runner
 * while detached services are still shutting down. B3 requires cleanup to finish.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { availablePort } from "./ports";

it("B3 completes cleanup after a second signal while a service ignores SIGTERM", async () => {
  const directory = await mkdtemp(join(tmpdir(), "calmcraft-cancel-"));
  const candidates = Array.from({ length: 16 }, (_, index) => 39000 + index);
  const availability = await Promise.all(candidates.map(availablePort));
  const port = candidates.find((_, index) => availability[index]);
  if (!port) throw new Error("No free cancellation fixture port.");
  const cli = fileURLToPath(new URL("../cli/index.ts", import.meta.url));
  const loader = createRequire(import.meta.url).resolve("tsx");
  const git = spawn("git", ["init", "-q", directory]);
  await once(git, "close");
  await writeFile(
    join(directory, "app.mjs"),
    `import {createServer} from 'node:http'; process.on('SIGTERM',()=>{}); createServer((_req,res)=>res.end(String(process.pid))).listen(${port});`,
  );
  await writeFile(
    join(directory, "dev.yaml"),
    JSON.stringify({
      version: 1,
      project: "signals",
      slots: 1,
      ports: { app: { base: port } },
      services: {
        app: { command: ["node", "app.mjs"], ready: { url: "${urls.app}/", timeoutMs: 5000 } },
      },
    }),
  );
  const child = spawn(
    process.execPath,
    ["--import", loader, cli, "dev-all", "--config", "dev.yaml"],
    { cwd: directory, stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  const completion = once(child, "exit");
  let servicePid: number | undefined;
  try {
    let output = "";
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Fixture startup timed out.")), 8000);
      child.stdout.on("data", (data) => {
        output += String(data);
        if (output.includes("All services ready")) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once("exit", () => {
        clearTimeout(timer);
        reject(new Error("Fixture runner exited before readiness."));
      });
    });
    servicePid = Number(await (await fetch(`http://localhost:${port}`)).text());
    child.kill("SIGTERM");
    await delay(150);
    child.kill("SIGTERM");
    expect(await completion).toEqual([0, null]);
    expect(await availablePort(port)).toBe(true);
  } finally {
    if (servicePid) {
      try {
        process.kill(-servicePid, "SIGKILL");
      } catch {
        /* already stopped */
      }
    }
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await completion;
    await rm(directory, { recursive: true, force: true });
  }
}, 15000);
