import type { ExternalDiagramDefinition } from 'mermaid';

export type DiagramDefinition = Awaited<ReturnType<ExternalDiagramDefinition['loader']>>['diagram'];

export type StpaNodeKind = 'controller' | 'process';
export type StpaEdgeKind = 'control' | 'feedback';

export interface StpaNode {
  id: string;
  label: string;
  kind: StpaNodeKind;
  line: number;
}

export interface StpaEdge {
  id: string;
  kind: StpaEdgeKind;
  source: string;
  target: string;
  label: string;
  line: number;
}

export interface StpaDiagramConfig {
  useMaxWidth: boolean;
  nodeMinWidth: number;
  nodeHeight: number;
  rowGap: number;
  padding: number;
}

export const DEFAULT_STPA_CONFIG: StpaDiagramConfig = {
  useMaxWidth: true,
  nodeMinWidth: 140,
  nodeHeight: 56,
  rowGap: 90,
  padding: 24,
};
