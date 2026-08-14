import { request } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { startLocalSession, type LocalSession } from "./index";

const roots: string[] = [];
const sessions: LocalSession[] = [];

async function assets(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-assets-"));
  roots.push(root);
  await mkdir(join(root, "assets"));
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><script src="/assets/app.js"></script>',
  );
  await writeFile(join(root, "assets/app.js"), "globalThis.calmcraftLoaded = true;");
  return root;
}

async function session(port?: number): Promise<LocalSession> {
  const created = await startLocalSession({
    assetsRoot: await assets(),
    data: {
      title: "Fixture",
      base: { source: "conventional" },
      document: {
        path: "specs/fixture.md",
        sourceHash: "fixture-hash",
        source: "must not appear in JSON",
      },
    },
    sources: [{ path: "specs/fixture.md", content: "bounded source" }],
    port,
  });
  sessions.push(created);
  return created;
}

function requestWithHost(url: URL, host: string): Promise<{ status: number; body: string }> {
  return new Promise((resolveRequest, reject) => {
    const outgoing = request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        headers: { Host: host },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolveRequest({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    outgoing.on("error", reject);
    outgoing.end();
  });
}

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((active) => active.close()));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("loopback session server", () => {
  it("requires host and token authorization while serving self-contained assets with CSP", async () => {
    const active = await session();
    const sessionUrl = new URL(active.url);
    const initial = await fetch(active.url);
    const asset = await fetch(`http://127.0.0.1:${active.port}/assets/app.js`);
    const missingToken = await fetch(`http://127.0.0.1:${active.port}/api/session`);
    const untrustedHost = await requestWithHost(sessionUrl, `attacker.example:${active.port}`);

    expect(initial.status).toBe(200);
    expect(initial.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(initial.headers.get("x-content-type-options")).toBe("nosniff");
    expect(asset.status).toBe(200);
    expect(missingToken.status).toBe(401);
    expect(untrustedHost).toEqual({ status: 421, body: "Untrusted host." });
  });

  it("returns sanitized session data and only known server-issued sources", async () => {
    const active = await session();
    const response = await fetch(
      `http://127.0.0.1:${active.port}/api/session?token=${active.token}`,
    );
    const payload = (await response.json()) as {
      data: Record<string, unknown>;
      sources: Array<{ id: string; path: string }>;
    };

    expect(payload.data).toEqual({
      title: "Fixture",
      base: { source: "conventional" },
      document: { path: "specs/fixture.md", sourceHash: "fixture-hash" },
    });
    expect(JSON.stringify(payload)).not.toContain("must not appear");
    expect(payload.sources).toEqual([expect.objectContaining({ path: "specs/fixture.md" })]);
    const source = await fetch(
      `http://127.0.0.1:${active.port}/api/source/${payload.sources[0]?.id}?token=${active.token}`,
    );
    expect(await source.text()).toBe("bounded source");
    const unknown = await fetch(
      `http://127.0.0.1:${active.port}/api/source/not-known?token=${active.token}`,
    );
    expect(unknown.status).toBe(404);
    const traversal = await fetch(
      `http://127.0.0.1:${active.port}/assets/%2e%2e%2fsecret?token=${active.token}`,
    );
    expect(traversal.status).toBe(404);
  });

  it("fails a requested port conflict and releases the port on shutdown", async () => {
    const first = await session();
    await expect(
      startLocalSession({ assetsRoot: await assets(), data: {}, port: first.port }),
    ).rejects.toMatchObject({ code: "EADDRINUSE" });
    const port = first.port;
    await first.close();
    await expect(fetch(first.url)).rejects.toThrow();

    const replacement = await session(port);
    expect(replacement.port).toBe(port);
  });
});
