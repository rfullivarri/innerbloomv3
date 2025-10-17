import { describe, expect, it } from 'vitest';
import { computeThresholdsFromBaseXp, extractThresholdsFromRows } from './level-thresholds.js';

describe('computeThresholdsFromBaseXp', () => {
  it('returns an empty array when base XP is zero or negative', () => {
    expect(computeThresholdsFromBaseXp(0)).toEqual([]);
    expect(computeThresholdsFromBaseXp(-10)).toEqual([]);
    expect(computeThresholdsFromBaseXp(null)).toEqual([]);
  });

  it('mirrors the database formula for level requirements', () => {
    const thresholds = computeThresholdsFromBaseXp(42);

    expect(thresholds[0]).toEqual({ level: 0, xpRequired: Math.round(42 * 0.4 * 7) });
    expect(thresholds[1]).toEqual({ level: 1, xpRequired: Math.round(42 * Math.pow(1, 1.3)) });
    expect(thresholds[10]).toEqual({ level: 10, xpRequired: Math.round(42 * Math.pow(10, 1.3)) });
    expect(thresholds).toHaveLength(51);
  });
});

describe('extractThresholdsFromRows', () => {
  it('returns an empty array when there are no rows', () => {
    expect(extractThresholdsFromRows([])).toEqual([]);
  });

  it('delegates to computeThresholdsFromBaseXp for the first row', () => {
    const thresholds = extractThresholdsFromRows([{ xp_base_sum: '120' }]);

    expect(thresholds[0]).toEqual({ level: 0, xpRequired: Math.round(120 * 0.4 * 7) });
    expect(thresholds[2]).toEqual({ level: 2, xpRequired: Math.round(120 * Math.pow(2, 1.3)) });
  });
});
