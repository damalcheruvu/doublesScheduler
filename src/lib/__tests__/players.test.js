import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../../lib/players';

describe('players helpers', () => {
  it('finds duplicates case-insensitively with original spellings', () => {
    const txt = 'Alice\nBob\nalice\nALICE\nCharlie';
    const dups = findDuplicates(txt);
    expect(dups.length).toBe(1);
    const [, names] = dups[0];
    expect(names).toEqual(['Alice', 'alice', 'ALICE']);
  });
});
