import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectSources } from "../cli/command";
import { loadConfig } from "../config";
import { createBranchReview } from "../diff";
import type { Provenance } from "../diff/model";
import { discoverRepository } from "../git";
import { serializeData } from "../server";
import { loadFilesystemSnapshot } from "../git/snapshot";

export type BuildStaticEstateOptions = {
  /** Repository to read. Never written to. */
  source: string;
  /** File to write. */
  out: string;
  /** Built browser assets. Defaults to the packaged bundle. */
  assetsRoot?: string;
  /** Compute Branch Review now and bake it into the file. */
  diff?: boolean;
  /** Explicit comparison base. Implies diff. */
  base?: string;
  /** Provenance layers shown when the file first opens. */
  provenance?: Provenance[];
};

export type BuildStaticEstateResult = {
  out: string;
  bytes: number;
  specs: number;
  sources: number;
  payloadBytes: number;
  sourceBytes: number;
  assetBytes: number;
  mode: "estate" | "review";
  reviewAvailable?: boolean;
  semanticChanges?: number;
};

function defaultAssetsRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../ui");
}

/**
 * Deterministic ids. A generated file has no session and no server, so there is
 * nothing for a random id to protect against — and a stable id keeps two builds
 * of an unchanged estate byte-identical.
 */
function sourceId(path: string, content: string): string {
  return createHash("sha256").update(`${path}\u0000${content}`).digest("base64url").slice(0, 16);
}

const MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

/**
 * Inline every asset the stylesheet reaches for. A single file cannot resolve
 * a relative url(), so fonts travel as data URIs or they do not travel at all.
 */
async function inlineAssetUrls(css: string, assetsDirectory: string): Promise<string> {
  const entries = (await readdir(assetsDirectory)).filter(
    (entry) => MIME[extname(entry)] && css.includes(entry),
  );
  const assets = await Promise.all(
    entries.map(async (entry) => ({
      entry,
      bytes: await readFile(resolve(assetsDirectory, entry)),
    })),
  );
  let inlined = css;
  for (const { entry, bytes } of assets) {
    inlined = inlined.replaceAll(
      new RegExp(`[^"'()\\s]*${entry.replaceAll(".", "\\.")}`, "gu"),
      `data:${MIME[extname(entry)]};base64,${bytes.toString("base64")}`,
    );
  }
  return inlined;
}

function escapeForScript(json: string): string {
  return json
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export async function buildStaticEstate(
  options: BuildStaticEstateOptions,
): Promise<BuildStaticEstateResult> {
  const repository = await discoverRepository(options.source);
  const config = await loadConfig(repository.root);
  const repositorySource = { kind: "local" as const };
  const data = options.diff
    ? {
        mode: "review" as const,
        review: await createBranchReview(repository.root, {
          explicitBase: options.base,
          configuredBase: config.defaultBase,
          specsRoot: config.specsRoot,
        }),
        initialProvenance: options.provenance ?? ["committed", "staged", "unstaged", "untracked"],
        repositorySource,
      }
    : {
        mode: "estate" as const,
        snapshot: await loadFilesystemSnapshot(repository.root, config.specsRoot),
        repositorySource,
      };
  const specs =
    data.mode === "review" ? data.review.estate.specs.length : data.snapshot.estate.specs.length;

  const collected = collectSources(data);
  const sourceById: Record<string, string> = {};
  const descriptors: Array<{ id: string; path: string; context?: string }> = [];
  for (const source of collected) {
    const id = sourceId(source.path, source.content);
    sourceById[id] = source.content;
    const contextual =
      source.contexts?.map((context) => ({ id, path: source.path, context })) ?? [];
    if (source.generic || contextual.length === 0) descriptors.push({ id, path: source.path });
    descriptors.push(...contextual);
  }

  const assetsRoot = options.assetsRoot ?? defaultAssetsRoot();
  const assetsDirectory = resolve(assetsRoot, "assets");
  const entries = await readdir(assetsDirectory);
  const scriptName = entries.find((entry) => entry.endsWith(".js"));
  const styleName = entries.find((entry) => entry.endsWith(".css"));
  if (!scriptName || !styleName) {
    throw new Error("CalmCraft could not find the built browser assets. Run the build first.");
  }
  const script = await readFile(resolve(assetsDirectory, scriptName), "utf8");
  const style = await inlineAssetUrls(
    await readFile(resolve(assetsDirectory, styleName), "utf8"),
    assetsDirectory,
  );

  /* Strip raw source out of the session exactly as the server does, then carry
     it once in its own map rather than repeated inside the payload. */
  const payload = escapeForScript(serializeData({ data, sources: descriptors }));
  const sources = escapeForScript(JSON.stringify(sourceById));

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <title>${data.mode === "review" ? "CalmCraft Branch Review" : "CalmCraft Atlas"}</title>
    <style>${style}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__CALMCRAFT_SESSION__ = Object.assign(${payload}, { sourceById: ${sources} });
    </script>
    <script type="module">${script}</script>
  </body>
</html>
`;

  await writeFile(options.out, html, "utf8");
  return {
    out: options.out,
    bytes: Buffer.byteLength(html),
    specs,
    sources: Object.keys(sourceById).length,
    payloadBytes: Buffer.byteLength(payload),
    sourceBytes: Buffer.byteLength(sources),
    assetBytes: Buffer.byteLength(script) + Buffer.byteLength(style),
    mode: data.mode,
    ...(data.mode === "review"
      ? {
          reviewAvailable: data.review.available,
          semanticChanges: data.review.semanticChanges.length,
        }
      : {}),
  };
}
