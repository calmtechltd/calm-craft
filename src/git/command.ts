import { execFile } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

export type GitResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type GitOptions = {
  acceptedExitCodes?: number[];
  timeoutMs?: number;
  maxOutputBytes?: number;
};

export class GitReadError extends Error {
  readonly exitCode?: number;

  constructor(message: string, exitCode?: number) {
    super(message);
    this.name = "GitReadError";
    this.exitCode = exitCode;
  }
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^/@\s]+)@/giu, "$1[redacted]@")
    .replace(/([?&](?:access_token|auth|key|password|signature|token)=)[^&#\s]*/giu, "$1[redacted]")
    .replace(
      /\b(?:ghp_[a-z0-9]+|github_pat_[a-z0-9_]+|glpat-[a-z0-9_-]+)\b/giu,
      "[redacted-token]",
    );
}

function assertReadOnlyArguments(args: string[]): void {
  const [command, ...rest] = args;
  const allowed =
    command === "rev-parse" ||
    (command === "symbolic-ref" &&
      (rest.join("\u0000") === "--quiet\u0000--short\u0000HEAD" ||
        rest.join("\u0000") === "--quiet\u0000refs/remotes/origin/HEAD")) ||
    (command === "remote" &&
      (rest.length === 0 || (rest.length === 3 && rest[0] === "get-url" && rest[1] === "--all"))) ||
    (command === "status" &&
      rest.join("\u0000") === "--porcelain=v2\u0000--branch\u0000-z\u0000--untracked-files=all") ||
    (command === "ls-tree" && rest.includes("--name-only") && rest.includes("-z")) ||
    (command === "ls-files" && rest.includes("-s") && rest.includes("-z")) ||
    command === "merge-base" ||
    command === "diff" ||
    (command === "cat-file" && rest.length === 2 && rest[0] === "blob");
  if (!allowed) {
    throw new GitReadError(
      `Refused non-read-only Git arguments: ${redactSensitiveText(args.join(" "))}`,
    );
  }
}

export function runReadOnlyGit(
  cwd: string,
  args: string[],
  options: GitOptions = {},
): Promise<GitResult> {
  assertReadOnlyArguments(args);
  const acceptedExitCodes = options.acceptedExitCodes ?? [0];
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      ["--no-pager", "--literal-pathspecs", "-C", cwd, ...args],
      {
        encoding: "utf8",
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" },
        maxBuffer: options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES,
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        const exitCode = typeof error?.code === "number" ? error.code : error ? undefined : 0;
        if (!error || (exitCode !== undefined && acceptedExitCodes.includes(exitCode))) {
          resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
          return;
        }
        const detail = redactSensitiveText(stderr.trim() || error.message);
        reject(
          new GitReadError(
            detail ? `Git ${args[0]} failed: ${detail}` : `Git ${args[0]} failed.`,
            exitCode,
          ),
        );
      },
    );
  });
}
