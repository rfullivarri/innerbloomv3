import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { SimpleTtlCache } from '../../lib/simple-cache.js';
import { isHttpError } from '../../lib/http-error.js';
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

const MODE_LABELS: Record<string, string> = {
  LOW: 'Low',
  CHILL: 'Chill',
  FLOW: 'Flow',
  EVOLVE: 'Evolve',
  STANDARD: 'Standard',
};

const DEFAULT_MODE_CODE = 'FLOW';
const DEFAULT_WEEKLY_TARGET = 700;
const debugUserStateValue = process.env.DEBUG_USER_STATE?.toLowerCase() ?? '';
const DEBUG_USER_STATE = ['1', 'true', 'yes', 'on'].includes(debugUserStateValue);

function logDebugTiming(step: string, startedAt: number) {
  if (!DEBUG_USER_STATE) {
    return;
  }

  const durationMs = Date.now() - startedAt;
  console.debug('[users/state] timing', { step, duration_ms: durationMs });
}

function normalizeModeCode(raw: string | null | undefined): string {
  if (typeof raw !== 'string') {
    return DEFAULT_MODE_CODE;
  }

  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return DEFAULT_MODE_CODE;
  }

  return trimmed.toUpperCase();
}

function resolveModeName(code: string, rawName: string | null | undefined): string {
  const trimmed = rawName?.trim();

  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }

  return MODE_LABELS[code] ?? MODE_LABELS[DEFAULT_MODE_CODE] ?? DEFAULT_MODE_CODE;
}

function resolveWeeklyTarget(raw: number | null | undefined): number {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  return DEFAULT_WEEKLY_TARGET;
}

export const getUserState: AsyncHandler = async (req, res) => {
  const rawUserId = typeof req.params?.id === 'string' ? req.params.id : undefined;

  try {
    const { id } = parseWithValidation(paramsSchema, req.params);

    const cached = cache.get(id);

    if (cached) {
      res.json(cached);
      return;
    }

    const profileStartedAt = Date.now();
    const profile = await getUserProfile(id);
    logDebugTiming('getUserProfile', profileStartedAt);
    const resolvedModeCode = normalizeModeCode(profile.modeCode);
    const resolvedModeName = resolveModeName(resolvedModeCode, profile.modeName);
    const resolvedWeeklyTarget = resolveWeeklyTarget(profile.weeklyTarget);
    const trimmedModeName = profile.modeName?.trim();

    const logStatsStartedAt = Date.now();
    const logStats = await getUserLogStats(id);
    logDebugTiming('getUserLogStats', logStatsStartedAt);
    const xpBaseStartedAt = Date.now();
    const xpBaseByPillar = await getXpBaseByPillar(id);
    logDebugTiming('getXpBaseByPillar', xpBaseStartedAt);
    const halfLifeByPillar = computeHalfLife(resolvedModeCode);
    const decayRates = computeDecayRates(halfLifeByPillar);
    const dailyTargets = computeDailyTargets(xpBaseByPillar, resolvedWeeklyTarget);
    const gainFactors = computeGainFactors(decayRates, dailyTargets);
    const today = formatDateInTimezone(new Date(), profile.timezone);
    const graceApplied = logStats.uniqueDays < 7;
    const graceUntilDate = logStats.firstDate ? addDays(logStats.firstDate, 6) : null;

    const fromDate = logStats.firstDate ?? today;
    const dateSeries = enumerateDates(fromDate, today);

    console.info('[users/state] query', { userId: id, from: fromDate, to: today });

    let xpSeries = new Map<string, Partial<Record<Pillar, number>>>();

    if (logStats.firstDate) {
      const xpSeriesStartedAt = Date.now();
      xpSeries = await getDailyXpSeriesByPillar(id, fromDate, today);
      logDebugTiming('getDailyXpSeriesByPillar', xpSeriesStartedAt);
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
      mode: resolvedModeName,
      ...(trimmedModeName && trimmedModeName.length > 0 ? { mode_name: trimmedModeName } : {}),
      weekly_target: resolvedWeeklyTarget,
      grace: {
        applied: graceApplied,
        unique_days: logStats.uniqueDays,
      },
      pillars,
    };

    cache.set(id, response);

    res.json(response);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown_error';
    if (isHttpError(error)) {
      console.error('[users/state] fail', {
        userId: rawUserId,
        reason,
        status: error.status,
        code: error.code,
      });
      res.status(error.status).json({
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      });
      return;
    }

    console.error('[users/state] fail', { userId: rawUserId, reason });
    res.status(500).json({ code: 'internal_error', message: 'Something went wrong' });
  }
};
