import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, relative } from "node:path";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function repositoryPath(value: string, field: string, allowRoot = false): string {
  const path = value.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
  if (allowRoot && (path === "." || value === "./")) return ".";
  if (
    !path ||
    path.startsWith("/") ||
    /^[a-z]:/iu.test(path) ||
    path.startsWith(":") ||
    path.includes("\0") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new ConfigError(`${field} must be a relative path beneath the repository root.`);
  return path;
}

function contained(root: string, path: string): boolean {
  const child = relative(root, path);
  return (
    child !== ".." &&
    !child.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
    !isAbsolute(child)
  );
}

export async function readConfigFile(
  root: string,
  path: string,
  optional = false,
): Promise<string | undefined> {
  const label = relative(root, path).replaceAll("\\", "/");
  let details;
  try {
    details = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT" && optional) return undefined;
    throw new ConfigError(`${label}: could not read configuration file.`);
  }
  if (!details.isFile() || details.isSymbolicLink())
    throw new ConfigError(`${label}: configuration must be a regular file, not a symlink.`);
  if (!contained(await realpath(root), await realpath(path)))
    throw new ConfigError(`${label}: configuration escapes the repository root.`);
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 64 * 1024)
      throw new ConfigError(`${label}: configuration exceeds the 64 KiB limit or is not a file.`);
    const buffer = Buffer.alloc(64 * 1024 + 1);
    let length = 0;
    while (length < buffer.length) {
      // Each read advances the next offset; parallel reads could truncate a short read.
      // eslint-disable-next-line no-await-in-loop
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > 64 * 1024)
      throw new ConfigError(`${label}: configuration exceeds the 64 KiB limit.`);
    return buffer.subarray(0, length).toString("utf8");
  } finally {
    await handle.close();
  }
}
