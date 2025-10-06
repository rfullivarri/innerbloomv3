import { describe, expect, it } from 'vitest';
import {
  computeDailyTargets,
  computeHalfLife,
  enumerateDates,
  propagateEnergy,
  type DailyTargetByPillar,
  type XpByDate,
} from '../controllers/users/user-state-utils.js';

function createXpSeries(dates: string[], value: number): XpByDate {
  const map: XpByDate = new Map();

  for (const date of dates) {
    map.set(date, { Body: value, Mind: value, Soul: value });
  }

  return map;
}

describe('propagateEnergy', () => {
  it('returns 100 for all pillars when grace is forced', () => {
    const dailyTargets: DailyTargetByPillar = { Body: 10, Mind: 10, Soul: 10 };
    const halfLife = computeHalfLife('FLOW');
    const dates = enumerateDates('2024-01-01', '2024-01-06');

    const { series } = propagateEnergy({
      dates,
      xpByDate: new Map(),
      halfLifeByPillar: halfLife,
      dailyTargets,
      forceFullGrace: true,
    });

    for (const row of series) {
      expect(row).toMatchObject({ Body: 100, Mind: 100, Soul: 100 });
    }
  });

  it('decays energy over time without xp after grace period', () => {
    const dates = enumerateDates('2024-01-01', '2024-01-20');
    const dailyTargets: DailyTargetByPillar = { Body: 50, Mind: 50, Soul: 50 };
    const halfLife = computeHalfLife('CHILL');

    const { series } = propagateEnergy({
      dates,
      xpByDate: new Map(),
      halfLifeByPillar: halfLife,
      dailyTargets,
      graceUntilDate: '2024-01-02',
    });

    const last = series.at(-1);

    expect(last?.Body ?? 0).toBeLessThan(60);
    expect(last?.Mind ?? 0).toBeLessThan(60);
    expect(last?.Soul ?? 0).toBeLessThan(60);
  });

  it('maintains energy near 100 when hitting daily targets', () => {
    const dates = enumerateDates('2024-01-01', '2024-01-10');
    const xpBase = { Body: 70, Mind: 70, Soul: 70 };
    const dailyTargets = computeDailyTargets(xpBase, 7);
    const halfLife = computeHalfLife('FLOW');
    const xpSeries = createXpSeries(dates, dailyTargets.Body);

    const { series } = propagateEnergy({
      dates,
      xpByDate: xpSeries,
      halfLifeByPillar: halfLife,
      dailyTargets,
      graceUntilDate: '2024-01-03',
    });

    const last = series.at(-1);

    expect(last?.Body).toBeGreaterThan(95);
    expect(last?.Mind).toBeGreaterThan(95);
    expect(last?.Soul).toBeGreaterThan(95);
  });

  it('returns zero energy when there is no target and grace is disabled', () => {
    const dates = ['2024-01-01', '2024-01-02'];
    const dailyTargets: DailyTargetByPillar = { Body: 0, Mind: 0, Soul: 0 };
    const halfLife = computeHalfLife('LOW');

    const { series } = propagateEnergy({
      dates,
      xpByDate: new Map(),
      halfLifeByPillar: halfLife,
      dailyTargets,
    });

    for (const row of series) {
      expect(row.Body).toBe(0);
      expect(row.Mind).toBe(0);
      expect(row.Soul).toBe(0);
    }
  });
});
