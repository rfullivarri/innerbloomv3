import { describe, expect, it } from 'vitest';
import { getPreviousMonthPeriodKey, parsePeriodKey } from '../modeUpgradeMonthlyAggregationService.js';

describe('modeUpgradeMonthlyAggregationService', () => {
  it('returns previous month period key in UTC', () => {
    expect(getPreviousMonthPeriodKey(new Date('2026-03-15T10:00:00Z'))).toBe('2026-02');
    expect(getPreviousMonthPeriodKey(new Date('2026-01-02T00:00:00Z'))).toBe('2025-12');
  });

  it('parses YYYY-MM period key boundaries', () => {
    expect(parsePeriodKey('2026-02')).toEqual({
      periodStart: '2026-02-01',
      nextPeriodStart: '2026-03-01',
    });
  });

  it('rejects invalid period key format', () => {
    expect(() => parsePeriodKey('2026-2')).toThrow('Invalid periodKey format. Expected YYYY-MM');
    expect(() => parsePeriodKey('2026-13')).toThrow('Invalid periodKey value. Expected YYYY-MM');
  });
});
