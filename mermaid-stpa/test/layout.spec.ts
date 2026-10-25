import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db.js';
import { layout } from '../src/layout.js';
import { parse } from '../src/parser.js';
import { DEFAULT_STPA_CONFIG } from '../src/types.js';
import { AEB, HIERARCHY } from './fixtures.js';

const measure = (t: string) => t.length * 7;
const run = (src: string) => {
  db.clear();
  parse(src);
  return layout(db.getNodes(), db.getEdges(), DEFAULT_STPA_CONFIG, measure);
};
const byId = (l: ReturnType<typeof run>, id: string) => l.nodes.find((n) => n.node.id === id)!;

const orthogonal = (pts: [number, number][]) => pts.every((p, i) => i === 0 || p[0] === pts[i - 1]![0] || p[1] === pts[i - 1]![1]);
const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('layout', () => {
  beforeEach(() => db.clear());

  it('places the controller above the process and routes straight vertical lines', () => {
    const l = run(AEB);
    const aeb = byId(l, 'aeb');
    const car = byId(l, 'car');
    expect(aeb.y).toBeLessThan(car.y);
    expect(l.edges).toHaveLength(2);
    for (const e of l.edges) {
      expect(e.points).toHaveLength(2);
      expect(e.points[0]![0]).toBe(e.points[1]![0]);
    }
    const control = l.edges.find((e) => e.kind === 'control')!;
    const feedback = l.edges.find((e) => e.kind === 'feedback')!;
    expect(control.points[0]![1]).toBeLessThan(control.points[1]![1]);
    expect(feedback.points[0]![1]).toBeGreaterThan(feedback.points[1]![1]);
    expect(control.points[0]![0]).toBeLessThan(feedback.points[0]![0]);
    expect(feedback.labels).toEqual(['Wheel speed', 'Radar range']);
  });

  it('ranks controllers by authority and keeps all routes orthogonal and outside other nodes', () => {
    const l = run(HIERARCHY);
    expect(byId(l, 'ops').y).toBeLessThan(byId(l, 'ctl').y);
    expect(byId(l, 'ctl').y).toBeLessThan(byId(l, 'xing').y);
    for (const e of l.edges) {
      expect(orthogonal(e.points)).toBe(true);
      const mid = e.points.slice(1, -1);
      for (const [px, py] of mid) {
        for (const n of l.nodes) {
          expect(px > n.x && px < n.x + n.w && py > n.y && py < n.y + n.h).toBe(false);
        }
      }
    }
    for (const a of l.nodes) for (const b of l.nodes) if (a !== b) expect(overlaps(a, b)).toBe(false);
  });

  it('routes a row-skipping control action around the node in between', () => {
    const l = run(HIERARCHY);
    const skip = l.edges.find((e) => e.source === 'ops' && e.target === 'xing')!;
    expect(skip.points.length).toBeGreaterThan(2);
    const ctl = byId(l, 'ctl');
    const segs = skip.points.slice(1).map((p, i) => [skip.points[i]!, p] as const);
    for (const [a, b] of segs) {
      if (a[0] !== b[0]) continue;
      const [y0, y1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
      const crosses = a[0] > ctl.x && a[0] < ctl.x + ctl.w && y0 < ctl.y + ctl.h && y1 > ctl.y;
      expect(crosses).toBe(false);
    }
  });

  it('keeps everything inside the reported size', () => {
    const l = run(HIERARCHY);
    for (const n of l.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w).toBeLessThanOrEqual(l.width);
      expect(n.y + n.h).toBeLessThanOrEqual(l.height);
    }
    for (const e of l.edges) for (const [x, y] of e.points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(l.width);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(l.height);
    }
  });

  it('arches same-row feedback above the row', () => {
    const l = run('stpa-beta\ncontroller a\ncontroller b\nb -.->|peer| a');
    const e = l.edges[0]!;
    expect(orthogonal(e.points)).toBe(true);
    expect(Math.min(...e.points.map((p) => p[1]))).toBeLessThan(byId(l, 'a').y);
  });

  it('survives control cycles and empty diagrams', () => {
    expect(() => run('stpa-beta\ncontroller a\ncontroller b\na --> b\nb --> a')).not.toThrow();
    expect(run('stpa-beta').nodes).toEqual([]);
  });
});
