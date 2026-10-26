import mermaid from 'mermaid';
import { beforeAll, describe, expect, it } from 'vitest';
import stpa from '../src/index.js';
import { AEB } from './fixtures.js';

beforeAll(async () => {
  await mermaid.registerExternalDiagrams([stpa]);
});

describe('registered with mermaid', () => {
  it('parses a valid diagram and reports its type', async () => {
    const res = await mermaid.parse(AEB);
    expect(res).toMatchObject({ diagramType: 'stpa' });
  });

  it('rejects an invalid diagram with a line number', async () => {
    await expect(mermaid.parse('stpa-beta\ncontroller c\nc --> nowhere')).rejects.toThrow(/line 3/);
  });

  it('does not claim other diagram types', async () => {
    expect(await mermaid.parse('flowchart TD\n a --> b')).toMatchObject({ diagramType: 'flowchart-v2' });
  });
});
