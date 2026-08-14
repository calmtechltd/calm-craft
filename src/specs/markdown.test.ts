import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

const FIXTURE = resolve(import.meta.dirname, "../../test/fixtures/unsafe-markdown.md");

describe("safe Markdown rendering", () => {
  it("keeps supported prose and tables while removing active and remote content", () => {
    const rendered = renderMarkdown(readFileSync(FIXTURE, "utf8"));

    expect(rendered.changed).toBe(true);
    expect(rendered.html).toContain("<strong>emphasis</strong>");
    expect(rendered.html).toContain("<table>");
    expect(rendered.html).toContain('href="https://example.com"');
    expect(rendered.html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(rendered.html).not.toMatch(/<(script|img|iframe)\b|\s(onerror|onclick|src)=/iu);
    expect(rendered.html).not.toMatch(
      /href="(?:javascript:|data:|\/\/|https:\/\/tracker\.example)/iu,
    );
  });

  it("retains safe relative links without enabling protocol-relative URLs", () => {
    const safe = renderMarkdown("[Related](../related/spec.md#behaviour)");
    const unsafe = renderMarkdown("[Remote](//tracker.example/path)");

    expect(safe.html).toContain('href="../related/spec.md#behaviour"');
    expect(safe.changed).toBe(false);
    expect(unsafe.html).not.toContain("href=");
    expect(unsafe.changed).toBe(true);
  });

  it("does not mistake harmless entity normalization for removed content", () => {
    const rendered = renderMarkdown("A site's apostrophe remains ordinary prose.");

    expect(rendered.changed).toBe(false);
    expect(rendered.html).toContain("site's apostrophe");
    expect(renderMarkdown("[Documentation](https://example.com)").changed).toBe(false);
  });
});
