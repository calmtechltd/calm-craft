import { createHash } from "node:crypto";
import { basename, dirname, extname, posix } from "node:path";

import { parse } from "yaml";

import { findingAt } from "./findings";
import { renderMarkdown } from "./markdown";
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

function renderContent(
  path: string,
  markdown: string,
  line: number,
  findings: SpecFinding[],
): string {
  const rendered = renderMarkdown(markdown);
  if (rendered.changed) {
    findings.push(
      findingAt(
        path,
        "content.unsafe-removed",
        "warning",
        "Unsafe or unsupported Markdown content was removed before rendering.",
        location(line),
        "Remove active HTML, remote assets, event handlers, or unsafe URL schemes.",
      ),
    );
  }
  return rendered.html;
}

function splitFrontmatter(path: string, source: string, findings: SpecFinding[]) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/u);
  if (!match) {
    findings.push(
      findingAt(
        path,
        "frontmatter.missing",
        "error",
        "The spec has no YAML frontmatter.",
        location(1),
        "Add YAML frontmatter with id, area, and status fields.",
      ),
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
        findingAt(
          path,
          "frontmatter.invalid",
          "error",
          "Frontmatter must be a YAML object.",
          location(2),
          "Replace the frontmatter value with id, area, and status fields.",
        ),
      );
    }
  } catch (error) {
    findings.push(
      findingAt(
        path,
        "frontmatter.invalid",
        "error",
        `Frontmatter could not be parsed: ${String(error)}`,
        location(2),
        "Repair the YAML frontmatter before relying on its metadata.",
      ),
    );
  }

  return {
    body: source.slice(match[0].length),
    bodyStartLine: match[0].split(/\r?\n/u).length,
    frontmatter,
  };
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
          findingAt(
            path,
            "behaviour.heading.invalid",
            "error",
            `Behaviour heading does not match the CalmCraft format: ${line}`,
            location(section.contentLine + index),
            "Use `### B<n><suffix> — Title <status emoji> <status>`.",
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
    if (STATUS_FROM_EMOJI[emoji] !== status) {
      findings.push(
        findingAt(
          path,
          "behaviour.status-symbol-mismatch",
          "warning",
          `${key} uses ${emoji} with the ${status} status.`,
          location(headingLine),
          "Use 🟢 for implemented, 🟡 for partial, or 🔵 for future.",
        ),
      );
    }
    const markdown = bodyLines.join("\n").trim();
    behaviours.push({
      key,
      number: Number(number),
      suffix,
      title: title.trim(),
      status,
      partialNote: noteLines.length > 0 ? noteLines.join(" ") : undefined,
      markdown,
      renderedHtml: renderContent(path, markdown, headingLine + 1, findings),
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

function parseInvariants(
  path: string,
  section: Section | undefined,
  findings: SpecFinding[],
): Invariant[] {
  return parseTopLevelList(section).map((item) => ({
    markdown: item.markdown,
    renderedHtml: renderContent(path, item.markdown, item.line, findings),
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

function parseDecisionTables(
  path: string,
  section: Section | undefined,
  findings: SpecFinding[],
): DecisionTable[] {
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
      if (line.startsWith("|") && separator.startsWith("|")) {
        findings.push(
          findingAt(
            path,
            "decision-table.separator.invalid",
            "warning",
            "A Markdown table has an invalid separator row.",
            location(section.contentLine + index + 1),
            "Use at least three hyphens in every separator cell.",
          ),
        );
        index += 2;
        continue;
      }
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

function parseQuestions(
  path: string,
  section: Section | undefined,
  findings: SpecFinding[],
): OpenQuestion[] {
  return parseTopLevelList(section).map((item) => {
    const blocksMatch = item.markdown.match(BLOCKS_MARKER);
    return {
      markdown: item.markdown,
      renderedHtml: renderContent(path, item.markdown, item.line, findings),
      resolved: RESOLVED_QUESTION.test(item.markdown),
      blocks: blocksMatch?.[1]?.split(",").map((value) => value.trim()) ?? [],
      location: location(item.line),
    };
  });
}

function parseLinks(source: string): SpecLink[] {
  const links: SpecLink[] = [];
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
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
    findingAt(
      path,
      `frontmatter.${key}.missing`,
      "error",
      `Frontmatter field ${key} is required.`,
      location(2),
      `Add a non-empty ${key} field to the YAML frontmatter.`,
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
      findingAt(
        input.path,
        "frontmatter.status.invalid",
        "error",
        `Unsupported spec status ${rawStatus}.`,
        location(2),
        "Use implemented, partial, or future.",
      ),
    );
  }
  if (!title) {
    findings.push(
      findingAt(
        input.path,
        "title.missing",
        "error",
        "The spec has no level-one title.",
        undefined,
        "Add one `# Title` heading before the spec sections.",
      ),
    );
  }

  const futureConsiderationsMarkdown = sections.get("Future Considerations")?.markdown ?? "";
  const outOfScopeMarkdown = sections.get("Out of Scope")?.markdown ?? "";
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
    descriptionHtml: renderContent(input.path, descriptionMarkdown, bodyStartLine + 1, findings),
    sectionNames: [...sections.keys()],
    behaviours: parseBehaviours(input.path, sections.get("Behaviours"), findings),
    invariants: parseInvariants(input.path, sections.get("Rules (Invariants)"), findings),
    decisionTables: parseDecisionTables(input.path, sections.get("Decision Tables"), findings),
    flowReferences: parseFlowReferences(sections.get("User Flows")),
    flows: [],
    openQuestions: parseQuestions(input.path, sections.get("Open Questions"), findings),
    futureConsiderationsMarkdown,
    futureConsiderationsHtml: renderContent(
      input.path,
      futureConsiderationsMarkdown,
      sections.get("Future Considerations")?.contentLine ?? 1,
      findings,
    ),
    outOfScopeMarkdown,
    outOfScopeHtml: renderContent(
      input.path,
      outOfScopeMarkdown,
      sections.get("Out of Scope")?.contentLine ?? 1,
      findings,
    ),
    links: parseLinks(input.source),
    forwardLinks: [],
    backlinks: [],
    sourceHash: hash(input.source),
    source: input.source,
    findings,
  };
}

export function resolveSpecSiblingPath(specPath: string, siblingPath: string): string {
  return posix.normalize(posix.join(dirname(specPath), siblingPath));
}
