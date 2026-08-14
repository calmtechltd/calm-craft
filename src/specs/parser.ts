import { createHash } from "node:crypto";
import { basename, dirname, extname, posix } from "node:path";

import { parse } from "yaml";

import type {
  Behaviour,
  DecisionRow,
  DecisionTable,
  FlowReference,
  Invariant,
  OpenQuestion,
  SourceLocation,
  SpecDocument,
  SpecFinding,
  SpecLink,
  SpecStatus,
} from "./model";

const STATUS_FROM_EMOJI: Record<string, SpecStatus> = {
  "🟢": "implemented",
  "🟡": "partial",
  "🔵": "future",
};
const BEHAVIOUR_HEADING =
  /^###\s+(B(\d+)([a-z]?))\s*[—–-]\s*(.+?)\s+([🟢🟡🔵])\s+(implemented|partial|future)\s*$/u;
const RESOLVED_QUESTION = /^\*\*(Settled|Resolved|Decided|Moved|Answered)\b/u;
const BLOCKS_MARKER = /\*\*Blocks\s+(B\d+[a-z]?(?:\s*,\s*B\d+[a-z]?)*)\s*:?\*\*/u;
const REQUIRED_FRONTMATTER = ["id", "area", "status"] as const;

type Section = {
  name: string;
  markdown: string;
  lines: string[];
  headingLine: number;
  contentLine: number;
};

export type ParseSpecInput = {
  path: string;
  source: string;
};

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function location(line: number, column = 1): SourceLocation {
  return { line, column };
}

function finding(
  path: string,
  code: string,
  severity: SpecFinding["severity"],
  message: string,
  line?: number,
  hint?: string,
): SpecFinding {
  return {
    code,
    severity,
    path,
    message,
    location: line === undefined ? undefined : location(line),
    hint,
  };
}

function splitFrontmatter(path: string, source: string, findings: SpecFinding[]) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u);
  if (!match) {
    findings.push(
      finding(path, "frontmatter.missing", "error", "The spec has no YAML frontmatter.", 1),
    );
    return { body: source, bodyStartLine: 1, frontmatter: {} as Record<string, unknown> };
  }
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed: unknown = parse(match[1] ?? "");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    } else {
      findings.push(
        finding(path, "frontmatter.invalid", "error", "Frontmatter must be a YAML object.", 2),
      );
    }
  } catch (error) {
    findings.push(
      finding(
        path,
        "frontmatter.invalid",
        "error",
        `Frontmatter could not be parsed: ${String(error)}`,
        2,
      ),
    );
  }
  const body = source.slice(match[0].length);
  const bodyStartLine = match[0].split(/\r?\n/u).length;
  return { body, bodyStartLine, frontmatter };
}

function splitSections(body: string, bodyStartLine: number) {
  const lines = body.split(/\r?\n/u);
  const titleIndex = lines.findIndex((line) => line.startsWith("# "));
  const title = titleIndex >= 0 ? (lines[titleIndex]?.slice(2).trim() ?? "") : "";
  const firstSectionIndex = lines.findIndex((line) => line.startsWith("## "));
  const descriptionStart = titleIndex >= 0 ? titleIndex + 1 : 0;
  const descriptionEnd = firstSectionIndex >= 0 ? firstSectionIndex : lines.length;
  const descriptionMarkdown = lines.slice(descriptionStart, descriptionEnd).join("\n").trim();
  const sections = new Map<string, Section>();

  let index = firstSectionIndex >= 0 ? firstSectionIndex : lines.length;
  while (index < lines.length) {
    const heading = lines[index];
    if (!heading?.startsWith("## ")) {
      index += 1;
      continue;
    }
    const name = heading.slice(3).trim();
    const headingLine = bodyStartLine + index;
    index += 1;
    const contentStartIndex = index;
    while (index < lines.length && !lines[index]?.startsWith("## ")) index += 1;
    const sectionLines = lines.slice(contentStartIndex, index);
    sections.set(name, {
      name,
      markdown: sectionLines.join("\n").trim(),
      lines: sectionLines,
      headingLine,
      contentLine: bodyStartLine + contentStartIndex,
    });
  }
  return { title, descriptionMarkdown, sections };
}

