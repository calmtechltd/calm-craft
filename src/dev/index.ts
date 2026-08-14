import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { createServer, type ViteDevServer } from "vite";

import { redactSensitiveText } from "../git";
import { CALMCRAFT_VERSION } from "../meta";
import type { LocalSession } from "../server";
import { parseCliArguments, type ViewArguments } from "../cli/arguments";
import { openBrowser, type BrowserOpener } from "../cli/browser";
import { startViewCommand, type CliIo } from "../cli/command";

export type DevelopmentArguments = {
  view: ViewArguments;
  uiPort?: number;
};

export type DevelopmentSession = {
  url: string;
  backendPort: number;
  uiPort: number;
  closed: Promise<void>;
  close: () => Promise<void>;
};

export type DevelopmentDependencies = {
  browserOpener?: BrowserOpener;
  createViteServer?: typeof createServer;
  io?: CliIo;
  projectRoot?: string;
};

const DEFAULT_IO: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

export const DEVELOPMENT_HELP_TEXT = `CalmCraft development server

Usage:
  pnpm dev -- [path] [options]

Options:
  --diff              Open branch review against an inferred base
  --base <ref>        Compare against an explicit Git base
  --provenance <list> Start with committed, staged, unstaged, and/or untracked work
  --no-open           Print the development URL without opening a browser
  --port <number>     Request the private data-server port
  --ui-port <number>  Request the Vite browser port; the default finds a free port
  --branch <name>     Select a branch for a remote source

The Vite server and private data server bind only to 127.0.0.1. UI hot reload
updates React and CSS changes. Changes to imported CLI, parser, Git, diff, and server
modules restart the development process through tsx watch.
`;

function readPort(value: string | undefined): number {
  const port = Number(value);
  if (!value || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("--ui-port must be an integer from 1 to 65535.");
  }
  return port;
}

export function parseDevelopmentArguments(
  args: string[],
  cwd = process.cwd(),
): DevelopmentArguments | { command: "help" } {
  const developmentArgs = args[0] === "--" ? args.slice(1) : args;
  if (developmentArgs.length === 0)
    return { view: parseCliArguments(["view"], cwd) as ViewArguments };
  if (developmentArgs[0] === "--help" || developmentArgs[0] === "-h") return { command: "help" };

  const cliArgs: string[] = [];
  let uiPort: number | undefined;
  for (let index = 0; index < developmentArgs.length; index += 1) {
    const argument = developmentArgs[index] ?? "";
    if (argument === "--ui-port") {
      uiPort = readPort(developmentArgs[index + 1]);
      index += 1;
    } else {
      cliArgs.push(argument);
    }
  }
  const normalized = cliArgs[0] === "view" ? cliArgs : ["view", ...cliArgs];
  const parsed = parseCliArguments(normalized, cwd);
  if (parsed.command !== "view") throw new Error("Development mode requires the view command.");
  return { view: parsed, uiPort };
}

function listeningPort(server: ViteDevServer): number {
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("CalmCraft could not determine the Vite development port.");
  }
  return address.port;
}

export async function startDevelopmentSession(
  arguments_: DevelopmentArguments,
  dependencies: DevelopmentDependencies = {},
): Promise<DevelopmentSession> {
  const io = dependencies.io ?? DEFAULT_IO;
  const projectRoot = dependencies.projectRoot ?? resolve(import.meta.dirname, "../..");
  let backend: LocalSession | undefined;
  let vite: ViteDevServer | undefined;
  try {
    backend = await startViewCommand(
      { ...arguments_.view, openBrowser: false },
      {
        assetsRoot: resolve(projectRoot, "src/ui"),
        io: { stdout: () => undefined, stderr: io.stderr },
      },
    );
    const backendOrigin = `http://127.0.0.1:${backend.port}`;
    vite = await (dependencies.createViteServer ?? createServer)({
      appType: "spa",
      configFile: false,
      logLevel: "silent",
      plugins: [react()],
      root: resolve(projectRoot, "src/ui"),
      server: {
        allowedHosts: ["127.0.0.1", "localhost"],
        cors: false,
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff",
        },
        host: "127.0.0.1",
        port: arguments_.uiPort,
        strictPort: arguments_.uiPort !== undefined,
        proxy: {
          "/api": {
            changeOrigin: true,
            target: backendOrigin,
          },
        },
      },
    });
    await vite.listen();
    const uiPort = listeningPort(vite);
    const url = `http://127.0.0.1:${uiPort}/?token=${backend.token}`;
    let resolveClosed!: () => void;
    const closed = new Promise<void>((resolvePromise) => {
      resolveClosed = resolvePromise;
    });
    let closing: Promise<void> | undefined;
    const close = (): Promise<void> => {
      closing ??= (async () => {
        try {
          await vite?.close();
        } finally {
          await backend?.close();
          resolveClosed();
        }
      })();
      return closing;
    };

    io.stdout(
      `CalmCraft ${CALMCRAFT_VERSION} development\n${url}\nUI hot reload is active. Press Ctrl+C to stop.\n`,
    );
    if (arguments_.view.openBrowser) {
      try {
        await (dependencies.browserOpener ?? openBrowser)(url);
      } catch (error) {
        await close();
        throw new Error(`Could not open the browser: ${redactSensitiveText(String(error))}`, {
          cause: error,
        });
      }
    }
    return { url, backendPort: backend.port, uiPort, closed, close };
  } catch (error) {
    await vite?.close();
    await backend?.close();
    throw error;
  }
}

export async function runDevelopment(
  args: string[],
  dependencies: DevelopmentDependencies = {},
): Promise<number> {
  const io = dependencies.io ?? DEFAULT_IO;
  let session: DevelopmentSession | undefined;
  const stop = (): void => {
    void session?.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const parsed = parseDevelopmentArguments(args);
    if ("command" in parsed) {
      io.stdout(DEVELOPMENT_HELP_TEXT);
      return 0;
    }
    session = await startDevelopmentSession(parsed, dependencies);
    await session.closed;
    return 0;
  } catch (error) {
    io.stderr(
      `CalmCraft development: ${redactSensitiveText(error instanceof Error ? error.message : String(error))}\nRun pnpm dev -- --help for usage.\n`,
    );
    return 1;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
