import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { SimpleTtlCache } from '../../lib/simple-cache.js';
import { parseWithValidation, uuidSchema } from '../../lib/validation.js';
import {
  addDays,
  computeDailyTargets,
  computeGainFactors,
  computeHalfLife,
  computeDecayRates,
  enumerateDates,
  formatDateInTimezone,
  getDailyXpSeriesByPillar,
  getUserLogStats,
  getUserProfile,
  getXpBaseByPillar,
  propagateEnergy,
  type Pillar,
} from './user-state-service.js';

type PillarStateResponse = {
  hp?: number;
  focus?: number;
  mood?: number;
  xp_today: number;
  d: number;
  k: number;
  H: number;
  xp_obj_day: number;
};

type StateResponse = {
  date: string;
  mode: string;
  mode_name?: string;
  weekly_target: number;
  grace: {
    applied: boolean;
    unique_days: number;
  };
  pillars: Record<'Body' | 'Mind' | 'Soul', PillarStateResponse>;
};

const paramsSchema = z.object({
  id: uuidSchema,
});

const cache = new SimpleTtlCache<StateResponse>({ ttlMs: 5 * 60 * 1000, maxEntries: 200 });

export const getUserState: AsyncHandler = async (req, res) => {
  const { id } = parseWithValidation(paramsSchema, req.params);

  const cached = cache.get(id);

  if (cached) {
    res.json(cached);
    return;
  }

  const profile = await getUserProfile(id);
  const logStats = await getUserLogStats(id);
  const xpBaseByPillar = await getXpBaseByPillar(id);
  const halfLifeByPillar = computeHalfLife(profile.modeCode);
  const decayRates = computeDecayRates(halfLifeByPillar);
  const dailyTargets = computeDailyTargets(xpBaseByPillar, profile.weeklyTarget);
  const gainFactors = computeGainFactors(decayRates, dailyTargets);
  const today = formatDateInTimezone(new Date(), profile.timezone);
  const graceApplied = logStats.uniqueDays < 7;
  const graceUntilDate = logStats.firstDate ? addDays(logStats.firstDate, 6) : null;

  const fromDate = logStats.firstDate ?? today;
  const dateSeries = enumerateDates(fromDate, today);

  let xpSeries = new Map<string, Partial<Record<Pillar, number>>>();

  if (logStats.firstDate) {
    xpSeries = await getDailyXpSeriesByPillar(id, fromDate, today);
  }

  const { lastEnergy } = propagateEnergy({
    dates: dateSeries.length > 0 ? dateSeries : [today],
    xpByDate: xpSeries,
    halfLifeByPillar,
    dailyTargets,
    forceFullGrace: graceApplied,
    graceUntilDate,
  });

  const xpToday = xpSeries.get(today) ?? {};
  const pillars: Record<'Body' | 'Mind' | 'Soul', PillarStateResponse> = {
    Body: {
      hp: lastEnergy.Body,
      xp_today: xpToday.Body ?? 0,
      d: Number(decayRates.Body.toFixed(6)),
      k: Number(gainFactors.Body.toFixed(6)),
      H: halfLifeByPillar.Body,
      xp_obj_day: dailyTargets.Body,
    },
    Mind: {
      focus: lastEnergy.Mind,
      xp_today: xpToday.Mind ?? 0,
      d: Number(decayRates.Mind.toFixed(6)),
      k: Number(gainFactors.Mind.toFixed(6)),
      H: halfLifeByPillar.Mind,
      xp_obj_day: dailyTargets.Mind,
    },
    Soul: {
      mood: lastEnergy.Soul,
      xp_today: xpToday.Soul ?? 0,
      d: Number(decayRates.Soul.toFixed(6)),
      k: Number(gainFactors.Soul.toFixed(6)),
      H: halfLifeByPillar.Soul,
      xp_obj_day: dailyTargets.Soul,
    },
  };

  const response: StateResponse = {
    date: today,
    mode: profile.modeName ?? profile.modeCode,
    ...(profile.modeName ? { mode_name: profile.modeName } : {}),
    weekly_target: profile.weeklyTarget,
    grace: {
      applied: graceApplied,
      unique_days: logStats.uniqueDays,
    },
    pillars,
  };

  cache.set(id, response);

  res.json(response);
};
