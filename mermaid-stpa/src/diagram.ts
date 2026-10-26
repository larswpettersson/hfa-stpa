import { db, setConfigProvider } from './db.js';
import { parser } from './parser.js';
import { renderer } from './renderer.js';
import getStyles from './styles.js';
import type { DiagramDefinition } from './types.js';

export const diagram: DiagramDefinition = {
  parser,
  db,
  renderer,
  styles: getStyles,
  injectUtils: (_log, _setLogLevel, getConfig) => setConfigProvider(getConfig),
};
