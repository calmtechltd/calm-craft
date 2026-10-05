// Failure responses are consumed sequentially to keep their ownership independent.
/* eslint-disable no-await-in-loop */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stringify } from "yaml";
import { parseCliArguments } from "../cli/arguments";
import { runCli } from "../cli/command";
import { validateStackConfig } from "../dev-all/config";
import { validateEnvSyncConfig } from "./config";
import { runSyncCommand, type ProcessRequest, type SyncArguments } from "./index";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
function syncConfig() {
  return {
    sources: {
      preview: { template: "preview.tpl", account: "example.1password.eu" },
      production: { vault: "Engineering", item: "Production Env", variables: ["API_KEY"] },
    },
    targets: {
      vercel: {
        provider: "vercel",
        project: "project-name",
        team: "team-slug",
        environments: { preview: "preview", production: "production" },
      },
      github: {
        provider: "github",
        repo: "team/repo",
        environments: { Preview: "production", Production: "production" },
      },
    },
  };
}
function stack(envSync: unknown = syncConfig()) {
  return {
    version: 1,
    project: "fixture",
    slots: 1,
    ports: { app: { base: 3000 } },
    services: { app: { command: ["node", "app.mjs"], ready: { url: "${urls.app}" } } },
    envSync,
  };
}
async function fixture(
  template = "API_KEY=op://Engineering/Preview Env/API_KEY\nPUBLIC_URL='https://example.com?a=b'\n# IGNORED=op://Missing/Item/FIELD\n",
) {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-sync-"));
  roots.push(root);
  await writeFile(join(root, "dev.yaml"), stringify(stack()));
  await writeFile(join(root, "preview.tpl"), template);
  return root;
}
function io() {
  const output: string[] = [];
  return {
    output,
    stdout: (value: string) => output.push(value),
    stderr: (value: string) => output.push(value),
  };
}
function args(overrides: Partial<SyncArguments> = {}): SyncArguments {
  return {
    command: "env-sync",
    config: "dev.yaml",
    target: "vercel",
    environment: "preview",
    apply: false,
    ...overrides,
  };
}
function confirmed(key: string) {
  return Response.json({ created: { key }, failed: [] }, { status: 201 });
}

