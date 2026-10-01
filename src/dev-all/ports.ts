// Slot probes and registry writes are serial to avoid claiming overlapping ports.
/* eslint-disable no-await-in-loop */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename, unlink, rmdir } from "node:fs/promises";
import { createServer } from "node:net";
import { join, resolve as resolvePath } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { slotPorts, type StackConfig, type PortMap } from "./config";
export type Checkout = { gitDir: string; commonDir: string; primary: boolean };
type Owner = { token?: string; pid: number; started: string; gitDir?: string; ports?: PortMap };
type Registry = { version: number; assignments: Record<string, number> };
type Lookup = (pid: number) => string | null;
export type Reservation = { slot: number; ports: PortMap; release: () => Promise<void> };
export class StackAlreadyRunningError extends Error {
  constructor(
    readonly slot: number,
    readonly ports: PortMap,
  ) {
    super(`This checkout's slot ${slot} is already running.`);
  }
}
const errno = (error: unknown) => (error as NodeJS.ErrnoException).code;

export function checkoutIdentity(root: string): Checkout {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_")) delete env[key];
  const git = (flag: string) =>
    execFileSync("git", ["rev-parse", "--path-format=absolute", flag], {
      cwd: root,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  try {
    const gitDir = git("--git-dir"),
      commonDir = git("--git-common-dir");
    return { gitDir, commonDir, primary: resolvePath(gitDir) === resolvePath(commonDir) };
  } catch {
    throw new Error("dev-all needs a Git checkout to remember its worktree slot.");
  }
}
export function processIdentity(pid: number): string | null {
  try {
    return (
      execFileSync("ps", ["-p", String(pid), "-o", "lstart="], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    return null;
  }
}
export async function availablePort(port: number): Promise<boolean> {
  // On macOS wildcard probes can coexist with loopback listeners. Probe both explicitly.
  for (const host of ["127.0.0.1", "::1", "0.0.0.0", "::"]) {
    const result = await new Promise<boolean>((resolve, reject) => {
      const server = createServer();
      server.once("error", (error) => {
        if (errno(error) === "EADDRINUSE" || errno(error) === "EACCES") resolve(false);
        else if (errno(error) === "EAFNOSUPPORT" || errno(error) === "EADDRNOTAVAIL") resolve(true);
        else reject(error);
      });
      server.listen({ port, host, ipv6Only: host === "::" }, () =>
        server.close(() => resolve(true)),
      );
    });
    if (!result) return false;
  }
  return true;
}
async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if (errno(error) === "ENOENT") return fallback;
    throw new Error("Invalid local dev-all state. Preserve it and inspect before resetting.", {
      cause: error,
    });
  }
}
async function saveJson(path: string, data: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
function isLive(owner: Owner | null, lookup: Lookup): boolean {
  return Boolean(
    owner &&
    Number.isInteger(owner.pid) &&
    typeof owner.started === "string" &&
    lookup(owner.pid) === owner.started,
  );
}
async function locked<T>(directory: string, lookup: Lookup, action: () => Promise<T>): Promise<T> {
  await mkdir(directory, { recursive: true });
  const path = join(directory, "lock");
  const deadline = Date.now() + 10000;
  while (true) {
    try {
      await mkdir(path);
      break;
    } catch (error) {
      if (errno(error) !== "EEXIST") throw error;
      const owner = await readJson<Owner | null>(join(path, "owner.json"), null);
      // A creator may be between mkdir and writing its owner; do not reclaim that gap.
      if (owner && !isLive(owner, lookup))
        throw new Error(
          `An interrupted registry write left ${path}. Verify the launcher is stopped and remove that lock directory; remembered slots are preserved.`,
          { cause: error },
        );
      if (Date.now() >= deadline)
        throw new Error(
          "Timed out waiting for the dev-all slot registry. Another launcher may be starting.",
          { cause: error },
        );
      await delay(30);
    }
  }
  try {
    await saveJson(join(path, "owner.json"), { pid: process.pid, started: lookup(process.pid) });
    return await action();
  } finally {
    await unlink(join(path, "owner.json"));
    await rmdir(path);
  }
}
async function registry(directory: string, config: StackConfig): Promise<Registry> {
  const data = await readJson(join(directory, "slots.json"), { version: 1, assignments: {} });
  if (
    data.version !== 1 ||
    !data.assignments ||
    typeof data.assignments !== "object" ||
    Array.isArray(data.assignments)
  )
    throw new Error("Invalid dev-all slot registry.");
  const values = Object.values(data.assignments);
  if (
    values.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= config.slots) ||
    new Set(values).size !== values.length
  )
    throw new Error(
      "Invalid or incompatible remembered slots. Restore the previous slot configuration before resetting.",
    );
  return data;
}
export async function reserveSlot(
  config: StackConfig,
  checkout: Checkout,
  options: { lookup?: Lookup; check?: (port: number) => Promise<boolean> } = {},
): Promise<Reservation> {
  const lookup = options.lookup ?? processIdentity,
    check = options.check ?? availablePort;
  const directory = join(checkout.commonDir, "dev-all", config.project);
  const started = lookup(process.pid);
  if (!started) throw new Error("Cannot identify the dev-all process.");
  return locked(directory, lookup, async () => {
    const data = await registry(directory, config);
    const remembered = data.assignments[checkout.gitDir];
    const candidates =
      remembered !== undefined
        ? [remembered]
        : checkout.primary
          ? [0]
          : Array.from({ length: config.slots - 1 }, (_, i) => i + 1).filter(
              (slot) => !Object.values(data.assignments).includes(slot),
            );
    for (const slot of candidates) {
      const leasePath = join(directory, `lease-${slot}.json`);
      const owner = await readJson<Owner | null>(leasePath, null);
      if (isLive(owner, lookup)) {
        const ports = slotPorts(config, slot);
        if (
          owner!.gitDir !== checkout.gitDir ||
          !owner!.ports ||
          Object.keys(owner!.ports).length !== Object.keys(ports).length ||
          Object.entries(ports).some(([key, port]) => owner!.ports![key] !== port)
        )
          throw new Error(
            "This slot is running with different configuration. Stop its launcher before changing the slot wiring.",
          );
        throw new StackAlreadyRunningError(slot, ports);
      }
      const ports = slotPorts(config, slot);
      let conflict;
      for (const [key, port] of Object.entries(ports))
        if (!config.ports[key]!.shared && !(await check(port))) {
          conflict = `${key} port ${port}`;
          break;
        }
      if (conflict) {
        if (remembered !== undefined || checkout.primary)
          throw new Error(
            `${conflict} is in use. This checkout's slot has not changed; stop its other instance or resolve the port conflict.`,
          );
        continue;
      }
      const token = randomUUID();
      data.assignments[checkout.gitDir] = slot;
      await saveJson(join(directory, "slots.json"), data);
      await saveJson(leasePath, {
        token,
        pid: process.pid,
        started,
        gitDir: checkout.gitDir,
        ports,
      });
      return {
        slot,
        ports,
        release: () =>
          locked(directory, lookup, async () => {
            const current = await readJson<Owner | null>(leasePath, null);
            if (current?.token === token) await unlink(leasePath);
          }),
      };
    }
    throw new Error(
      "No free worktree slot. Stop an instance or use --reset-slot in an unused checkout to release its remembered assignment.",
    );
  });
}
export async function slotStatus(
  config: StackConfig,
  checkout: Checkout,
  reset = false,
): Promise<{ slot: number; ports: PortMap; running: boolean } | null> {
  const directory = join(checkout.commonDir, "dev-all", config.project);
  return locked(directory, processIdentity, async () => {
    const data = await registry(directory, config);
    const slot = data.assignments[checkout.gitDir];
    if (slot === undefined) return null;
    const leasePath = join(directory, `lease-${slot}.json`);
    const owner = await readJson<Owner | null>(leasePath, null),
      running = Boolean(isLive(owner, processIdentity));
    if (reset) {
      if (running) throw new Error("Stop this checkout's dev-all before resetting its slot.");
      delete data.assignments[checkout.gitDir];
      await saveJson(join(directory, "slots.json"), data);
      await unlink(leasePath).catch((error) => {
        if (errno(error) !== "ENOENT") throw error;
      });
    }
    return { slot, ports: slotPorts(config, slot), running };
  });
}
