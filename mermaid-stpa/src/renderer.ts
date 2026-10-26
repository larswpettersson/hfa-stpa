import { db, getSiteConfig } from './db.js';
import { layout } from './layout.js';
import type { DiagramDefinition } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TITLE_H = 34;

type Draw = DiagramDefinition['renderer']['draw'];

function findSvg(id: string, securityLevel: string | undefined): SVGSVGElement {
  let doc: Document = document;
  if (securityLevel === 'sandbox') {
    const frame = document.getElementById(`i${id}`) as HTMLIFrameElement | null;
    doc = frame?.contentDocument ?? document;
  }
  const svg = doc.querySelector(`[id="${id}"]`);
  if (!svg) throw new Error(`stpa: could not find SVG element "${id}"`);
  return svg as SVGSVGElement;
}

function el<K extends keyof SVGElementTagNameMap>(
  parent: Element,
  tag: K,
  attrs: Record<string, string | number> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const node = parent.ownerDocument.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  parent.appendChild(node);
  return node;
}

function makeMeasurer(svg: SVGSVGElement, fontFamily: string) {
  const probe = el(svg, 'text', { x: 0, y: 0, visibility: 'hidden', 'font-family': fontFamily });
  const measure = (text: string, bold: boolean, size: number) => {
    probe.setAttribute('font-size', String(size));
    probe.setAttribute('font-weight', bold ? '600' : '400');
    probe.textContent = text;
    let w = 0;
    try {
      w = probe.getComputedTextLength();
    } catch {
      // not available outside a layout-capable DOM
    }
    return w > 0 ? w : text.length * size * (bold ? 0.62 : 0.56);
  };
  return { measure, dispose: () => probe.remove() };
}

export const draw: Draw = (_text, id, _version, diagObj) => {
  const stpa = diagObj.db as unknown as typeof db;
  const cfg = stpa.getConfig();
  const mermaidConfig = getSiteConfig();
  const svg = findSvg(id, mermaidConfig.securityLevel);
  const fontFamily = mermaidConfig.fontFamily ?? '"trebuchet ms", verdana, arial, sans-serif';

  const { measure, dispose } = makeMeasurer(svg, fontFamily);
  const result = layout(stpa.getNodes(), stpa.getEdges(), cfg, (t, bold) => measure(t, bold, bold ? 14 : 12));
  dispose();

  const title = stpa.getDiagramTitle();
  const top = title ? TITLE_H : 0;
  const width = Math.max(result.width, title ? measure(title, false, 18) + 2 * cfg.padding : 0, 1);
  const height = result.height + top;

  const accTitle = stpa.getAccTitle();
  const accDescr = stpa.getAccDescription();
  svg.setAttribute('role', 'graphics-document document');
  svg.setAttribute('aria-roledescription', 'stpa');
  if (accTitle) {
    el(svg, 'title', { id: `chart-title-${id}` }, accTitle);
    svg.setAttribute('aria-labelledby', `chart-title-${id}`);
  }
  if (accDescr) {
    el(svg, 'desc', { id: `chart-desc-${id}` }, accDescr);
    svg.setAttribute('aria-describedby', `chart-desc-${id}`);
  }

  const defs = el(svg, 'defs');
  const marker = el(defs, 'marker', {
    id: `${id}-stpa-arrow`,
    viewBox: '0 0 10 10',
    refX: 9,
    refY: 5,
    markerWidth: 10,
    markerHeight: 10,
    markerUnits: 'userSpaceOnUse',
    orient: 'auto',
    class: 'stpa-arrow',
  });
  el(marker, 'path', { d: 'M0,0 L10,5 L0,10 z' });

  const root = el(svg, 'g', { class: 'stpa' });
  if (title) el(root, 'text', { class: 'stpa-title', x: width / 2, y: 22, 'font-family': fontFamily }, title);
  const body = el(root, 'g', { transform: `translate(${(width - result.width) / 2}, ${top})` });

  for (const e of result.edges) {
    const g = el(body, 'g', { class: `stpa-edge-group stpa-${e.kind}-group`, 'data-edge-ids': e.edgeIds.join(' ') });
    el(g, 'path', {
      class: `stpa-edge stpa-${e.kind}`,
      d: e.points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '),
      'marker-end': `url(#${id}-stpa-arrow)`,
    });
    const startY = e.labelY - ((e.labels.length - 1) * 14) / 2 + 4;
    e.labels.forEach((label, i) => {
      el(g, 'text', {
        class: 'stpa-edge-label',
        x: e.labelX,
        y: startY + i * 14,
        'text-anchor': e.labelAnchor,
        'font-family': fontFamily,
      }, label);
    });
  }

  for (const p of result.nodes) {
    const g = el(body, 'g', { class: `stpa-node stpa-${p.node.kind}`, 'data-id': p.node.id });
    el(g, 'rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 6 });
    el(g, 'text', { class: 'stpa-node-name', x: p.x + p.w / 2, y: p.y + p.h / 2 - 2, 'font-family': fontFamily }, p.node.label);
    el(g, 'text', { class: 'stpa-node-kind', x: p.x + p.w / 2, y: p.y + p.h / 2 + 15, 'font-family': fontFamily },
      p.node.kind === 'controller' ? 'Controller' : 'Controlled process');
  }

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  if (cfg.useMaxWidth) {
    svg.setAttribute('width', '100%');
    svg.style.maxWidth = `${width}px`;
  } else {
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
  }
};

export const renderer = { draw };
