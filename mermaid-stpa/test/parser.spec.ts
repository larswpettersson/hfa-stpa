import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db.js';
import { parse } from '../src/parser.js';
import { AEB } from './fixtures.js';

beforeEach(() => db.clear());

describe('parser', () => {
  it('parses nodes, edges, title and accessibility fields', () => {
    parse(AEB);
    expect(db.getNodes().map((n) => [n.id, n.kind, n.label])).toEqual([
      ['aeb', 'controller', 'AEB controller'],
      ['car', 'process', 'Vehicle'],
    ]);
    expect(db.getEdges().map((e) => [e.id, e.kind, e.source, e.target, e.label])).toEqual([
      ['ca1', 'control', 'aeb', 'car', 'Brake request'],
      ['fb1', 'feedback', 'car', 'aeb', 'Wheel speed'],
      ['fb2', 'feedback', 'car', 'aeb', 'Radar range'],
    ]);
    expect(db.getDiagramTitle()).toBe('Automatic Emergency Braking');
    expect(db.getAccTitle()).toBe('AEB control structure');
    expect(db.getAccDescription()).toMatch(/AEB controller commands/);
  });

  it('defaults the label to the id and accepts unquoted labels and unlabelled edges', () => {
    parse('stpa-beta\ncontroller c\nprocess p[Plant]\nc --> p\np -.->|speed| c');
    expect(db.getNodes().map((n) => n.label)).toEqual(['c', 'Plant']);
    expect(db.getEdges().map((e) => e.label)).toEqual(['', 'speed']);
  });

  it('supports multi-line accDescr and comments', () => {
    parse('stpa-beta\n%% a comment\naccDescr {\n  line one\n  line two\n}\ncontroller c\nprocess p\nc --> p');
    expect(db.getAccDescription()).toBe('line one\nline two');
  });

  it('accepts the bare "stpa" keyword', () => {
    expect(() => parse('stpa\ncontroller c\nprocess p\nc --> p')).not.toThrow();
  });

  const bad: [string, string, RegExp][] = [
    ['missing header', 'controller c', /expected "stpa-beta"/],
    ['empty text', '', /missing "stpa-beta" header/],
    ['unknown statement', 'stpa-beta\nfoo bar', /line 2: unexpected "foo bar"/],
    ['duplicate id', 'stpa-beta\ncontroller c\nprocess c', /line 3: "c" is already declared on line 2/],
    ['undeclared source', 'stpa-beta\nprocess p\nx --> p', /line 3: Control action source "x" is not declared/],
    ['undeclared target', 'stpa-beta\ncontroller c\nc --> y', /line 3: Control action target "y" is not declared/],
    ['process as control source', 'stpa-beta\nprocess p\ncontroller c\np --> c', /control action source "p" must be a controller/],
    ['feedback into process', 'stpa-beta\nprocess p\ncontroller c\nc -.-> p', /feedback target "p" must be a controller/],
    ['self loop', 'stpa-beta\ncontroller c\nc --> c', /cannot connect "c" to itself/],
    ['unclosed accDescr', 'stpa-beta\naccDescr {\nfoo', /missing its closing/],
  ];
  it.each(bad)('rejects %s', (_name, text, re) => {
    expect(() => parse(text)).toThrow(re);
  });
});
