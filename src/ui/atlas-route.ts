import type { SpecStatus } from "../specs/model";

export type AtlasSelection = {
  search?: string;
  module?: string;
  status?: SpecStatus;
  blockers?: boolean;
  findings?: boolean;
  changed?: boolean;
};

export function parseAtlasSelection(parameters: URLSearchParams): AtlasSelection {
  const selection: AtlasSelection = {};
  const search = parameters.get("search")?.trim();
  const module = parameters.get("module")?.trim();
  const status = parameters.get("status");
  if (search) selection.search = search;
  if (module) selection.module = module;
  if (status === "implemented" || status === "partial" || status === "future") {
    selection.status = status;
  }
  if (parameters.get("blockers") === "1") selection.blockers = true;
  if (parameters.get("findings") === "1") selection.findings = true;
  if (parameters.get("changed") === "1") selection.changed = true;
  return selection;
}

export function atlasHref(selection: AtlasSelection = {}): string {
  const parameters = new URLSearchParams();
  if (selection.search) parameters.set("search", selection.search);
  if (selection.module) parameters.set("module", selection.module);
  if (selection.status) parameters.set("status", selection.status);
  if (selection.blockers) parameters.set("blockers", "1");
  if (selection.findings) parameters.set("findings", "1");
  if (selection.changed) parameters.set("changed", "1");
  return parameters.size > 0 ? `#/atlas?${parameters}` : "#/atlas";
}
