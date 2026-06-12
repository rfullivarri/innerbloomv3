import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { getRewardsHistoryMonthlyWrapups } from '../../services/monthlyWrappedService.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';
import { pool } from '../../db.js';
import {
  getUserPendingHabitAchievementCount,
  getUserRewardsHabitAchievementsByPillar,
} from '../../services/habitAchievementService.js';
import { countUnseenWeeklyWrapped, listSeenWeeklyWrappedIds } from '../../services/weeklyWrappedViewsService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

type DateRange = { start: string; end: string };
type GrowthCalibrationAction = 'up' | 'keep' | 'down';

type GrowthCalibrationDbRow = {
  task_id: string;
  task_title: string | null;
  pillar_name: string | null;
  difficulty_before: string | null;
  difficulty_after: string | null;
  expected_target: number | string;
  actual_completions: number | string;
  completion_rate: number | string;
  action: GrowthCalibrationAction;
  reason: string;
  clamp_applied: boolean;
  clamp_reason: string | null;
  evaluated_at: string;
  evaluation_month_label: string;
};

type MonthlyDifficultyRow = {
  difficulty_code: string | null;
  completions: number | string | null;
};

type MonthlyModeContextRow = {
  current_mode: string | null;
  current_weekly_target: number | string | null;
  next_mode: string | null;
  next_weekly_target: number | string | null;
};

async function listCompletionDays(userId: string, range: DateRange): Promise<string[]> {
  const result = await pool.query<{ day_key: string }>(
    `SELECT DISTINCT date::text AS day_key
       FROM daily_log
      WHERE user_id = $1::uuid
        AND date >= $2::date
        AND date <= $3::date
        AND COALESCE(quantity, 0) > 0
   ORDER BY day_key ASC`,
    [userId, range.start, range.end],
  );
  return result.rows.map((row) => row.day_key);
}

async function getMonthlyDifficultyBreakdown(userId: string, range: DateRange): Promise<{ easy: number; medium: number; hard: number }> {
  const result = await pool.query<MonthlyDifficultyRow>(
    `SELECT LOWER(cd.code) AS difficulty_code,
            COALESCE(SUM(dl.quantity), 0)::int AS completions
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      WHERE dl.user_id = $1::uuid
        AND dl.date >= $2::date
        AND dl.date <= $3::date
        AND COALESCE(dl.quantity, 0) > 0
   GROUP BY LOWER(cd.code)`,
    [userId, range.start, range.end],
  );

  return result.rows.reduce(
    (acc, row) => {
      const code = row.difficulty_code ?? '';
      const completions = Number(row.completions ?? 0);
      if (code === 'easy') acc.easy += completions;
      if (code === 'medium') acc.medium += completions;
      if (code === 'hard') acc.hard += completions;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 },
  );
}

async function getMonthlyModeContext(userId: string): Promise<MonthlyModeContextRow | null> {
  const result = await pool.query<MonthlyModeContextRow>(
    `WITH current_mode AS (
       SELECT gm.code AS current_mode,
              gm.weekly_target AS current_weekly_target
         FROM users u
    LEFT JOIN cat_game_mode gm ON gm.game_mode_id = u.game_mode_id
        WHERE u.user_id = $1::uuid
        LIMIT 1
     )
     SELECT cm.current_mode,
            cm.current_weekly_target,
            next_mode.code AS next_mode,
            next_mode.weekly_target AS next_weekly_target
       FROM current_mode cm
  LEFT JOIN LATERAL (
       SELECT gm.code, gm.weekly_target
         FROM cat_game_mode gm
        WHERE gm.weekly_target > cm.current_weekly_target
     ORDER BY gm.weekly_target ASC, gm.game_mode_id ASC
        LIMIT 1
     ) next_mode ON true`,
    [userId],
  );

  return result.rows[0] ?? null;
}

function resolveMonthRange(periodKey: string): DateRange | null {
  const [yearRaw, monthRaw] = periodKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  return {
    start: monthStart.toISOString().slice(0, 10),
    end: monthEnd.toISOString().slice(0, 10),
  };
}

function resolveMonthlyWeekStates(completionDays: string[]): ('done' | 'partial' | 'empty')[] {
  return Array.from({ length: 5 }, (_, index) => {
    const weekNumber = index + 1;
    const count = completionDays.filter((day) => {
      const dayNumber = Number(day.slice(8, 10));
      return Math.ceil(dayNumber / 7) === weekNumber;
    }).length;
    if (count >= 7) return 'done';
    if (count >= 5) return 'partial';
    return 'empty';
  });
}

function getDaysUntilNextMonthWrapup(referenceDate = new Date()): number {
  const nowUtc = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const nextMonthStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth() + 1, 1));
  const diffMs = nextMonthStart.getTime() - nowUtc.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

