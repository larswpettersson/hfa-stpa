import type { ExternalDiagramDefinition } from 'mermaid';
import { detector } from './detector.js';

export const id = 'stpa';

const stpa: ExternalDiagramDefinition = {
  id,
  detector,
  loader: async () => {
    const { diagram } = await import('./diagram.js');
    return { id, diagram };
  },
};

export { detector };
export default stpa;
