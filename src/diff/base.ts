import { runReadOnlyGit } from "../git/command";
import type { RepositoryInfo } from "../git/model";
import type { BaseResolution, BaseSource } from "./model";

export type ResolveBaseOptions = {
  explicitBase?: string;
  configuredBase?: string;
};

async function resolveCommit(
  repository: RepositoryInfo,
  reference: string,
): Promise<string | undefined> {
  const result = await runReadOnlyGit(
    repository.root,
    ["rev-parse", "--verify", "--end-of-options", `${reference}^{commit}`],
    { acceptedExitCodes: [0, 128] },
  );
  return result.exitCode === 0 ? result.stdout.trim() : undefined;
}

async function finishResolution(
  repository: RepositoryInfo,
  reference: string,
  source: BaseSource,
  attempted: string[],
): Promise<BaseResolution | undefined> {
  const selectedCommit = await resolveCommit(repository, reference);
  if (!selectedCommit) return undefined;
  const mergeBaseResult = await runReadOnlyGit(
    repository.root,
    ["merge-base", repository.head, selectedCommit],
    { acceptedExitCodes: [0, 1] },
  );
  if (mergeBaseResult.exitCode !== 0) {
    return {
      available: false,
      head: repository.head,
      selectedBase: reference,
      selectedCommit,
      source,
      attempted,
      reason: `No merge-base exists between HEAD and ${reference}.`,
    };
  }
  return {
    available: true,
    head: repository.head,
    selectedBase: reference,
    selectedCommit,
    mergeBase: mergeBaseResult.stdout.trim(),
    source,
    attempted,
  };
}

export async function resolveBase(
  repository: RepositoryInfo,
  options: ResolveBaseOptions = {},
): Promise<BaseResolution> {
  const attempted: string[] = [];
  if (options.explicitBase) {
    attempted.push(options.explicitBase);
    return (
      (await finishResolution(repository, options.explicitBase, "explicit", attempted)) ?? {
        available: false,
        head: repository.head,
        selectedBase: options.explicitBase,
        source: "explicit",
        attempted,
        reason: `Explicit base ${options.explicitBase} does not resolve to a commit.`,
      }
    );
  }

  if (options.configuredBase) {
    attempted.push(options.configuredBase);
    const configured = await finishResolution(
      repository,
      options.configuredBase,
      "configured",
      attempted,
    );
    if (configured) return configured;
  }

  const originHead = await runReadOnlyGit(
    repository.root,
    ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"],
    { acceptedExitCodes: [0, 1, 128] },
  );
  if (originHead.exitCode === 0) {
    const reference = originHead.stdout.trim().replace(/^refs\/remotes\//u, "");
    attempted.push(reference);
    const resolved = await finishResolution(repository, reference, "origin-head", attempted);
    if (resolved) return resolved;
  }

  const conventional = ["origin/main", "origin/master", "main", "master"].filter(
    (reference) => !attempted.includes(reference),
  );
  async function resolveConventional(index: number): Promise<BaseResolution | undefined> {
    const reference = conventional[index];
    if (!reference) return undefined;
    attempted.push(reference);
    const resolved = await finishResolution(repository, reference, "conventional", attempted);
    return resolved ?? resolveConventional(index + 1);
  }
  const resolvedConventional = await resolveConventional(0);
  if (resolvedConventional) return resolvedConventional;

  return {
    available: false,
    head: repository.head,
    attempted,
    reason: "No comparison base is available. Supply --base or configure defaultBase.",
  };
}
