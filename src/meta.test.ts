import { describe, expect, it } from "vitest";

import packageManifest from "../package.json";
import pluginManifest from "../plugin.json";
import { CALMCRAFT_NAME, CALMCRAFT_VERSION } from "./meta";

describe("package metadata", () => {
  it("keeps the CLI and plugin release identity aligned", () => {
    expect(CALMCRAFT_NAME).toBe("CalmCraft");
    expect(CALMCRAFT_VERSION).toBe(packageManifest.version);
    expect(packageManifest.version).toBe(pluginManifest.version);
    expect(packageManifest.license).toBe(pluginManifest.license);
  });

  it("ships without install-time scripts", () => {
    expect(packageManifest.scripts).not.toHaveProperty("preinstall");
    expect(packageManifest.scripts).not.toHaveProperty("install");
    expect(packageManifest.scripts).not.toHaveProperty("postinstall");
  });
});
