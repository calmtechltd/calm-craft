import { resolve } from "node:path";
import { expand, loadStackConfig } from "./config";
import { checkoutIdentity, slotStatus, StackAlreadyRunningError } from "./ports";
import { startStack, type StackIo } from "./runner";

export type StackArguments = {
  command: "dev-all";
  config: string;
  status: boolean;
  reset: boolean;
};
export function parseStackArguments(args: string[]): StackArguments {
  const parsed: StackArguments = {
    command: "dev-all",
    config: ".engineering/dev.yaml",
    status: false,
    reset: false,
  };
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--status") parsed.status = true;
    else if (args[i] === "--reset-slot") parsed.reset = true;
    else if (args[i] === "--config") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("--config requires a YAML path.");
      parsed.config = value;
    } else throw new Error("Unknown dev-all option. Use --config, --status or --reset-slot.");
  }
  if (parsed.status && parsed.reset) throw new Error("Choose --status or --reset-slot.");
  return parsed;
}
export async function runStackCommand(
  args: StackArguments,
  io: StackIo,
  signal?: AbortSignal,
): Promise<number> {
  const root = process.cwd();
  const config = await loadStackConfig(resolve(root, args.config));
  if (args.status || args.reset) {
    const state = await slotStatus(config, checkoutIdentity(root), args.reset);
    if (args.reset) io.stdout("This checkout's inactive slot assignment was reset.\n");
    else if (!state) io.stdout("No slot assigned yet. Run calmcraft dev-all.\n");
    else {
      io.stdout(
        `${config.project}: slot ${state.slot} (${state.running ? "running" : "stopped"})\n`,
      );
      io.stdout(
        `Ports: ${Object.entries(state.ports)
          .map(([key, port]) => `${key}=${port}`)
          .join(" ")}\n`,
      );
      for (const [key, service] of Object.entries(config.services))
        io.stdout(
          `${key}: ${new URL(expand(service.ready.url, state.ports)).origin}${service.shared ? " (shared)" : ""}\n`,
        );
    }
    return 0;
  }
  try {
    const session = await startStack(config, root, io, signal);
    return session.closed;
  } catch (error) {
    if (!(error instanceof StackAlreadyRunningError)) throw error;
    io.stdout(
      `${config.project}: already running or starting in slot ${error.slot}. No second stack started.\n`,
    );
    for (const [key, service] of Object.entries(config.services))
      io.stdout(
        `${key}: ${new URL(expand(service.ready.url, error.ports)).origin}${service.shared ? " (shared)" : ""}\n`,
      );
    return 0;
  }
}
