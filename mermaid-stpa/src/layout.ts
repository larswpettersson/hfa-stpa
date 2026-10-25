import type { StpaDiagramConfig, StpaEdge, StpaNode } from './types.js';

export type Point = [number, number];

export interface PlacedNode {
  node: StpaNode;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlacedEdge {
  kind: StpaEdge['kind'];
  source: string;
  target: string;
  edgeIds: string[];
  points: Point[];
  labels: string[];
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
}

export interface Layout {
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  width: number;
  height: number;
}

export interface TextMeasurer {
  (text: string, bold: boolean): number;
}

const LANE = 24;
const EDGE_PAD = 18;
const GAP_X = 60;
const CH_GAP = 36;
const LINE_H = 14;
const NODE_PAD_X = 16;
const SIDE_LANE_MARGIN = 28;

interface Group {
  kind: StpaEdge['kind'];
  source: PlacedNode;
  target: PlacedNode;
  edges: StpaEdge[];
}

interface Channel {
  upper: PlacedNode;
  lower: PlacedNode;
  groups: Group[];
  skip: boolean;
  laneRight: boolean;
  relU: number;
  relL: number;
}

export function layout(nodes: StpaNode[], edges: StpaEdge[], cfg: StpaDiagramConfig, measure: TextMeasurer): Layout {
  const placed = new Map<string, PlacedNode>();
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Rank controllers: 1 + the highest rank among controllers that command them. Processes share the bottom row.
  const rank = new Map<string, number>();
  const controllers = nodes.filter((n) => n.kind === 'controller');
  controllers.forEach((c) => rank.set(c.id, 0));
  for (let pass = 0; pass < controllers.length; pass++) {
    let changed = false;
    for (const e of edges) {
      if (e.kind !== 'control' || byId.get(e.target)?.kind !== 'controller') continue;
      const next = Math.min(controllers.length - 1, rank.get(e.source)! + 1);
      if (next > rank.get(e.target)!) {
        rank.set(e.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const processRow = controllers.length ? Math.max(...rank.values()) + 1 : 0;
  const rows: PlacedNode[][] = [];
  for (const n of nodes) {
    const row = n.kind === 'controller' ? rank.get(n.id)! : processRow;
    const w = Math.max(cfg.nodeMinWidth, measure(n.label, true) + 2 * NODE_PAD_X, measure(n.kind === 'controller' ? 'Controller' : 'Controlled process', false) + 2 * NODE_PAD_X);
    const p: PlacedNode = { node: n, row, x: 0, y: 0, w, h: cfg.nodeHeight };
    placed.set(n.id, p);
    (rows[row] ??= []).push(p);
  }
  for (let r = 0; r < rows.length; r++) rows[r] ??= [];

  // Edge groups: one line per (kind, source, target); parallel edges stack their labels.
  const groupMap = new Map<string, Group>();
  for (const e of edges) {
    const key = `${e.kind}|${e.source}|${e.target}`;
    let g = groupMap.get(key);
    if (!g) {
      g = { kind: e.kind, source: placed.get(e.source)!, target: placed.get(e.target)!, edges: [] };
      groupMap.set(key, g);
    }
    g.edges.push(e);
  }
  const groups = [...groupMap.values()];
  const flat = groups.filter((g) => g.source.row === g.target.row);
  const channelMap = new Map<string, Channel>();
  for (const g of groups) {
    if (g.source.row === g.target.row) continue;
    const [upper, lower] = g.source.row < g.target.row ? [g.source, g.target] : [g.target, g.source];
    const key = `${upper.node.id}|${lower.node.id}`;
    let ch = channelMap.get(key);
    if (!ch) {
      ch = { upper, lower, groups: [], skip: lower.row - upper.row > 1, laneRight: true, relU: 0, relL: 0 };
      channelMap.set(key, ch);
    }
    ch.groups.push(g);
  }
  const channels = [...channelMap.values()];
  for (const ch of channels) ch.groups.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'control' ? -1 : 1));
  const span = (ch: Channel) => (ch.groups.length - 1) * LANE;

  // Every channel gets its own port on each node, so nodes are widened until all their ports fit.
  const bottomOf = new Map<PlacedNode, Channel[]>();
  const topOf = new Map<PlacedNode, Channel[]>();
  for (const ch of channels) {
    (bottomOf.get(ch.upper) ?? bottomOf.set(ch.upper, []).get(ch.upper)!).push(ch);
    (topOf.get(ch.lower) ?? topOf.set(ch.lower, []).get(ch.lower)!).push(ch);
  }
  const portsWidth = (list: Channel[]) => list.reduce((s, ch) => s + span(ch), 0) + (list.length - 1) * CH_GAP;
  for (const p of placed.values()) {
    const need = Math.max(portsWidth(bottomOf.get(p) ?? []), portsWidth(topOf.get(p) ?? [])) + 2 * EDGE_PAD;
    p.w = Math.max(p.w, need);
  }
  const center = (p: PlacedNode) => p.x + p.w / 2;
  const assignPorts = () => {
    for (const ch of channels) ch.laneRight = center(ch.lower) >= center(ch.upper);
    const place = (p: PlacedNode, list: Channel[], other: (ch: Channel) => PlacedNode, set: (ch: Channel, v: number) => void) => {
      const key = (ch: Channel) => (ch.skip ? (ch.laneRight ? 1e9 : -1e9) : center(other(ch)));
      list.sort((a, b) => key(a) - key(b));
      let off = (p.w - portsWidth(list)) / 2;
      for (const ch of list) {
        set(ch, off);
        off += span(ch) + CH_GAP;
      }
    };
    bottomOf.forEach((list, p) => place(p, list, (ch) => ch.lower, (ch, v) => (ch.relU = v)));
    topOf.forEach((list, p) => place(p, list, (ch) => ch.upper, (ch, v) => (ch.relL = v)));
  };

  // Horizontal placement: order rows by the mean position of the nodes above, then pull each node so its ports line up.
  const neighbours = (p: PlacedNode, above: boolean) =>
    channels.flatMap((ch) => (above ? (ch.lower === p ? [ch.upper] : []) : ch.upper === p ? [ch.lower] : []));
  const packRow = (row: PlacedNode[], desired: (p: PlacedNode) => number | undefined) => {
    let cursor = -Infinity;
    let drift = 0;
    let counted = 0;
    for (const p of row) {
      const want = desired(p);
      p.x = want === undefined ? (cursor === -Infinity ? 0 : cursor) : Math.max(want, cursor);
      cursor = p.x + p.w + GAP_X;
      if (want !== undefined) {
        drift += want - p.x;
        counted++;
      }
    }
    const shift = counted ? drift / counted : 0;
    for (const p of row) p.x += shift;
  };
  const desiredLeft = (p: PlacedNode, down: boolean): number | undefined => {
    const all = (down ? topOf : bottomOf).get(p) ?? [];
    const use = all.filter((ch) => !ch.skip);
    const list = use.length ? use : all;
    if (!list.length) return undefined;
    const xs = list.map((ch) => (down ? ch.upper.x + ch.relU - ch.relL : ch.lower.x + ch.relL - ch.relU));
    return xs.reduce((s, v) => s + v, 0) / xs.length;
  };
  rows.forEach((row, r) => {
    if (r === 0) return;
    const key = (p: PlacedNode) => {
      const ups = neighbours(p, true);
      return ups.length ? ups.reduce((s, u) => s + rows[u.row]!.indexOf(u), 0) / ups.length : rows[r]!.indexOf(p);
    };
    row.sort((a, b) => key(a) - key(b));
  });
  packRow(rows[0] ?? [], () => undefined);
  for (let iter = 0; iter < 4; iter++) {
    assignPorts();
    for (let r = 1; r < rows.length; r++) packRow(rows[r]!, (p) => desiredLeft(p, true));
    assignPorts();
    for (let r = rows.length - 2; r >= 0; r--) packRow(rows[r]!, (p) => desiredLeft(p, false));
  }
  assignPorts();

  // Vertical placement: each gap is tall enough for the label stack of the lines that end in the row below it.
  const stack = new Array<number>(rows.length).fill(1);
  for (const g of groups) if (g.source.row !== g.target.row) {
    const lowerRow = Math.max(g.source.row, g.target.row);
    stack[lowerRow] = Math.max(stack[lowerRow]!, g.edges.length);
  }
  const archRoom = (r: number) => flat.filter((g) => g.source.row === r).length * 8 + (flat.some((g) => g.source.row === r) ? 24 : 0);
  const rowY: number[] = [];
  let y = archRoom(0);
  for (let r = 0; r < rows.length; r++) {
    rowY[r] = y;
    y += cfg.nodeHeight + Math.max(cfg.rowGap, 44 + stack[r + 1]! * LINE_H + archRoom(r + 1));
  }
  for (let r = 0; r < rows.length; r++) for (const p of rows[r]!) p.y = rowY[r]!;
  const gapMid = (lowerRow: number) => {
    const top = rowY[lowerRow - 1]! + cfg.nodeHeight;
    return (top + rowY[lowerRow]!) / 2;
  };

  // Routing: horizontal and vertical segments only. A line that would cross a node in a skipped row runs in a side lane.
  const out: PlacedEdge[] = [];
  const sideLanes = { left: 0, right: 0 };
  const jogCount = new Map<number, number>();
  channels.forEach((ch) => {
    const { upper, lower } = ch;
    const k = ch.groups.length;
    const sp = span(ch);
    const xU = upper.x + ch.relU;
    let xL = lower.x + ch.relL;
    if (Math.abs(xU - xL) < 0.5) xL = xU;
    const between = [...placed.values()].filter((p) => p.row > upper.row && p.row < lower.row);
    const blocked = between.some((p) => xU + sp > p.x - 8 && xU < p.x + p.w + 8);
    const yTop = upper.y + upper.h;
    const nJog = jogCount.get(lower.row) ?? 0;
    jogCount.set(lower.row, nJog + 1);
    const yBase = lower.y - 16 - nJog * 10;
    let laneBase = 0;
    if (blocked) {
      const lanesUsed = ch.laneRight ? sideLanes.right++ : sideLanes.left++;
      const step = lanesUsed * (sp + 2 * LANE);
      laneBase = ch.laneRight
        ? Math.max(...between.map((p) => p.x + p.w)) + SIDE_LANE_MARGIN + step
        : Math.min(...between.map((p) => p.x)) - SIDE_LANE_MARGIN - sp - step;
    }
    const goesRight = xL > xU;
    ch.groups.forEach((g, i) => {
      const x1 = xU + i * LANE;
      const x2 = xL + i * LANE;
      const order = goesRight ? k - 1 - i : i;
      const jogY = yBase - order * 6;
      let pts: Point[];
      let labelX = x1 + (g.kind === 'control' ? -6 : 6);
      let anchor: PlacedEdge['labelAnchor'] = g.kind === 'control' ? 'end' : 'start';
      if (blocked) {
        const lane = laneBase + i * LANE;
        const topY = yTop + 16 + order * 6;
        pts = [[x1, yTop], [x1, topY], [lane, topY], [lane, jogY], [x2, jogY], [x2, lower.y]];
        labelX = ch.laneRight ? laneBase + sp + 6 : laneBase - 6;
        anchor = ch.laneRight ? 'start' : 'end';
      } else if (x1 !== x2) {
        pts = [[x1, yTop], [x1, jogY], [x2, jogY], [x2, lower.y]];
      } else {
        pts = [[x1, yTop], [x1, lower.y]];
      }
      if (g.source === lower) pts.reverse();
      out.push({
        kind: g.kind,
        source: g.source.node.id,
        target: g.target.node.id,
        edgeIds: g.edges.map((e) => e.id),
        points: pts,
        labels: g.edges.map((e) => e.label).filter(Boolean),
        labelX,
        labelY: gapMid(lower.row),
        labelAnchor: anchor,
      });
    });
  });

  // Edges inside one row arch above it.
  const archCount = new Map<number, number>();
  flat.forEach((g) => {
    const n = archCount.get(g.source.row) ?? 0;
    archCount.set(g.source.row, n + 1);
    const { source: a, target: b } = g;
    const ya = a.y - 14 - n * 8;
    const dx = n * 8;
    const ax = center(a) + (center(b) > center(a) ? dx : -dx);
    const bx = center(b) + (center(b) > center(a) ? -dx : dx);
    out.push({
      kind: g.kind,
      source: a.node.id,
      target: b.node.id,
      edgeIds: g.edges.map((e) => e.id),
      points: [[ax, a.y], [ax, ya], [bx, ya], [bx, b.y]],
      labels: g.edges.map((e) => e.label).filter(Boolean),
      labelX: (ax + bx) / 2,
      labelY: ya - 4,
      labelAnchor: 'middle',
    });
  });

  // Bounds: nodes, route points and label extents.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const grow = (x0: number, y0: number, x1 = x0, y1 = y0) => {
    minX = Math.min(minX, x0); maxX = Math.max(maxX, x1);
    minY = Math.min(minY, y0); maxY = Math.max(maxY, y1);
  };
  for (const p of placed.values()) grow(p.x, p.y, p.x + p.w, p.y + p.h);
  for (const e of out) {
    for (const [px, py] of e.points) grow(px, py);
    const w = Math.max(0, ...e.labels.map((l) => measure(l, false)));
    const half = (e.labels.length * LINE_H) / 2;
    if (w) {
      const x0 = e.labelAnchor === 'end' ? e.labelX - w : e.labelAnchor === 'middle' ? e.labelX - w / 2 : e.labelX;
      grow(x0, e.labelY - half, x0 + w, e.labelY + half);
    }
  }
  if (!placed.size) return { nodes: [], edges: [], width: 0, height: 0 };
  const dx = cfg.padding - minX;
  const dy = cfg.padding - minY;
  for (const p of placed.values()) { p.x += dx; p.y += dy; }
  for (const e of out) {
    e.points = e.points.map(([px, py]) => [px + dx, py + dy] as Point);
    e.labelX += dx;
    e.labelY += dy;
  }
  return {
    nodes: [...placed.values()],
    edges: out,
    width: maxX - minX + 2 * cfg.padding,
    height: maxY - minY + 2 * cfg.padding,
  };
}