describe("dev-all environment sync", () => {
  it("B6 accepts sparse and shared mappings, and rejects ambiguous or unsupported configuration", () => {
    const config = validateStackConfig(stack());
    expect(config.envSync?.targets.github?.environments).toEqual({
      Preview: "production",
      Production: "production",
    });
    expect(config.envSync?.targets.vercel?.environments).not.toHaveProperty("development");
    expect(
      validateStackConfig(
        stack({
          ...syncConfig(),
          sources: {
            ...syncConfig().sources,
            production: { vault: "Engineering", item: "Production Env" },
          },
        }),
      ).envSync?.sources.production?.variables,
    ).toEqual(["*"]);
    for (const invalid of [
      {
        ...syncConfig(),
        targets: {
          vercel: {
            provider: "vercel",
            project: "p",
            team: "t",
            environments: { preview: "missing" },
          },
        },
      },
      {
        ...syncConfig(),
        sources: { ...syncConfig().sources, production: { vault: "v", item: "i", variables: [] } },
      },
      {
        ...syncConfig(),
        sources: {
          ...syncConfig().sources,
          production: { vault: "v", item: "i", variables: ["API_?"] },
        },
      },
      { ...syncConfig(), sources: { source: { template: "../outside.tpl" } } },
      {
        ...syncConfig(),
        sources: { source: { template: "x.tpl", vault: "v", item: "i", variables: ["KEY"] } },
      },
      {
        ...syncConfig(),
        targets: { provider: { provider: "unknown", environments: { preview: "preview" } } },
      },
    ])
      expect(() => validateEnvSyncConfig(invalid)).toThrow();
  });

  it("B7 defaults to a dry run and requires explicit target and destination selection", async () => {
    const root = await fixture(),
      output = io();
    const execute = vi.fn(),
      remote = vi.fn();
    await expect(runSyncCommand(args(), output, { root, execute, fetch: remote })).resolves.toBe(0);
    expect(execute).not.toHaveBeenCalled();
    expect(remote).not.toHaveBeenCalled();
    expect(output.output.join("")).toContain("vercel/preview: API_KEY (secret)");
    expect(output.output.join("")).not.toMatch(/example\.com|op:\/\/|IGNORED/u);
    expect(parseCliArguments(["env-sync", "--target", "vercel", "--env", "preview"])).toMatchObject(
      { apply: false, environment: "preview" },
    );
    for (const invalid of [
      ["env-sync"],
      ["env-sync", "--target", "vercel"],
      ["env-sync", "--target", "vercel", "--env", "preview", "--apply", "--dry-run"],
    ])
      expect(() => parseCliArguments(invalid)).toThrow();

    await writeFile(
      join(root, "item.yaml"),
      stringify(
        stack({
          ...syncConfig(),
          sources: {
            preview: { vault: "Engineering", item: "Preview Env", variables: ["API_KEY"] },
            production: syncConfig().sources.production,
          },
        }),
      ),
    );
    await expect(
      runCli(
        ["env-sync", "--config", join(root, "item.yaml"), "--target", "vercel", "--env", "preview"],
        { io: output },
      ),
    ).resolves.toBe(0);
  });

  it("B7 preserves multiline values and sends secrets only in the scoped Vercel request body", async () => {
    const root = await fixture(),
      output = io(),
      secret = "  -----BEGIN KEY-----\nsecret=a=b\n-----END KEY-----\n";
    const execute = vi.fn(async (_request: ProcessRequest) => secret);
    const remote = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          envs: [
            { key: "API_KEY", target: ["production"] },
            { key: "API_KEY", target: ["preview"], gitBranch: "feature" },
          ],
        }),
      )
      .mockResolvedValueOnce(confirmed("API_KEY"))
      .mockResolvedValueOnce(confirmed("PUBLIC_URL"));
    await runSyncCommand(args({ apply: true }), output, {
      root,
      execute,
      fetch: remote,
      environment: { VERCEL_TOKEN: "token-fixture" },
    });
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      executable: "op",
      args: [
        "read",
        "--no-newline",
        "--account",
        "example.1password.eu",
        "op://Engineering/Preview Env/API_KEY",
      ],
    });
    expect(String(remote.mock.calls[1]?.[0])).toBe(
      "https://api.vercel.com/v10/projects/project-name/env?slug=team-slug&upsert=true",
    );
    const write = remote.mock.calls[1]?.[1];
    expect(write).toMatchObject({
      method: "POST",
      redirect: "error",
      headers: { Authorization: "Bearer token-fixture" },
    });
    expect(JSON.parse(String(write?.body))).toEqual({
      key: "API_KEY",
      value: secret,
      type: "sensitive",
      visibility: "secret",
      target: ["preview"],
    });
    expect(JSON.parse(String(remote.mock.calls[2]?.[1]?.body))).toEqual({
      key: "PUBLIC_URL",
      value: "https://example.com?a=b",
      type: "plain",
      visibility: "config",
      target: ["preview"],
    });
    expect(output.output.join("")).not.toMatch(/secret=a=b|BEGIN KEY|token-fixture|example\.com/u);
  });

  it("B8 resolves every selected source before writes and blocks shared Vercel records", async () => {
    const root = await fixture(),
      output = io();
    const remote = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ envs: [] }));
    const execute = vi.fn(async () => {
      throw new Error("private-source-error");
    });
    await expect(
      runSyncCommand(args({ apply: true, environment: "all" }), output, {
        root,
        execute,
        fetch: remote,
        environment: { VERCEL_TOKEN: "token" },
      }),
    ).rejects.toThrow(/No remote writes started/u);
    expect(remote).toHaveBeenCalledTimes(1);
    expect(output.output.join("")).not.toContain("private-source-error");
    execute.mockClear();
    remote.mockResolvedValue(
      Response.json({ envs: [{ key: "API_KEY", target: ["preview", "production"] }] }),
    );
    await expect(
      runSyncCommand(args({ apply: true }), output, {
        root,
        execute,
        fetch: remote,
        environment: { VERCEL_TOKEN: "token" },
      }),
    ).rejects.toThrow(/spans multiple environments/u);
    expect(execute).not.toHaveBeenCalled();
  });

  it("B8 rejects a missing selected key or empty secret without starting remote writes", async () => {
    const root = await fixture(),
      output = io();
    const execute = vi.fn(async () => " \n"),
      remote = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ envs: [] }));
    await expect(
      runSyncCommand(args({ variable: "MISSING", apply: true }), output, {
        root,
        execute,
        fetch: remote,
      }),
    ).rejects.toThrow(/missing/u);
    expect(remote).not.toHaveBeenCalled();
    await expect(
      runSyncCommand(args({ variable: "API_KEY", apply: true }), output, {
        root,
        execute,
        fetch: remote,
        environment: { VERCEL_TOKEN: "token" },
      }),
    ).rejects.toThrow(/Empty 1Password/u);
    expect(remote).toHaveBeenCalledTimes(1);
  });

  it("B8 reports partial remote failures, including failures inside a successful HTTP response", async () => {
    const root = await fixture(),
      output = io();
    for (const response of [
      Response.json({ error: "private-api-value" }, { status: 403 }),
      Response.json({ failed: [{ error: "private-api-value" }] }, { status: 201 }),
    ]) {
      const remote = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json({ envs: [] }))
        .mockResolvedValueOnce(confirmed("API_KEY"))
        .mockResolvedValueOnce(response);
      const execute = vi.fn(async () => "private-secret-value");
      await expect(
        runSyncCommand(args({ apply: true }), output, {
          root,
          execute,
          fetch: remote,
          environment: { VERCEL_TOKEN: "token" },
        }),
      ).rejects.toThrow(/PUBLIC_URL; 1\/2 writes confirmed/u);
      expect(output.output.join("")).not.toMatch(/private-api-value|private-secret-value/u);
    }
  });

  it("B7/B8 reuses a named source across GitHub environments and passes values through stdin", async () => {
    const root = await fixture(),
      output = io(),
      secret = "private-secret\nwith-newline\n";
    const execute = vi.fn(async (request: ProcessRequest) =>
      request.executable === "op" ? secret : "",
    );
    await runSyncCommand(args({ target: "github", environment: "all", apply: true }), output, {
      root,
      execute,
    });
    expect(execute.mock.calls).toHaveLength(3);
    expect(execute.mock.calls[0]?.[0].args).toContain("op://Engineering/Production Env/API_KEY");
    expect(execute.mock.calls[1]?.[0]).toMatchObject({
      executable: "gh",
      args: [
        "secret",
        "set",
        "API_KEY",
        "--repo",
        "team/repo",
        "--env",
        "Preview",
        "--app",
        "actions",
      ],
      input: secret,
    });
    expect(execute.mock.calls[2]?.[0].args).toContain("Production");
    expect(JSON.stringify(execute.mock.calls.map(([request]) => request.args))).not.toContain(
      "private-secret",
    );
    expect(output.output.join("")).not.toContain("private-secret");
  });

  it("B6/B7 plans omitted lists and wildcard selectors without reading the item", async () => {
    const root = await fixture(),
      output = io(),
      execute = vi.fn(),
      remote = vi.fn();
    for (const variables of [undefined, ["*"], ["API_*", "*URL"]]) {
      await writeFile(
        join(root, "dev.yaml"),
        stringify(
          stack({
            ...syncConfig(),
            sources: {
              ...syncConfig().sources,
              production: { vault: "Engineering", item: "Production Env", variables },
            },
          }),
        ),
      );
      await runSyncCommand(args({ target: "github", environment: "Production" }), output, {
        root,
        execute,
        fetch: remote,
      });
    }
    expect(execute).not.toHaveBeenCalled();
    expect(remote).not.toHaveBeenCalled();
    expect(output.output.join("")).toContain(
      "Would select github/Production: * (field names discovered on apply)",
    );
    expect(output.output.join("")).toContain("Would select github/Production: API_*");
    expect(output.output.join("")).toContain("Would select github/Production: *URL");
  });

  it("B6/B7 discovers all or matching item fields and deduplicates overlapping selectors", async () => {
    const root = await fixture();
    const fields = [
      { id: "notesPlain", label: "NOTES", value: "private-notes" },
      { label: "username", value: "private-username" },
      { label: "API_KEY", value: "private-api-key" },
      { label: "DATABASE_URL", value: "private-database-url\n" },
      { label: "EXTRA_TOKEN", value: "private-extra-token" },
    ];
    for (const [variables, selected] of [
      [undefined, ["API_KEY", "DATABASE_URL", "EXTRA_TOKEN"]],
      [["*"], ["API_KEY", "DATABASE_URL", "EXTRA_TOKEN"]],
      [
        ["API_*", "API_KEY", "*URL"],
        ["API_KEY", "DATABASE_URL"],
      ],
    ] as const) {
      await writeFile(
        join(root, "dev.yaml"),
        stringify(
          stack({
            ...syncConfig(),
            sources: {
              ...syncConfig().sources,
              production: {
                account: "example.1password.eu",
                vault: "Engineering",
                item: "Production Env",
                variables,
              },
            },
          }),
        ),
      );
      const output = io(),
        execute = vi.fn(async (request: ProcessRequest) =>
          request.executable === "op" ? JSON.stringify({ fields, title: "private-title" }) : "",
        );
      await runSyncCommand(args({ target: "github", environment: "all", apply: true }), output, {
        root,
        execute,
      });
      const reads = execute.mock.calls.filter(([request]) => request.executable === "op");
      expect(reads).toHaveLength(1);
      expect(reads[0]?.[0].args).toEqual([
        "item",
        "get",
        "--format",
        "json",
        "--reveal",
        "--vault",
        "Engineering",
        "--account",
        "example.1password.eu",
        "--",
        "Production Env",
      ]);
      const writes = execute.mock.calls.filter(([request]) => request.executable === "gh");
      expect(writes.map(([request]) => request.args[2])).toEqual([...selected, ...selected]);
      expect(writes.find(([request]) => request.args[2] === "DATABASE_URL")?.[0].input).toBe(
        "private-database-url\n",
      );
      expect(output.output.join("")).not.toMatch(/private-|NOTES|username/u);
    }
  });

  it("B7 narrows wildcard discovery with --var without selecting empty unrelated fields", async () => {
    const root = await fixture(),
      output = io();
    await writeFile(
      join(root, "dev.yaml"),
      stringify(
        stack({
          ...syncConfig(),
          sources: {
            ...syncConfig().sources,
            production: { vault: "Engineering", item: "Production Env" },
          },
        }),
      ),
    );
    const execute = vi.fn(async (request: ProcessRequest) =>
      request.executable === "op"
        ? JSON.stringify({
            fields: [
              { label: "API_KEY", value: "private-key" },
              { label: "EMPTY", value: "" },
            ],
          })
        : "",
    );
    await runSyncCommand(
      args({ target: "github", environment: "Production", apply: true, variable: "API_KEY" }),
      output,
      { root, execute },
    );
    expect(execute.mock.calls).toHaveLength(2);
    expect(execute.mock.calls[1]?.[0]).toMatchObject({ executable: "gh", input: "private-key" });
    expect(execute.mock.calls[1]?.[0].args).toContain("API_KEY");
  });

  it("B7 uses Vercel's supported encrypted secret type for development", async () => {
    const root = await fixture(),
      output = io();
    await writeFile(
      join(root, "dev.yaml"),
      stringify(
        stack({
          ...syncConfig(),
          targets: {
            vercel: { ...syncConfig().targets.vercel, environments: { development: "production" } },
          },
        }),
      ),
    );
    const remote = vi.fn(async (_url: string | URL | Request, request?: RequestInit) =>
      request?.method === "POST" ? confirmed("API_KEY") : Response.json({ envs: [] }),
    );
    await runSyncCommand(args({ environment: "development", apply: true }), output, {
      root,
      environment: { VERCEL_TOKEN: "test-token" },
      execute: async () => "private-key",
      fetch: remote,
    });
    expect(JSON.parse(String(remote.mock.calls[1]?.[1]?.body))).toMatchObject({
      key: "API_KEY",
      type: "encrypted",
      visibility: "secret",
      target: ["development"],
    });
  });

  it("B6/B7 excludes protected variables before validation and writes in every source form", async () => {
    const root = await fixture(
        "API_KEY=op://Engineering/Preview Env/API_KEY\nPROTECTED=op://Missing/Item/PROTECTED\n",
      ),
      output = io();
    for (const source of [
      { vault: "Engineering", item: "Production Env" },
      { vault: "Engineering", item: "Production Env", variables: ["API_KEY", "PROTECTED"] },
      { template: "preview.tpl" },
    ]) {
      await writeFile(
        join(root, "dev.yaml"),
        stringify(
          stack({
            ...syncConfig(),
            sources: { ...syncConfig().sources, production: { ...source, exclude: ["PROTECT*"] } },
          }),
        ),
      );
      const execute = vi.fn(async (request: ProcessRequest) => {
        if (request.args[0] === "item")
          return JSON.stringify({
            fields: [
              { label: "API_KEY", value: "private-key" },
              { label: "PROTECTED", value: "" },
            ],
          });
        return request.executable === "op" ? "private-key" : "";
      });
      await runSyncCommand(
        args({ target: "github", environment: "Production", apply: true }),
        output,
        { root, execute },
      );
      const writes = execute.mock.calls.filter(([request]) => request.executable === "gh");
      expect(writes.map(([request]) => request.args[2])).toEqual(["API_KEY"]);
      execute.mockClear();
      await expect(
        runSyncCommand(
          args({ target: "github", environment: "Production", apply: true, variable: "PROTECTED" }),
          output,
          { root, execute },
        ),
      ).rejects.toThrow(/missing/);
      expect(execute).not.toHaveBeenCalled();
      await runSyncCommand(args({ target: "github", environment: "Production" }), output, {
        root,
        execute,
      });
      expect(execute).not.toHaveBeenCalled();
    }
    expect(output.output.join("")).toContain("Excluding github/Production: PROTECT*");
    for (const exclude of [[], ["lowercase"], ["API_*", "API_*"]]) {
      expect(() =>
        validateEnvSyncConfig({
          ...syncConfig(),
          sources: { production: { vault: "Engineering", item: "Production Env", exclude } },
        }),
      ).toThrow();
    }
  });

  it("B8 refuses ambiguous fields, unmatched selectors and invalid or empty item values before writes", async () => {
    const root = await fixture(),
      output = io();
    await writeFile(
      join(root, "dev.yaml"),
      stringify(
        stack({
          ...syncConfig(),
          sources: {
            ...syncConfig().sources,
            production: { vault: "Engineering", item: "Production Env", variables: ["API_*"] },
          },
        }),
      ),
    );
    for (const item of [
      "private-invalid-json",
      JSON.stringify({ fields: [{ label: "OTHER", value: "private-value" }] }),
      JSON.stringify({ fields: [{ label: "API_KEY", value: " \n" }] }),
      JSON.stringify({ fields: [{ label: "API_KEY" }] }),
      JSON.stringify({
        fields: [
          { label: "API_KEY", value: "private-one", section: { id: "first" } },
          { label: "API_KEY", value: "private-two", section: { id: "second" } },
        ],
      }),
    ]) {
      const execute = vi.fn(async (_request: ProcessRequest) => item);
      await expect(
        runSyncCommand(args({ target: "github", environment: "all", apply: true }), output, {
          root,
          execute,
        }),
      ).rejects.toThrow(/No remote writes started/u);
      expect(execute.mock.calls.every(([request]) => request.executable === "op")).toBe(true);
      expect(output.output.join("")).not.toContain("private-");
    }
  });
});
