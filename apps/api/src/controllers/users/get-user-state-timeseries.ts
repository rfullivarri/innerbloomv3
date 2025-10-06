import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import { SimpleTtlCache } from '../../lib/simple-cache.js';
import { uuidSchema } from '../../lib/validation.js';
import {
  addDays,
  computeDailyTargets,
  computeHalfLife,
  enumerateDates,
  getDailyXpSeriesByPillar,
  getUserLogStats,
  getUserProfile,
  getXpBaseByPillar,
  propagateEnergy,
} from './user-state-service.js';

type TimeseriesResponse = Array<{
  date: string;
  Body: number;
  Mind: number;
  Soul: number;
}>;

const paramsSchema = z.object({
  id: uuidSchema,
});

const querySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

const cache = new SimpleTtlCache<TimeseriesResponse>({ ttlMs: 5 * 60 * 1000, maxEntries: 200 });

function assertValidDate(value: string, field: 'from' | 'to'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'invalid_date', `${field} must be formatted as YYYY-MM-DD`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, 'invalid_date', `${field} must be a valid date`);
  }

  return value;
}

export const getUserStateTimeseries: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  const { from, to } = querySchema.parse(req.query);

  const fromDate = assertValidDate(from, 'from');
  const toDate = assertValidDate(to, 'to');

  if (fromDate > toDate) {
    throw new HttpError(400, 'invalid_date_range', 'from must be before or equal to to');
  }

  const cacheKey = `${id}:${fromDate}:${toDate}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  const profile = await getUserProfile(id);
  const logStats = await getUserLogStats(id);
  const xpBaseByPillar = await getXpBaseByPillar(id);
  const halfLifeByPillar = computeHalfLife(profile.modeCode);
  const dailyTargets = computeDailyTargets(xpBaseByPillar, profile.weeklyTarget);
  const graceApplied = logStats.uniqueDays < 7;
  const graceUntilDate = logStats.firstDate ? addDays(logStats.firstDate, 6) : null;

  const propagationStart = logStats.firstDate
    ? (logStats.firstDate < fromDate ? logStats.firstDate : fromDate)
    : fromDate;

  const propagationDates = enumerateDates(propagationStart, toDate);

  let xpSeries = new Map<string, Partial<Record<'Body' | 'Mind' | 'Soul', number>>>();

  if (propagationDates.length > 0) {
    xpSeries = await getDailyXpSeriesByPillar(id, propagationStart, toDate);
  }

  const { series } = propagateEnergy({
    dates: propagationDates.length > 0 ? propagationDates : enumerateDates(fromDate, toDate),
    xpByDate: xpSeries,
    halfLifeByPillar,
    dailyTargets,
    forceFullGrace: graceApplied,
    graceUntilDate,
  });

  const filtered = series
    .filter((row) => row.date >= fromDate && row.date <= toDate)
    .map((row) => ({
      date: row.date,
      Body: row.Body,
      Mind: row.Mind,
      Soul: row.Soul,
    }));

  cache.set(cacheKey, filtered);

  res.json(filtered);
};
