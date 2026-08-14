import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type Server, type ServerResponse } from "node:http";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";

export type SessionSource = {
  path: string;
  content: string;
  mediaType?: string;
  contexts?: string[];
};

export type StartLocalSessionOptions = {
  assetsRoot: string;
  data: unknown;
  sources?: SessionSource[];
  port?: number;
};

export type LocalSession = {
  url: string;
  port: number;
  token: string;
  closed: Promise<void>;
  close: () => Promise<void>;
};

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "media-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

function send(response: ServerResponse, status: number, body: string, mediaType: string): void {
  response.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": mediaType });
  response.end(body);
}

function safeToken(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function cookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function serializeData(data: unknown): string {
  return JSON.stringify(data, function replacer(key, value: unknown) {
    if (["beforeSource", "afterSource", "diagramSource"].includes(key)) return undefined;
    if (
      key === "source" &&
      typeof this === "object" &&
      this !== null &&
      typeof (this as Record<string, unknown>).sourceHash === "string"
    ) {
      return undefined;
    }
    return value;
  });
}

function contentType(path: string): string {
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
    }[extname(path)] ?? "application/octet-stream"
  );
}

function safeAssetPath(assetsRoot: string, requestPath: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return undefined;
  }
  const relativePath = decoded.replace(/^\/+/, "");
  const absolutePath = resolve(assetsRoot, relativePath);
  const fromRoot = relative(resolve(assetsRoot), absolutePath);
  if (
    !relativePath ||
    isAbsolute(relativePath) ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    return undefined;
  }
  return absolutePath;
}

function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolveListen, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("CalmCraft could not determine its loopback port."));
        return;
      }
      resolveListen(address.port);
    });
  });
}

export async function startLocalSession(options: StartLocalSessionOptions): Promise<LocalSession> {
  await readFile(resolve(options.assetsRoot, "index.html"));
  const token = randomBytes(32).toString("base64url");
  const resources = new Map(
    (options.sources ?? []).map(
      (source) => [randomBytes(12).toString("base64url"), source] as const,
    ),
  );
  const sessionPayload = serializeData({
    data: options.data,
    sources: [...resources].flatMap(([id, source]) =>
      source.contexts && source.contexts.length > 0
        ? source.contexts.map((context) => ({ id, path: source.path, context }))
        : [{ id, path: source.path }],
    ),
  });
  let active = true;
  let activePort = 0;
  let resolveClosed!: () => void;
  const closed = new Promise<void>((resolvePromise) => {
    resolveClosed = resolvePromise;
  });

  const server = createServer((request, response) => {
    void (async () => {
      const host = request.headers.host;
      const acceptedHosts = new Set([`127.0.0.1:${activePort}`, `localhost:${activePort}`]);
      if (!host || !acceptedHosts.has(host.toLocaleLowerCase())) {
        send(response, 421, "Untrusted host.", "text/plain; charset=utf-8");
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        send(response, 405, "Method not allowed.", "text/plain; charset=utf-8");
        return;
      }
      const requestUrl = new URL(request.url ?? "/", `http://${host}`);
      const cookieName = `calmcraft_session_${activePort}`;
      const suppliedToken =
        request.headers["x-calmcraft-token"]?.toString() ??
        requestUrl.searchParams.get("token") ??
        cookieValue(request.headers.cookie, cookieName) ??
        undefined;
      const isAsset =
        requestUrl.pathname.startsWith("/assets/") || requestUrl.pathname === "/favicon.svg";
      if (!active || (!isAsset && !safeToken(token, suppliedToken))) {
        send(response, 401, "Session authorization required.", "text/plain; charset=utf-8");
        return;
      }

      if (requestUrl.pathname === "/api/session") {
        send(
          response,
          200,
          request.method === "HEAD" ? "" : sessionPayload,
          "application/json; charset=utf-8",
        );
        return;
      }
      if (requestUrl.pathname.startsWith("/api/source/")) {
        const id = requestUrl.pathname.slice("/api/source/".length);
        const resource = resources.get(id);
        if (!resource) {
          send(response, 404, "Unknown source.", "text/plain; charset=utf-8");
          return;
        }
        send(
          response,
          200,
          request.method === "HEAD" ? "" : resource.content,
          resource.mediaType ?? "text/plain; charset=utf-8",
        );
        return;
      }

      const assetRequest = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
      const assetPath = safeAssetPath(options.assetsRoot, assetRequest);
      if (!assetPath) {
        send(response, 404, "Not found.", "text/plain; charset=utf-8");
        return;
      }
      try {
        const asset = await readFile(assetPath);
        const establishBrowserSession =
          assetRequest === "/index.html" &&
          safeToken(token, requestUrl.searchParams.get("token") ?? undefined);
        response.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": contentType(assetPath),
          ...(establishBrowserSession
            ? {
                "Set-Cookie": `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`,
              }
            : {}),
        });
        response.end(request.method === "HEAD" ? undefined : asset);
      } catch {
        send(response, 404, "Not found.", "text/plain; charset=utf-8");
      }
    })().catch(() => {
      if (!response.headersSent)
        send(response, 500, "Session request failed.", "text/plain; charset=utf-8");
      else response.destroy();
    });
  });

  server.on("close", () => resolveClosed());
  activePort = await listen(server, options.port ?? 0);
  const close = async (): Promise<void> => {
    if (!active) return closed;
    active = false;
    resources.clear();
    const closing = new Promise<void>((resolveClose, reject) => {
      server.close((error) => (error ? reject(error) : resolveClose()));
    });
    server.closeAllConnections();
    await closing;
    return closed;
  };
  return {
    url: `http://127.0.0.1:${activePort}/?token=${token}`,
    port: activePort,
    token,
    closed,
    close,
  };
}
