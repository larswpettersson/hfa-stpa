import { db } from './db.js';
import type { DiagramDefinition } from './types.js';

const ID = '[A-Za-z_]\\w*';
const NODE_RE = new RegExp(`^(controller|process)\\s+(${ID})(?:\\s*\\[\\s*(?:"([^"]*)"|([^\\]"]*?))\\s*\\])?$`);
const EDGE_RE = new RegExp(`^(${ID})\\s*(-->|-\\.->)\\s*(?:\\|\\s*(?:"([^"]*)"|([^|"]*?))\\s*\\|\\s*)?(${ID})$`);
const HEADER_RE = /^stpa(-beta)?$/;

export const parse = (text: string): void => {
  const lines = text.split(/\r?\n/);
  let sawHeader = false;
  let descrBlock: string[] | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i]!;

    if (descrBlock) {
      if (raw.trim() === '}') {
        db.setAccDescription(descrBlock.join('\n'));
        descrBlock = null;
      } else {
        descrBlock.push(raw.trim());
      }
      continue;
    }

    const line = raw.trim();
    if (!line || line.startsWith('%%')) continue;

    if (!sawHeader) {
      if (!HEADER_RE.test(line)) {
        throw new Error(`Parse error on line ${lineNo}: expected "stpa-beta", got "${line}"`);
      }
      sawHeader = true;
      continue;
    }

    let m: RegExpMatchArray | null;
    if ((m = line.match(/^title\s+(.+)$/))) {
      db.setDiagramTitle(m[1]!);
    } else if ((m = line.match(/^accTitle\s*:\s*(.*)$/))) {
      db.setAccTitle(m[1]!);
    } else if ((m = line.match(/^accDescr\s*:\s*(.*)$/))) {
      db.setAccDescription(m[1]!);
    } else if (/^accDescr\s*\{$/.test(line)) {
      descrBlock = [];
    } else if ((m = line.match(NODE_RE))) {
      db.addNode(m[1] as 'controller' | 'process', m[2]!, m[3] ?? m[4], lineNo);
    } else if ((m = line.match(EDGE_RE))) {
      db.addEdge(m[2] === '-->' ? 'control' : 'feedback', m[1]!, m[5]!, m[3] ?? m[4], lineNo);
    } else {
      throw new Error(`Parse error on line ${lineNo}: unexpected "${line}"`);
    }
  }

  if (!sawHeader) throw new Error('Parse error: missing "stpa-beta" header');
  if (descrBlock) throw new Error('Parse error: accDescr block is missing its closing "}"');
  db.validate();
};

export const parser: DiagramDefinition['parser'] = { parse };
