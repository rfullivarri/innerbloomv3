import { describe, expect, it } from 'vitest';
import { computePreviewAchievementFromRates } from '../previewAchievementService.js';

function baseInput(overrides: Partial<Parameters<typeof computePreviewAchievementFromRates>[0]> = {}) {
  return {
    periodKey: '2026-04',
    completionRateSoFar: 0,
    projectedMonthEndRate: 0,
    expectedTargetSoFar: 8,
    completionsDoneSoFar: 0,
    expectedTargetMonthEnd: 18,
    projectedCompletionsMonthEnd: 0,
    recentClosedMonths: [],
    ...overrides,
  };
}

describe('previewAchievementService scoring', () => {
  it('handles no history with no momentum as fragile', () => {
    const result = computePreviewAchievementFromRates(baseInput());

    expect(result.status).toBe('fragile');
    expect(result.score).toBeLessThan(50);
    expect(result.windowProximity.slots).toEqual(['empty', 'empty', 'projected_invalid']);
  });

  it('handles only current month data', () => {
    const result = computePreviewAchievementFromRates(
      baseInput({
        completionRateSoFar: 0.88,
        projectedMonthEndRate: 0.9,
        completionsDoneSoFar: 10,
        projectedCompletionsMonthEnd: 20,
      }),
    );

    expect(result.currentMonth.projectedMonthEndRate).toBeCloseTo(0.9, 6);
    expect(result.recentMonths).toHaveLength(1);
    expect(result.windowProximity.slots).toEqual(['empty', 'empty', 'projected_valid']);
  });

  it('scores building/strong path with one good closed month plus current good month', () => {
    const result = computePreviewAchievementFromRates(
      baseInput({
        completionRateSoFar: 0.85,
        projectedMonthEndRate: 0.91,
        recentClosedMonths: [{ periodKey: '2026-03', completionRate: 0.86, expectedTarget: 18, completionsDone: 16 }],
      }),
    );

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.windowProximity.validMonths).toBe(2);
    expect(result.status).not.toBe('fragile');
  });

  it('becomes strong with two good closed months and current good month', () => {
    const result = computePreviewAchievementFromRates(
      baseInput({
        completionRateSoFar: 0.9,
        projectedMonthEndRate: 0.95,
        recentClosedMonths: [
          { periodKey: '2026-03', completionRate: 0.9, expectedTarget: 18, completionsDone: 17 },
          { periodKey: '2026-02', completionRate: 0.82, expectedTarget: 16, completionsDone: 14 },
        ],
      }),
    );

    expect(result.status).toBe('strong');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.windowProximity.aggregateProjected3mRate).toBeGreaterThanOrEqual(0.8);
  });

  it('supports long bad history but recent recovery by prioritizing recent months', () => {
    const result = computePreviewAchievementFromRates(
      baseInput({
        completionRateSoFar: 0.86,
        projectedMonthEndRate: 0.9,
        recentClosedMonths: [
          { periodKey: '2026-03', completionRate: 0.88, expectedTarget: 18, completionsDone: 16 },
          { periodKey: '2026-02', completionRate: 0.84, expectedTarget: 18, completionsDone: 15 },
          { periodKey: '2026-01', completionRate: 0.2, expectedTarget: 18, completionsDone: 4 },
          { periodKey: '2025-12', completionRate: 0.1, expectedTarget: 18, completionsDone: 2 },
        ],
      }),
    );

    expect(result.components.recentClosedMonthsScore).toBeGreaterThan(60);
    expect(result.windowProximity.validMonths).toBeGreaterThanOrEqual(2);
  });

  it('is fragile when projected month is below floor even with prior good months', () => {
    const result = computePreviewAchievementFromRates(
      baseInput({
        completionRateSoFar: 0.45,
        projectedMonthEndRate: 0.49,
        recentClosedMonths: [
          { periodKey: '2026-03', completionRate: 0.95, expectedTarget: 18, completionsDone: 17 },
          { periodKey: '2026-02', completionRate: 0.91, expectedTarget: 18, completionsDone: 16 },
        ],
      }),
    );

    expect(result.status).toBe('fragile');
    expect(result.windowProximity.slots[2]).toBe('projected_invalid');
  });
});
