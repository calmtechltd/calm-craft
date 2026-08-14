export type SpecStatus = "implemented" | "partial" | "future";
export type FindingSeverity = "error" | "warning" | "info";

export type SourceLocation = {
  line: number;
  column: number;
};

export type SpecFinding = {
  code: string;
  severity: FindingSeverity;
  path: string;
  message: string;
  location?: SourceLocation;
  hint?: string;
};

export type Behaviour = {
  key: string;
  number: number;
  suffix: string;
  title: string;
  status: SpecStatus;
  partialNote?: string;
  markdown: string;
  location: SourceLocation;
};

export type Invariant = {
  markdown: string;
  fingerprint: string;
  location: SourceLocation;
};

export type DecisionRow = {
  cells: string[];
  fingerprint: string;
  location: SourceLocation;
};

export type DecisionTable = {
  title?: string;
  headers: string[];
  rows: DecisionRow[];
  location: SourceLocation;
};

export type OpenQuestion = {
  markdown: string;
  resolved: boolean;
  blocks: string[];
  location: SourceLocation;
};

export type SpecLink = {
  label: string;
  target: string;
  location: SourceLocation;
};

export type FlowReference = {
  id: string;
  name: string;
  contractPath: string;
  diagramPath: string;
  coverageText?: string;
  location: SourceLocation;
};

export type FlowState = {
  id: string;
  kind: "screen" | "action" | "terminal";
  label: string;
  outcome?: string;
};

export type FlowTransition = {
  id: string;
  from: string;
  event: string;
  to: string;
  guard?: string;
  outcome?: string;
  covers: string[];
};

export type Flow = {
  id: string;
  name: string;
  start: string;
  states: FlowState[];
  transitions: FlowTransition[];
};

export type FlowContract = {
  version: number;
  flows: Flow[];
};

export type ParsedFlowContract = {
  path: string;
  diagramPath: string;
  sourceHash: string;
  contract: FlowContract;
};

export type SpecDocument = {
  id: string;
  area: string;
  status: SpecStatus;
  path: string;
  module: string;
  featureArea: string;
  name: string;
  title: string;
  descriptionMarkdown: string;
  behaviours: Behaviour[];
  invariants: Invariant[];
  decisionTables: DecisionTable[];
  flowReferences: FlowReference[];
  flows: ParsedFlowContract[];
  openQuestions: OpenQuestion[];
  futureConsiderationsMarkdown: string;
  outOfScopeMarkdown: string;
  links: SpecLink[];
  sourceHash: string;
  source: string;
  findings: SpecFinding[];
};

export type SpecEstate = {
  root: string;
  specsRoot: string;
  specs: SpecDocument[];
  findings: SpecFinding[];
};
