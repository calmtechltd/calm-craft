import { createHash } from "node:crypto";

import type { SourceLocation, SpecFinding } from "./model";

export type FindingInput = Omit<SpecFinding, "id">;

export function createFinding(input: FindingInput): SpecFinding {
  const identity = [
    input.code,
    input.path,
    input.location?.line ?? 0,
    input.location?.column ?? 0,
    input.message,
  ].join("\u0000");
  const suffix = createHash("sha256").update(identity).digest("hex").slice(0, 16);
  return { id: `${input.code}:${suffix}`, ...input };
}

export function findingAt(
  path: string,
  code: string,
  severity: SpecFinding["severity"],
  message: string,
  location?: SourceLocation,
  hint?: string,
): SpecFinding {
  return createFinding({ code, severity, path, message, location, hint });
}

export function sortFindings(findings: SpecFinding[]): SpecFinding[] {
  return findings.toSorted(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      (left.location?.line ?? 0) - (right.location?.line ?? 0) ||
      left.code.localeCompare(right.code) ||
      left.id.localeCompare(right.id),
  );
}