async function listLatestGrowthCalibrationResults(userId: string): Promise<GrowthCalibrationDbRow[]> {
  const result = await pool.query<GrowthCalibrationDbRow>(
    `WITH ranked_recalibrations AS (
       SELECT r.*,
              ROW_NUMBER() OVER (
                PARTITION BY r.task_id
                ORDER BY r.analyzed_at DESC, r.created_at DESC, r.task_difficulty_recalibration_id DESC
              ) AS rn
         FROM task_difficulty_recalibrations r
        WHERE r.user_id = $1::uuid
     )
     SELECT r.task_id,
            t.task AS task_title,
            cp.name AS pillar_name,
            cdb.code AS difficulty_before,
            cda.code AS difficulty_after,
            r.expected_target,
            r.completions_done AS actual_completions,
            r.completion_rate,
            r.action,
            r.reason,
            r.clamp_applied,
            r.clamp_reason,
            r.analyzed_at::text AS evaluated_at,
            r.period_end::text AS evaluation_month_label
       FROM ranked_recalibrations r
  LEFT JOIN tasks t ON t.task_id = r.task_id
  LEFT JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
  LEFT JOIN cat_difficulty cdb ON cdb.difficulty_id = r.previous_difficulty_id
  LEFT JOIN cat_difficulty cda ON cda.difficulty_id = r.new_difficulty_id
      WHERE r.rn = 1
   ORDER BY r.analyzed_at DESC, r.created_at DESC`,
    [userId],
  );

  return result.rows;
}

export const getUserRewardsHistory: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [weeklyWrapups, monthlyWrapups, achievedByPillar, pendingCount, unseenCount, growthCalibrationRows] = await Promise.all([
    getRecentWeeklyWrapped(id, 2),
    getRewardsHistoryMonthlyWrapups(id),
    getUserRewardsHabitAchievementsByPillar(id),
    getUserPendingHabitAchievementCount(id),
    countUnseenWeeklyWrapped(id),
    listLatestGrowthCalibrationResults(id),
  ]);
  const seenIds = await listSeenWeeklyWrappedIds(id, weeklyWrapups.map((entry) => entry.id));
  const weeklyCompletionDaysById = new Map(
    await Promise.all(
      weeklyWrapups.map(async (entry) => [entry.id, await listCompletionDays(id, { start: entry.weekStart, end: entry.weekEnd })] as const),
    ),
  );
  const monthlyCompletionDaysById = new Map(
    await Promise.all(
      monthlyWrapups.map(async (entry) => {
        const range = resolveMonthRange(entry.periodKey);
        const completionDays = range ? await listCompletionDays(id, range) : [];
        return [entry.id, completionDays] as const;
      }),
    ),
  );
  const monthlyDifficultyById = new Map(
    await Promise.all(
      monthlyWrapups.map(async (entry) => {
        const range = resolveMonthRange(entry.periodKey);
        const difficulty = range ? await getMonthlyDifficultyBreakdown(id, range) : { easy: 0, medium: 0, hard: 0 };
        return [entry.id, difficulty] as const;
      }),
    ),
  );
  const modeContext = await getMonthlyModeContext(id);
  const growthSummary = growthCalibrationRows.reduce(
    (acc, row) => {
      if (row.action === 'up') acc.up += 1;
      if (row.action === 'keep') acc.keep += 1;
      if (row.action === 'down') acc.down += 1;
      acc.total += 1;
      return acc;
    },
    { up: 0, keep: 0, down: 0, total: 0 },
  );

  res.json({
    weekly_wrapups: weeklyWrapups.map((entry) => ({
      ...entry,
      seen: seenIds.has(entry.id),
      completionDays: weeklyCompletionDaysById.get(entry.id) ?? [],
    })),
    weekly_unseen_count: unseenCount,
    monthly_wrapups: monthlyWrapups.map((entry) => {
      const completionDays = monthlyCompletionDaysById.get(entry.id) ?? [];
      const difficulty = monthlyDifficultyById.get(entry.id) ?? { easy: 0, medium: 0, hard: 0 };
      return {
        ...entry,
        completionDays,
        payload: {
          ...entry.payload,
          difficulty,
          live_mode_context: modeContext,
        },
        summary: {
          ...(entry.summary ?? {}),
          weeks: resolveMonthlyWeekStates(completionDays),
        },
      };
    }),
    habit_achievements: {
      pending_count: pendingCount,
      achieved_by_pillar: achievedByPillar,
    },
    growth_calibration: {
      countdown_days: getDaysUntilNextMonthWrapup(new Date()),
      latest_period_label: growthCalibrationRows[0]?.evaluation_month_label ?? null,
      summary: growthSummary,
      latest_results: growthCalibrationRows.map((row) => {
        const completionRate = Number(row.completion_rate ?? 0);
        return {
          taskId: row.task_id,
          taskTitle: row.task_title ?? 'Untitled task',
          pillar: row.pillar_name,
          difficultyBefore: row.difficulty_before,
          difficultyAfter: row.difficulty_after,
          expectedTarget: Number(row.expected_target ?? 0),
          actualCompletions: Number(row.actual_completions ?? 0),
          completionRatePct: Number.isFinite(completionRate) ? completionRate * 100 : 0,
          finalAction: row.action,
          result: row.action === 'up' ? 'increased' : row.action === 'down' ? 'decreased' : 'kept',
          reason: row.reason,
          clampApplied: Boolean(row.clamp_applied),
          clampReason: row.clamp_reason,
          evaluatedAt: row.evaluated_at,
          evaluationMonthLabel: row.evaluation_month_label,
        };
      }),
    },
  });
};
