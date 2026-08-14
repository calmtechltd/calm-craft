import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
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
          if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.endsWith(".flow.mmd")) {
            return [toPosixPath(relative(specsRoot, fullPath))];
          }
          return [];
        }),
    );
    return discovered.flat();
  }

  return (await walk(specsRoot)).toSorted();
}
