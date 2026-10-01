// These tests poll running processes and serialize fixture ownership.
/* eslint-disable no-await-in-loop */
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, describe, expect, it } from "vitest";
import { validateStackConfig, expand, type StackConfig } from "./config";
import {
  reserveSlot,
  availablePort,
  checkoutIdentity,
  slotStatus,
  type Checkout,
  type Reservation,
} from "./ports";
import { startStack, type StackSession } from "./runner";
import { parseCliArguments } from "../cli/arguments";

const temporary: string[] = [];
const reservations: Reservation[] = [];
const sessions: StackSession[] = [];
afterEach(async () => {
  await Promise.all(sessions.splice(0).map((s) => s.close()));
  await Promise.all(reservations.splice(0).map((r) => r.release()));
  await Promise.all(temporary.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});
async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "calmcraft-stack-"));
  temporary.push(path);
  return realpath(path);
}
function config(): StackConfig {
  return validateStackConfig({
    version: 1,
    project: "fixture",
    slots: 4,
    ports: { app: { base: 32000 }, inngest: { base: 33000 } },
    services: {
      app: { command: ["node", "app.mjs", "${ports.app}"], ready: { url: "${urls.app}/" } },
      inngest: {
        command: ["node", "worker.mjs"],
        dependsOn: ["app"],
        ready: { url: "${urls.inngest}/" },
      },
    },
  });
}
function checkout(commonDir: string, name: string): Checkout {
  return {
    commonDir,
    gitDir: name === "primary" ? commonDir : join(commonDir, "worktrees", name),
    primary: name === "primary",
  };
}
const check = async () => true;
const own = async (c: StackConfig, at: Checkout) => {
  const r = await reserveSlot(c, at, { check });
  reservations.push(r);
  return r;
};
describe("CalmCraft dev-all", () => {
  it("B1 rejects overlapping ranges, cycles and unknown wiring before commands run", () => {
    const c = config();
    expect(expand("${urls.inngest}/api?app=${ports.app}", { app: 3101, inngest: 8390 })).toBe(
      "http://localhost:8390/api?app=3101",
    );
    expect(() =>
      validateStackConfig({ ...c, ports: { app: { base: 32000 }, inngest: { base: 32001 } } }),
    ).toThrow(/overlap/u);
    expect(() =>
      validateStackConfig({
        ...c,
        services: { ...c.services, app: { ...c.services.app, dependsOn: ["inngest"] } },
      }),
    ).toThrow(/cycle/u);
    expect(() =>
      validateStackConfig({
        ...c,
        services: { ...c.services, app: { ...c.services.app, command: ["node", "${urls.typo}"] } },
      }),
    ).toThrow(/Unknown port/u);
    expect(parseCliArguments(["dev-all", "--config", "stack.yaml", "--status"])).toMatchObject({
      command: "dev-all",
      config: "stack.yaml",
      status: true,
    });
    expect(() => parseCliArguments(["dev-all", "--status", "--reset-slot"])).toThrow(/Choose/u);
  });
  it("B2 remembers primary and worktree slots regardless of restart order", async () => {
    const directory = await root(),
      c = config();
    const primary = await own(c, checkout(directory, "primary"));
    const a = await own(c, checkout(directory, "a"));
    const b = await own(c, checkout(directory, "b"));
    expect([primary.slot, a.slot, b.slot]).toEqual([0, 1, 2]);
    await Promise.all([a.release(), b.release(), primary.release()]);
    expect((await own(c, checkout(directory, "b"))).ports).toEqual(b.ports);
    expect((await own(c, checkout(directory, "a"))).ports).toEqual(a.ports);
    expect((await own(c, checkout(directory, "primary"))).ports).toEqual(primary.ports);
  });
  it("B2 fails a remembered port conflict and a duplicate launcher without moving the slot", async () => {
    const directory = await root(),
      c = config(),
      at = checkout(directory, "a");
    const r = await own(c, at);
    await expect(reserveSlot(c, at, { check })).rejects.toThrow(/already running/u);
    await r.release();
    await expect(
      reserveSlot(c, at, { check: async (port) => port !== r.ports.app }),
    ).rejects.toThrow(/slot has not changed/u);
    expect((await own(c, at)).slot).toBe(r.slot);
  });
  it("B2 allocates simultaneous worktrees distinctly and recovers a dead or reused PID lease", async () => {
    const directory = await root(),
      c = config();
    const [a, b, d] = await Promise.all([
      own(c, checkout(directory, "a")),
      own(c, checkout(directory, "b")),
      own(c, checkout(directory, "d")),
    ]);
    expect(new Set([a.slot, b.slot, d.slot]).size).toBe(3);
    await a.release();
    await writeFile(
      join(directory, "dev-all", "fixture", `lease-${a.slot}.json`),
      JSON.stringify({ pid: process.pid, started: "a previous process start", token: "stale" }),
    );
    expect((await own(c, checkout(directory, "a"))).slot).toBe(a.slot);
  });
  it("B3 leaves no lease when environment loading fails", async () => {
    const directory = await root();
    execFileSync("git", ["init", "-q", directory]);
    await mkdir(join(directory, ".env"));
    await expect(
      startStack(config(), directory, { stdout: () => {}, stderr: () => {} }),
    ).rejects.toThrow(/Cannot read environment/u);
    await expect(
      readFile(join(directory, ".git", "dev-all", "fixture", "lease-0.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("B3 cancels startup, closes its child and releases its lease", async () => {
    const directory = await root();
    execFileSync("git", ["init", "-q", directory]);
    let base = 35000;
    while (!(await availablePort(base))) base++;
    await writeFile(
      join(directory, "waiting.mjs"),
      `import {createServer} from 'node:http'; createServer((_req,res)=>{res.statusCode=503;res.end();}).listen(Number(process.argv[2]));`,
    );
    const c = validateStackConfig({
      version: 1,
      project: "cancel",
      slots: 1,
      ports: { app: { base } },
      services: {
        app: {
          command: ["node", "waiting.mjs", "${ports.app}"],
          ready: { url: "${urls.app}/", timeoutMs: 5000 },
        },
      },
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300);
    try {
      await expect(
        startStack(c, directory, { stdout: () => {}, stderr: () => {} }, controller.signal),
      ).rejects.toThrow(/cancelled|did not become ready/u);
      expect(await availablePort(base)).toBe(true);
      await expect(
        readFile(join(directory, ".git", "dev-all", "cancel", "lease-0.json")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      clearTimeout(timer);
    }
  });
  it("B2/B3 runs real linked checkouts together and retains their URLs across restarts", async () => {
    const directory = await root();
    const primary = join(directory, "primary"),
      linked = join(directory, "linked");
    execFileSync("git", ["init", "-q", primary]);
    execFileSync("git", [
      "-C",
      primary,
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-qm",
      "fixture",
      "--allow-empty",
    ]);
    execFileSync("git", ["-C", primary, "worktree", "add", "-q", "--detach", linked]);
    let base = 36000;
    while (!(await availablePort(base)) || !(await availablePort(base + 1))) base += 2;
    const source = `import {createServer} from 'node:http'; createServer((_req,res)=>res.end(process.cwd())).listen(Number(process.argv[2]));`;
    await Promise.all([primary, linked].map((path) => writeFile(join(path, "app.mjs"), source)));
    const c = validateStackConfig({
      version: 1,
      project: "linked",
      slots: 2,
      ports: { app: { base } },
      services: {
        app: {
          command: ["node", "app.mjs", "${ports.app}"],
          ready: { url: "${urls.app}/", timeoutMs: 5000 },
        },
      },
    });
    const io = { stdout: () => {}, stderr: () => {} };
    // Allocate the linked checkout first: slot zero must still belong to primary.
    const b = await startStack(c, linked, io);
    sessions.push(b);
    const a = await startStack(c, primary, io);
    sessions.push(a);
    expect([a.ports.app, b.ports.app]).toEqual([base, base + 1]);
    expect(checkoutIdentity(linked).commonDir).toBe(checkoutIdentity(primary).commonDir);
    await expect(slotStatus(c, checkoutIdentity(linked), true)).rejects.toThrow(/Stop/u);
    await expect(startStack(c, linked, io)).rejects.toThrow(/already running/u);
    await a.close();
    expect(await (await fetch(`http://localhost:${b.ports.app}`)).text()).toBe(linked);
    const restarted = await startStack(c, primary, io);
    sessions.push(restarted);
    expect(restarted.ports).toEqual(a.ports);
    await b.close();
    expect(await slotStatus(c, checkoutIdentity(linked))).toMatchObject({
      slot: 1,
      running: false,
    });
    await slotStatus(c, checkoutIdentity(linked), true);
    expect(await slotStatus(c, checkoutIdentity(linked))).toBeNull();
    expect(await (await fetch(`http://localhost:${restarted.ports.app}`)).text()).toBe(primary);
  }, 15000);
  it("B3 stops an owned descendant when its command wrapper exits during startup", async () => {
    const directory = await root();
    execFileSync("git", ["init", "-q", directory]);
    let base = 37000;
    while (!(await availablePort(base))) base++;
    await writeFile(
      join(directory, "descendant.mjs"),
      `import {createServer} from 'node:http'; createServer((_req,res)=>res.end()).listen(Number(process.argv[2]),()=>process.send('listening'));`,
    );
    await writeFile(
      join(directory, "wrapper.mjs"),
      `import {fork} from 'node:child_process'; const child=fork('descendant.mjs', [process.argv[2]]); child.once('message',()=>process.exit(23));`,
    );
    const c = validateStackConfig({
      version: 1,
      project: "descendants",
      slots: 1,
      ports: { app: { base } },
      services: {
        app: {
          command: ["node", "wrapper.mjs", "${ports.app}"],
          ready: { url: "${urls.app}/", timeoutMs: 5000 },
        },
      },
    });
    try {
      const session = await startStack(c, directory, { stdout: () => {}, stderr: () => {} });
      sessions.push(session);
      expect(await session.closed).toBe(1);
    } catch (error) {
      expect(String(error)).toMatch(/stopped unexpectedly|did not become ready|cancelled/u);
    }
    expect(await availablePort(base)).toBe(true);
    expect(await slotStatus(c, checkoutIdentity(directory))).toMatchObject({ running: false });
  }, 10000);
  it("B3 releases its lease after a missing dependency command fails to spawn", async () => {
    const directory = await root();
    execFileSync("git", ["init", "-q", directory]);
    let base = 38000;
    while (!(await availablePort(base))) base++;
    const c = validateStackConfig({
      version: 1,
      project: "missing",
      slots: 1,
      ports: { app: { base } },
      services: {
        app: {
          command: [join(directory, "missing-command")],
          ready: { url: "${urls.app}/", timeoutMs: 5000 },
        },
      },
    });
    const errors: string[] = [];
    await expect(
      startStack(c, directory, { stdout: () => {}, stderr: (message) => errors.push(message) }),
    ).rejects.toThrow(/could not start/u);
    expect(errors).toEqual([]);
    expect(await slotStatus(c, checkoutIdentity(directory))).toMatchObject({ running: false });
    expect(await availablePort(base)).toBe(true);
  });
  it("B4 wires multiple services, reloads only the app, preserves shared services and cleans up after a crash", async () => {
    const directory = await root();
    execFileSync("git", ["init", "-q", directory]);
    let base = 34000;
    while (
      !(await availablePort(base)) ||
      !(await availablePort(base + 1)) ||
      !(await availablePort(base + 2))
    )
      base += 3;
    const shared = createServer((_request, response) => response.end("shared"));
    await new Promise<void>((resolve) => shared.listen(base + 2, resolve));
    try {
      await writeFile(join(directory, ".env"), "TEST_VALUE=before\nREMOVED_KEY=before\n");
      await writeFile(
        join(directory, "service.mjs"),
        `import {createServer} from 'node:http';
createServer((req,res)=>{if(req.url==='/crash'){res.end();setTimeout(()=>process.exit(22),20);return;}res.setHeader('content-type','application/json');res.end(JSON.stringify({pid:process.pid,value:process.env.TEST_VALUE,removed:process.env.REMOVED_KEY,app:process.env.APP_URL,worker:process.env.WORKER_URL}));}).listen(Number(process.argv[2]));`,
      );
      const c = validateStackConfig({
        version: 1,
        project: "integration",
        slots: 1,
        ports: {
          app: { base },
          worker: { base: base + 1 },
          shared: { base: base + 2, shared: true },
        },
        services: {
          shared: { shared: true, ready: { url: "${urls.shared}/" } },
          app: {
            command: ["node", "service.mjs", "${ports.app}"],
            dependsOn: ["shared"],
            reloadEnv: true,
            env: { APP_URL: "${urls.app}", WORKER_URL: "${urls.worker}" },
            ready: { url: "${urls.app}/", timeoutMs: 5000 },
          },
          worker: {
            command: ["node", "service.mjs", "${ports.worker}"],
            dependsOn: ["app"],
            ready: { url: "${urls.worker}/", timeoutMs: 5000 },
          },
        },
      });
      const output: string[] = [];
      const session = await startStack(c, directory, {
        stdout: (text) => output.push(text),
        stderr: (text) => output.push(text),
      });
      sessions.push(session);
      const appUrl = `http://localhost:${base}`,
        workerUrl = `http://localhost:${base + 1}`;
      const initial = await (await fetch(appUrl)).json(),
        worker = await (await fetch(workerUrl)).json();
      expect(initial).toMatchObject({
        value: "before",
        removed: "before",
        app: appUrl,
        worker: workerUrl,
      });
      await writeFile(join(directory, ".env"), "TEST_VALUE=after\n");
      let fresh = initial;
      for (let i = 0; i < 50; i++) {
        await delay(100);
        try {
          fresh = await (await fetch(appUrl)).json();
          if (fresh.value === "after") break;
        } catch {
          /* app is restarting */
        }
      }
      expect(fresh).toMatchObject({ value: "after", app: appUrl });
      expect(fresh.removed).toBeUndefined();
      expect(fresh.pid).not.toBe(initial.pid);
      expect((await (await fetch(workerUrl)).json()).pid).toBe(worker.pid);
      await fetch(`${appUrl}/crash`);
      expect(await session.closed).toBe(1);
      expect(await (await fetch(`http://localhost:${base + 2}`)).text()).toBe("shared");
      await expect(fetch(workerUrl)).rejects.toThrow();
      const state = JSON.parse(
        await readFile(join(directory, ".git", "dev-all", "integration", "slots.json"), "utf8"),
      );
      expect(Object.values(state.assignments)).toEqual([0]);
      expect(output.join("")).not.toContain("TEST_VALUE=");
    } finally {
      await new Promise<void>((resolve) => shared.close(() => resolve()));
    }
  }, 15000);
});
