import type { ExternalDiagramDefinition } from 'mermaid';

export const detector: ExternalDiagramDefinition['detector'] = (text) => /^\s*stpa(-beta)?(\s|$)/.test(text);
