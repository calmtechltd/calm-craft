import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

export function readEnvironment(root: string, files: string[]): Record<string, string> {
  const env: Record<string, string> = {};
  for (const file of files) {
    try {
      Object.assign(env, parseEnv(readFileSync(join(root, file), "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        throw new Error(`Cannot read environment file ${file}.`, { cause: error });
    }
  }
  return env;
}
export function watchEnvironment(
  root: string,
  files: string[],
  changed: () => void,
  failed: () => void,
): () => void {
  const fingerprint = (file: string) => {
    try {
      const s = statSync(join(root, file), { bigint: true });
      return `${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  };
  let previous = files.map(fingerprint);
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const timer = setInterval(() => {
    let next;
    try {
      next = files.map(fingerprint);
    } catch {
      clearInterval(timer);
      clearTimeout(debounce);
      failed();
      return;
    }
    if (next.some((value, index) => value !== previous[index])) {
      clearTimeout(debounce);
      debounce = setTimeout(changed, 250);
    }
    previous = next;
  }, 500);
  return () => {
    clearInterval(timer);
    clearTimeout(debounce);
  };
}
