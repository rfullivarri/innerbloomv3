import { describe, expect, it } from 'vitest';
import {
  buildAnalysisPeriod,
  decideDifficultyChange,
  resolveWeeklyTarget,
  isTaskEligibleForCalibration,
} from '../taskDifficultyCalibrationService.js';

describe('taskDifficultyCalibrationService', () => {
  it('applies thresholds and clamp for difficulty decision', () => {
    const ordered = [1, 2, 3];

    expect(decideDifficultyChange(0.81, 2, ordered).newDifficultyId).toBe(1);
    expect(decideDifficultyChange(0.8, 2, ordered).newDifficultyId).toBe(1);
    expect(decideDifficultyChange(0.6, 2, ordered).newDifficultyId).toBe(2);
    expect(decideDifficultyChange(0.49, 2, ordered).newDifficultyId).toBe(3);

    expect(decideDifficultyChange(0.9, 1, ordered).newDifficultyId).toBe(1);
    expect(decideDifficultyChange(0.1, 3, ordered).newDifficultyId).toBe(3);
  });

  it('uses last game mode in period when mode changes midway', () => {
    const selected = resolveWeeklyTarget(
      [
        { gameModeId: 1, weeklyTarget: 3, effectiveAt: '2026-01-01T00:00:00Z' },
        { gameModeId: 2, weeklyTarget: 5, effectiveAt: '2026-01-15T00:00:00Z' },
      ],
      '2026-01-31',
    );

    expect(selected).toEqual({ gameModeId: 2, weeklyTarget: 5 });
  });

  it('supports first-month eligibility and preserves monthly cadence afterwards', () => {
    const now = new Date('2026-03-15T00:00:00Z');

    expect(isTaskEligibleForCalibration({ now, createdAt: '2026-03-03T00:00:00Z', active: true })).toBe(false);
    expect(isTaskEligibleForCalibration({ now, createdAt: '2026-02-20T00:00:00Z', active: true })).toBe(true);
    expect(isTaskEligibleForCalibration({ now, createdAt: '2026-01-01T00:00:00Z', active: false })).toBe(false);

    expect(
      buildAnalysisPeriod({
        now,
        createdAt: '2026-02-20T00:00:00Z',
        lastPeriodEnd: null,
      }),
    ).toEqual({ start: '2026-02-20', end: '2026-02-28', kind: 'early_first_month' });

    expect(
      buildAnalysisPeriod({
        now,
        createdAt: '2026-01-01T00:00:00Z',
        lastPeriodEnd: null,
      }),
    ).toEqual({ start: '2026-01-01', end: '2026-01-31', kind: 'early_first_month' });

    expect(
      buildAnalysisPeriod({
        now,
        createdAt: '2026-01-01T00:00:00Z',
        lastPeriodEnd: '2026-01-31',
      }),
    ).toEqual({ start: '2026-02-01', end: '2026-02-28', kind: 'monthly_standard' });
  });
});
