import { describe, it, expect } from 'vitest';
import { BadmintonManager } from '../../lib/scheduler';
import { findDuplicates } from '../../lib/players';

describe('BadmintonManager', () => {
  it('generates a schedule for 8 players, 2 courts, 3 rounds', () => {
    const players = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].join('\n');
    const mgr = new BadmintonManager(2, 3);
    mgr.loadPlayers(players);
    const out = mgr.generateSchedule();
    expect(out).toContain('Round 1');
    expect(out).toContain('Court 1:');
    expect(out).toContain('Court 2:');
    // 2 courts * 3 rounds = 6 lines with Court prefix
    const courtLines = out.split('\n').filter(l => l.startsWith('Court '));
    expect(courtLines.length).toBe(6);
  });

  it('throws on duplicate names (case-insensitive)', () => {
    const players = ['Alice', 'Bob', 'alice', 'Charlie'].join('\n');
    const mgr = new BadmintonManager(1, 1);
    expect(() => mgr.loadPlayers(players, findDuplicates)).toThrow(
      /Duplicate names/i
    );
  });
});
