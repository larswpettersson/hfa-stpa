import type { DiagramDefinition, StpaDiagramConfig, StpaEdge, StpaEdgeKind, StpaNode, StpaNodeKind } from './types.js';
import { DEFAULT_STPA_CONFIG } from './types.js';

type DB = DiagramDefinition['db'];

let getMermaidConfig: () => any = () => ({});
export const setConfigProvider = (fn: () => any): void => {
  getMermaidConfig = fn;
};
export const getSiteConfig = (): any => getMermaidConfig() ?? {};

let nodes = new Map<string, StpaNode>();
let edges: StpaEdge[] = [];
let diagramTitle = '';
let accTitle = '';
let accDescription = '';

const counters: Record<StpaEdgeKind, number> = { control: 0, feedback: 0 };
const ID_PREFIX: Record<StpaEdgeKind, string> = { control: 'ca', feedback: 'fb' };

export const clear = (): void => {
  nodes = new Map();
  edges = [];
  diagramTitle = '';
  accTitle = '';
  accDescription = '';
  counters.control = 0;
  counters.feedback = 0;
};

export const addNode = (kind: StpaNodeKind, id: string, label: string | undefined, line: number): void => {
  if (nodes.has(id)) {
    throw new Error(`Parse error on line ${line}: "${id}" is already declared on line ${nodes.get(id)!.line}`);
  }
  nodes.set(id, { id, kind, label: label || id, line });
};

export const addEdge = (kind: StpaEdgeKind, source: string, target: string, label: string | undefined, line: number): void => {
  const n = ++counters[kind];
  edges.push({ id: `${ID_PREFIX[kind]}${n}`, kind, source, target, label: label ?? '', line });
};

export const getNodes = (): StpaNode[] => [...nodes.values()];
export const getEdges = (): StpaEdge[] => [...edges];

export const validate = (): void => {
  for (const e of edges) {
    const src = nodes.get(e.source);
    const dst = nodes.get(e.target);
    const what = e.kind === 'control' ? 'Control action' : 'Feedback';
    if (!src) throw new Error(`Parse error on line ${e.line}: ${what} source "${e.source}" is not declared`);
    if (!dst) throw new Error(`Parse error on line ${e.line}: ${what} target "${e.target}" is not declared`);
    if (src === dst) throw new Error(`Parse error on line ${e.line}: ${what} cannot connect "${e.source}" to itself`);
    if (e.kind === 'control' && src.kind !== 'controller') {
      throw new Error(`Parse error on line ${e.line}: control action source "${e.source}" must be a controller`);
    }
    if (e.kind === 'feedback' && dst.kind !== 'controller') {
      throw new Error(`Parse error on line ${e.line}: feedback target "${e.target}" must be a controller`);
    }
  }
};

export const getConfig = (): StpaDiagramConfig => ({
  ...DEFAULT_STPA_CONFIG,
  ...(getMermaidConfig()?.stpa ?? {}),
});

export const db = {
  clear,
  addNode,
  addEdge,
  getNodes,
  getEdges,
  validate,
  getConfig,
  setDiagramTitle: (t: string) => {
    diagramTitle = t.trim();
  },
  getDiagramTitle: () => diagramTitle,
  setAccTitle: (t: string) => {
    accTitle = t.trim();
  },
  getAccTitle: () => accTitle,
  setAccDescription: (t: string) => {
    accDescription = t.trim();
  },
  getAccDescription: () => accDescription,
} satisfies DB & Record<string, unknown>;

export type StpaDB = typeof db;
