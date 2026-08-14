import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

export function isSpecMarkdownPath(path: string): boolean {
  const parts = path.split("/");
  const name = parts.at(-1) ?? "";
  return (
    !parts.some((part) => part.startsWith("_")) &&
    name !== "README.md" &&
    name.endsWith(".md") &&
    !name.endsWith(".flow.mmd")
  );
}

export async function discoverSpecFiles(specsRoot: string): Promise<string[]> {
  async function walk(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const discovered = await Promise.all(
      entries
        .toSorted((left, right) => left.name.localeCompare(right.name))
        .map(async (entry): Promise<string[]> => {
          if (entry.name.startsWith("_") || entry.name === "README.md") return [];
          const fullPath = join(directory, entry.name);
          if (entry.isDirectory()) return walk(fullPath);
          const relativePath = toPosixPath(relative(specsRoot, fullPath));
          if (entry.isFile() && isSpecMarkdownPath(relativePath)) {
            return [relativePath];
          }
          return [];
        }),
    );
    return discovered.flat();
  }

  return (await walk(specsRoot)).toSorted();
}