function parseBehaviours(
  path: string,
  section: Section | undefined,
  findings: SpecFinding[],
): Behaviour[] {
  if (!section || section.markdown === "_None._") return [];
  const behaviours: Behaviour[] = [];
  let index = 0;
  while (index < section.lines.length) {
    const line = section.lines[index] ?? "";
    const match = line.match(BEHAVIOUR_HEADING);
    if (!match) {
      if (/^###\s+B\d+/u.test(line)) {
        findings.push(
          finding(
            path,
            "behaviour.heading.invalid",
            "error",
            `Behaviour heading does not match the CalmCraft format: ${line}`,
            section.contentLine + index,
          ),
        );
      }
      index += 1;
      continue;
    }

    const [, key = "", number = "0", suffix = "", title = "", emoji = "", statusWord = "future"] =
      match;
    const headingLine = section.contentLine + index;
    index += 1;
    while (section.lines[index]?.trim() === "") index += 1;

    const noteLines: string[] = [];
    while (section.lines[index]?.startsWith(">")) {
      noteLines.push((section.lines[index] ?? "").replace(/^>\s?/u, "").trim());
      index += 1;
    }

    const bodyLines: string[] = [];
    while (index < section.lines.length && !/^###\s+B\d+/u.test(section.lines[index] ?? "")) {
      bodyLines.push(section.lines[index] ?? "");
      index += 1;
    }
    const status = statusWord as SpecStatus;
    const emojiStatus = STATUS_FROM_EMOJI[emoji];
    if (emojiStatus !== status) {
      findings.push(
        finding(
          path,
          "behaviour.status-symbol-mismatch",
          "warning",
          `${key} uses ${emoji} with the ${status} status.`,
          headingLine,
        ),
      );
    }
    behaviours.push({
      key,
      number: Number(number),
      suffix,
      title: title.trim(),
      status,
      partialNote: noteLines.length > 0 ? noteLines.join(" ") : undefined,
      markdown: bodyLines.join("\n").trim(),
      location: location(headingLine),
    });
  }
  return behaviours.toSorted(
    (left, right) => left.number - right.number || left.suffix.localeCompare(right.suffix),
  );
}

function parseTopLevelList(section: Section | undefined) {
  if (!section || section.markdown === "_None._") return [];
  const items: { markdown: string; line: number }[] = [];
  let current: { lines: string[]; line: number } | undefined;
  for (const [index, line] of section.lines.entries()) {
    if (line.startsWith("- ")) {
      if (current) items.push({ markdown: current.lines.join("\n").trim(), line: current.line });
      current = { lines: [line.slice(2)], line: section.contentLine + index };
    } else if (current && (line.startsWith("  ") || line.trim() === "")) {
      current.lines.push(line.trimEnd());
    }
  }
  if (current) items.push({ markdown: current.lines.join("\n").trim(), line: current.line });
  return items;
}

function parseInvariants(section: Section | undefined): Invariant[] {
  return parseTopLevelList(section).map((item) => ({
    markdown: item.markdown,
    fingerprint: hash(item.markdown.trim().toLocaleLowerCase()),
    location: location(item.line),
  }));
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparatorRow(line: string): boolean {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function parseDecisionTables(section: Section | undefined): DecisionTable[] {
  if (!section || section.markdown === "_None._") return [];
  const tables: DecisionTable[] = [];
  let title: string | undefined;
  let index = 0;
  while (index < section.lines.length) {
    const line = section.lines[index] ?? "";
    if (line.startsWith("### ")) {
      title = line.slice(4).trim();
      index += 1;
      continue;
    }
    const separator = section.lines[index + 1] ?? "";
    if (!line.includes("|") || !isSeparatorRow(separator)) {
      index += 1;
      continue;
    }
    const tableLine = section.contentLine + index;
    const headers = splitTableRow(line);
    index += 2;
    const rows: DecisionRow[] = [];
    while (index < section.lines.length && (section.lines[index] ?? "").includes("|")) {
      const cells = splitTableRow(section.lines[index] ?? "");
      rows.push({
        cells,
        fingerprint: hash(cells.map((cell) => cell.toLocaleLowerCase()).join("\u0000")),
        location: location(section.contentLine + index),
      });
      index += 1;
    }
    tables.push({ title, headers, rows, location: location(tableLine) });
  }
  return tables;
}

function parseQuestions(section: Section | undefined): OpenQuestion[] {
  return parseTopLevelList(section).map((item) => {
    const blocksMatch = item.markdown.match(BLOCKS_MARKER);
    const blocks = blocksMatch?.[1]?.split(",").map((value) => value.trim()) ?? [];
    return {
      markdown: item.markdown,
      resolved: RESOLVED_QUESTION.test(item.markdown),
      blocks,
      location: location(item.line),
    };
  });
}

function parseLinks(source: string): SpecLink[] {
  const links: SpecLink[] = [];
  const lines = source.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    for (const match of line.matchAll(/\[([^\]]+)\]\(([^)]+)\)/gu)) {
      links.push({
        label: match[1] ?? "",
        target: match[2] ?? "",
        location: location(index + 1, (match.index ?? 0) + 1),
      });
    }
  }
  return links;
}

