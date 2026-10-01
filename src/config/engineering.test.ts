import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadEngineeringConfig, parseEngineeringConfig } from "./engineering";

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-engineering-"));
  roots.push(root);
  await mkdir(join(root, ".engineering"));
  return root;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("engineering configuration contract", () => {
  it("B3/B4/B5 — validates shipped minimal and CI examples against the runtime schema", async () => {
    const minimal = parseEngineeringConfig(
      await readFile("assets/engineering/minimal.example.yaml", "utf8"),
    );
    expect(minimal.shared.specsRoot).toBe("specs");
    expect(minimal.gates).toEqual([]);
    const config = parseEngineeringConfig(
      await readFile("assets/engineering/quality.example.yaml", "utf8"),
    );
    expect(config.gates.filter((gate) => gate.context.node === "22")).toHaveLength(5);
    expect(config.gates.find((gate) => gate.id === "browser-node24")?.prerequisites).toEqual([
      "build",
      "browser_install",
    ]);
    expect(config.suites.browser?.targeted).toBe("browser_file");
  });

  it("B6 — normalizes legacy commands and patterns while surfacing repository extensions", () => {
    const config = parseEngineeringConfig(`version: 1
commands:
  test: pnpm test
  test_file: pnpm test {file}
non_gating:
  format: pnpm format
gates: [test]
tests: {location: colocated, unit: "*.test.ts", integration: "*.integration.test.ts"}
custom_policy: preserved
`);
    expect(config.commands.format).toEqual({ cwd: ".", shell: "pnpm format" });
    expect(config.suites.legacy).toMatchObject({
      files: ["*.test.ts", "*.integration.test.ts"],
      targeted: "test_file",
      legacy: true,
    });
    expect(config.warnings).toMatchObject([
      { field: "custom_policy", message: "legacy extension is preserved but not validated." },
    ]);
    expect(() =>
      parseEngineeringConfig("version: 1\ncommands: {lint: old}\nnon_gating: {lint: new}\n"),
    ).toThrow(/conflicts/u);
  });

  it.each([
    ["version: 3", /version/u],
    ["version: 2\nversion: 2", /DUPLICATE_KEY/u],
    ["version: 2\ngates: [missing]", /unknown command/u],
    ["version: 2\ncommands: {test: pnpm test}\ngates: [test, test]", /duplicate gate/u],
    [
      "version: 2\ncommands: {test: pnpm test}\ngates: [{id: test, command: test, prerequisites: [test]}]",
      /own prerequisite/u,
    ],
    ["version: 2\npaths: {specs: ../private}", /relative path/u],
    ["version: 2\ncommands: {test: {argv: [node], cwd: ../private}}", /relative path/u],
    ["version: 2\ncommands: {test: {argv: [node], shell: node}}", /invalid configuration/u],
    [
      "version: 2\ncommands: {file: {argv: [node, 'prefix-{file}']}}\ntests: {suites: {unit: {files: ['src/*.ts'], targeted: file}}}",
      /whole file argument/u,
    ],
    [
      "version: 2\ntests: {suites: {unit: {files: ['src/*.ts'], command: unknown}}}",
      /unknown command/u,
    ],
    ["version: 2\ntickets: {provider: custom}", /provider requires/u],
    ["version: 2\nextra: secret-value", /invalid configuration/u],
  ])("B1 — rejects invalid contract case %s", (source, message) => {
    expect(() => parseEngineeringConfig(source)).toThrow(message);
  });

  it("B1/B2 — projects healthy shared fields without validating unrelated delivery metadata", () => {
    const source =
      "version: 2\npaths: {specs: product/specs/}\ncommands: secret-value\ngates: [missing]\n";
    expect(parseEngineeringConfig(source, "config.yaml", true).shared.specsRoot).toBe(
      "product/specs",
    );
    expect(() => parseEngineeringConfig(source)).toThrow(/invalid configuration/u);
    try {
      parseEngineeringConfig(source);
    } catch (error) {
      expect(String(error)).not.toContain("secret-value");
    }
    expect(() =>
      parseEngineeringConfig("version: 2\npaths: {specs: 5}", "config.yaml", true),
    ).toThrow(/paths\/specs/u);
    expect(
      parseEngineeringConfig(
        "version: 2\npaths: {specs: product/specs, reports: /tmp/reports}\nvcs: {review_base: main, pr_cli: invalid}",
        "config.yaml",
        true,
      ).shared,
    ).toMatchObject({ specsRoot: "product/specs", reviewBase: "main" });
    expect(() =>
      parseEngineeringConfig("version: 2\npaths: {specs: ../escape}", "config.yaml", true),
    ).toThrow(/config.yaml:2:\d+ paths\/specs/u);
  });

  it("B1 — bounds file reads and rejects config symlinks including an escaping parent", async () => {
    const root = await fixture();
    const path = join(root, ".engineering/config.yaml");
    expect(await loadEngineeringConfig(root)).toBeUndefined();
    await expect(loadEngineeringConfig(root, false, path, false)).rejects.toThrow(
      /could not read/u,
    );
    await writeFile(path, "version: 2\n" + "#".repeat(65536));
    await expect(loadEngineeringConfig(root)).rejects.toThrow(/64 KiB/u);
    await rm(path);
    await writeFile(join(root, "source.yaml"), "version: 2\n");
    await symlink(join(root, "source.yaml"), path);
    await expect(loadEngineeringConfig(root)).rejects.toThrow(/symlink/u);
    await rm(join(root, ".engineering"), { recursive: true });
    const outside = await fixture();
    await writeFile(join(outside, ".engineering/config.yaml"), "version: 2\n");
    await symlink(join(outside, ".engineering"), join(root, ".engineering"));
    await expect(loadEngineeringConfig(root)).rejects.toThrow(/escapes/u);
  });
});
