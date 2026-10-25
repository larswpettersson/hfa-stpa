import { describe, expect, it } from 'vitest';
import { detector } from '../src/detector.js';

describe('detector', () => {
  it.each(['stpa-beta\n', 'stpa\n', '  stpa-beta title x', 'stpa'])('matches %j', (t) => {
    expect(detector(t)).toBe(true);
  });
  it.each(['flowchart TD', 'pie', 'stpaX', 'xstpa', '%% stpa'])('rejects %j', (t) => {
    expect(detector(t)).toBe(false);
  });
});