function parseFlowReferences(section: Section | undefined): FlowReference[] {
  if (!section || section.markdown === "_None._") return [];
  const references: FlowReference[] = [];
  for (const [index, line] of section.lines.entries()) {
    const match = line.match(
      /^-\s+\*\*(F\d+)\s*[—–-]\s*(.+?):\*\*\s+\[contract\]\(([^)]+\.flow\.yaml)\)\s*[·|]\s*\[diagram\]\(([^)]+\.flow\.mmd)\)(?:\s*[—–-]\s*covers\s+(.+))?$/u,
    );
    if (!match) continue;
    references.push({
      id: match[1] ?? "",
      name: match[2]?.trim() ?? "",
      contractPath: match[3] ?? "",
      diagramPath: match[4] ?? "",
      coverageText: match[5]?.trim(),
      location: location(section.contentLine + index),
    });
  }
  return references;
}

function stringField(
  path: string,
  frontmatter: Record<string, unknown>,
  key: (typeof REQUIRED_FRONTMATTER)[number],
  fallback: string,
  findings: SpecFinding[],
): string {
  const value = frontmatter[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  findings.push(
    finding(
      path,
      `frontmatter.${key}.missing`,
      "error",
      `Frontmatter field ${key} is required.`,
      2,
    ),
  );
  return fallback;
}

function derivePathIdentity(path: string) {
  const parts = path.split("/");
  const fileName = parts.at(-1) ?? path;
  const name = basename(fileName, extname(fileName));
  return {
    module: parts[0] ?? "root",
    featureArea: parts.length > 2 ? (parts.at(-2) ?? "root") : "root",
    name,
    fallbackId: path.replace(/\.md$/u, "").replaceAll("/", "-"),
  };
}

export function parseSpecDocument(input: ParseSpecInput): SpecDocument {
  const findings: SpecFinding[] = [];
  const { body, bodyStartLine, frontmatter } = splitFrontmatter(input.path, input.source, findings);
  const { title, descriptionMarkdown, sections } = splitSections(body, bodyStartLine);
  const identity = derivePathIdentity(input.path);
  const id = stringField(input.path, frontmatter, "id", identity.fallbackId, findings);
  const area = stringField(input.path, frontmatter, "area", identity.module, findings);
  const rawStatus = stringField(input.path, frontmatter, "status", "future", findings);
  const status: SpecStatus = ["implemented", "partial", "future"].includes(rawStatus)
    ? (rawStatus as SpecStatus)
    : "future";
  if (status !== rawStatus) {
    findings.push(
      finding(
        input.path,
        "frontmatter.status.invalid",
        "error",
        `Unsupported spec status ${rawStatus}.`,
        2,
      ),
    );
  }
  if (!title)
    findings.push(
      finding(input.path, "title.missing", "error", "The spec has no level-one title."),
    );

  return {
    id,
    area,
    status,
    path: input.path,
    module: identity.module,
    featureArea: identity.featureArea,
    name: identity.name,
    title: title || identity.name,
    descriptionMarkdown,
    behaviours: parseBehaviours(input.path, sections.get("Behaviours"), findings),
    invariants: parseInvariants(sections.get("Rules (Invariants)")),
    decisionTables: parseDecisionTables(sections.get("Decision Tables")),
    flowReferences: parseFlowReferences(sections.get("User Flows")),
    flows: [],
    openQuestions: parseQuestions(sections.get("Open Questions")),
    futureConsiderationsMarkdown: sections.get("Future Considerations")?.markdown ?? "",
    outOfScopeMarkdown: sections.get("Out of Scope")?.markdown ?? "",
    links: parseLinks(input.source),
    sourceHash: hash(input.source),
    source: input.source,
    findings,
  };
}

export function resolveSpecSiblingPath(specPath: string, siblingPath: string): string {
  return posix.normalize(posix.join(dirname(specPath), siblingPath));
}
