import { describe, expect, it } from 'vitest';
import { buildLevelSummary } from './level-summary.js';
import type { LevelThreshold } from './types.js';

const THRESHOLDS: LevelThreshold[] = [
  { level: 0, xpRequired: 0 },
  { level: 1, xpRequired: 100 },
  { level: 2, xpRequired: 300 },
  { level: 3, xpRequired: 600 },
  { level: 4, xpRequired: 1000 },
  { level: 5, xpRequired: 1500 },
  { level: 6, xpRequired: 2100 },
];

describe('buildLevelSummary', () => {
  it('handles users without XP', () => {
    const summary = buildLevelSummary(0, THRESHOLDS);

    expect(summary).toEqual({
      currentLevel: 0,
      xpRequiredCurrent: 0,
      xpRequiredNext: 100,
      xpToNext: 100,
      progressPercent: 0,
    });
  });

  it('returns zero progress when XP matches the current threshold', () => {
    const summary = buildLevelSummary(300, THRESHOLDS);

    expect(summary).toEqual({
      currentLevel: 2,
      xpRequiredCurrent: 300,
      xpRequiredNext: 600,
      xpToNext: 300,
      progressPercent: 0,
    });
  });

  it('calculates intermediate progress within a level', () => {
    const summary = buildLevelSummary(250, THRESHOLDS);

    expect(summary).toEqual({
      currentLevel: 1,
      xpRequiredCurrent: 100,
      xpRequiredNext: 300,
      xpToNext: 50,
      progressPercent: 75,
    });
  });

  it('promotes immediately when XP exceeds the next threshold by a single point', () => {
    const summary = buildLevelSummary(301, THRESHOLDS);

    expect(summary).toEqual({
      currentLevel: 2,
      xpRequiredCurrent: 300,
      xpRequiredNext: 600,
      xpToNext: 299,
      progressPercent: 0.3,
    });
  });

  it('supports multi-level jumps by picking the highest attained level', () => {
    const summary = buildLevelSummary(1600, THRESHOLDS);

    expect(summary).toEqual({
      currentLevel: 5,
      xpRequiredCurrent: 1500,
      xpRequiredNext: 2100,
      xpToNext: 500,
      progressPercent: 16.7,
    });
  });

  it('caps progress when the user reaches the maximum level', () => {
    const summary = buildLevelSummary(2500, THRESHOLDS);

    expect(summary).toEqual({
      currentLevel: 6,
      xpRequiredCurrent: 2100,
      xpRequiredNext: null,
      xpToNext: null,
      progressPercent: 100,
    });
  });
});
