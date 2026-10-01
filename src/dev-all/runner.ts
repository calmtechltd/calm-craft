// Dependencies, readiness polling and restarts must execute in order.
/* eslint-disable no-await-in-loop, no-unmodified-loop-condition */
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { expand, serviceOrder, type StackConfig, type PortMap } from "./config";
import { readEnvironment, watchEnvironment } from "./env";
import { reserveSlot, checkoutIdentity } from "./ports";

export type StackIo = { stdout: (text: string) => void; stderr: (text: string) => void };
export type StackSession = { ports: PortMap; closed: Promise<number>; close: () => Promise<void> };
const noop = () => {};
function kill(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

/** Run trusted project commands directly, without a shell or automatic port discovery. */
export async function startStack(
  config: StackConfig,
  root: string,
  io: StackIo,
  cancellationSignal?: AbortSignal,
): Promise<StackSession> {
  if (process.platform === "win32")
    throw new Error("dev-all currently supports macOS and Linux process groups.");
  if (cancellationSignal?.aborted) throw new Error("dev-all startup cancelled.");
  const base = { ...process.env };
  for (const key of Object.keys(readEnvironment(root, config.envFiles))) delete base[key];
  const reservation = await reserveSlot(config, checkoutIdentity(root));
  const { ports } = reservation;
  const children = new Map<string, ChildProcess>();
  const owned = new Set<ChildProcess>();
  const expected = new WeakSet<ChildProcess>();
  const completions: Promise<void>[] = [];
  const controller = new AbortController();
  let stopping = false,
    code = 0,
    startupComplete = false,
    cleanupWatch = noop,
    restarting = false,
    restartAgain = false;
  let failure: Error | undefined;
  let resolveClosed!: (code: number) => void;
  const closed = new Promise<number>((resolve) => {
    resolveClosed = resolve;
  });
  async function stopChild(child: ChildProcess): Promise<void> {
    expected.add(child);
    const done = new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) resolve();
      else child.once("close", () => resolve());
    });
    kill(child, "SIGTERM");
    const timeout = setTimeout(() => kill(child, "SIGKILL"), 5000);
    await done;
    clearTimeout(timeout);
    // An exited command wrapper may still have descendants in its owned group.
    kill(child, "SIGKILL");
    owned.delete(child);
  }
  async function close(): Promise<void> {
    if (stopping) {
      await closed;
      return;
    }
    stopping = true;
    controller.abort();
    cleanupWatch();
    try {
      await Promise.all([...owned].map(stopChild));
      await Promise.all(completions);
    } finally {
      cancellationSignal?.removeEventListener("abort", cancel);
      try {
        await reservation.release();
      } finally {
        resolveClosed(code);
      }
    }
  }
  function cancel(): void {
    void close();
  }
  cancellationSignal?.addEventListener("abort", cancel, { once: true });
  if (cancellationSignal?.aborted) cancel();
  function fail(message: string): void {
    if (stopping) return;
    code = 1;
    failure = new Error(message);
    if (startupComplete) io.stderr(`${message}\n`);
    void close();
  }
  function launch(key: string): ChildProcess {
    const service = config.services[key]!;
    const [executable, ...args] = service.command.map((value) => expand(value, ports));
    const child = spawn(executable === "node" ? process.execPath : executable!, args, {
      cwd: root,
      env: {
        ...base,
        ...readEnvironment(root, config.envFiles),
        ...Object.fromEntries(
          Object.entries(service.env).map(([envKey, value]) => [envKey, expand(value, ports)]),
        ),
      },
      stdio: "inherit",
      detached: true,
    });
    children.set(key, child);
    owned.add(child);
    completions.push(new Promise((resolve) => child.once("close", () => resolve())));
    child.once("error", () =>
      fail(`${key} could not start. Check its command and installed dependencies.`),
    );
    child.once("exit", (exitCode, signal) => {
      if (!stopping && !expected.has(child))
        fail(`${key} stopped unexpectedly (${signal ?? `exit ${exitCode}`}). Stopping this stack.`);
    });
    return child;
  }
  async function ready(key: string): Promise<void> {
    const service = config.services[key]!;
    const deadline = Date.now() + service.ready.timeoutMs;
    while (!controller.signal.aborted && Date.now() < deadline) {
      try {
        const response = await fetch(expand(service.ready.url, ports), {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1500)]),
          redirect: "error",
        });
        await response.body?.cancel();
        if (response.ok && !controller.signal.aborted) return;
      } catch {
        /* The service may still be starting. Never log response bodies. */
      }
      await delay(100);
    }
    if (failure) throw failure;
    if (controller.signal.aborted) throw new Error("dev-all startup cancelled.");
    throw new Error(`${key} did not become ready. Check its local logs and configuration.`);
  }
  async function reload(): Promise<void> {
    if (stopping) return;
    if (restarting) {
      restartAgain = true;
      return;
    }
    restarting = true;
    try {
      do {
        restartAgain = false;
        for (const key of serviceOrder(config).filter(
          (serviceKey) =>
            config.services[serviceKey]!.reloadEnv && !config.services[serviceKey]!.shared,
        )) {
          if (stopping) break;
          io.stdout(`Environment changed. Restarting ${key} on its existing port.\n`);
          await stopChild(children.get(key)!);
          if (stopping) break;
          launch(key);
          await ready(key);
        }
      } while (restartAgain && !stopping);
    } catch {
      fail("Environment reload failed. Check local configuration and restart dev-all.");
    } finally {
      restarting = false;
    }
  }
  try {
    io.stdout(`${config.project}: slot ${reservation.slot}\n`);
    io.stdout(
      `Ports: ${Object.entries(ports)
        .map(([key, port]) => `${key}=${port}`)
        .join(" ")}\n`,
    );
    for (const [key, service] of Object.entries(config.services))
      io.stdout(
        `${key}: ${new URL(expand(service.ready.url, ports)).origin}${service.shared ? " (shared)" : ""}\n`,
      );
    for (const key of serviceOrder(config)) {
      if (controller.signal.aborted) throw new Error("dev-all startup cancelled.");
      if (!config.services[key]!.shared) launch(key);
      await ready(key);
    }
    if (controller.signal.aborted) throw new Error("dev-all startup cancelled.");
    cleanupWatch = watchEnvironment(
      root,
      config.envFiles,
      () => void reload(),
      () =>
        fail("Cannot watch local environment files. Check file permissions and restart dev-all."),
    );
    startupComplete = true;
    io.stdout("All services ready. Ctrl+C stops this stack.\n");
    return { ports, closed, close };
  } catch (error) {
    await close();
    throw failure ?? error;
  }
}
