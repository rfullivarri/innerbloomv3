import { pool } from '../db.js';
import {
  insertMonthlyWrapped,
  listRecentMonthlyWrapped,
  trimMonthlyWrappedHistory,
} from '../repositories/monthly-wrapped.repository.js';
import type { MonthlyWrappedEntry, MonthlyWrappedPayload } from '../types/monthlyWrapped.js';

type BuildMonthlyWrappedInput = {
  userId: string;
  periodKey: string;
  periodStart: string;
  nextPeriodStart: string;
  currentMode: string | null;
  modeWeeklyTarget: number;
  tasksTotalEvaluated: number;
  tasksMeetingGoal: number;
  taskPassRate: number;
  eligibleForUpgrade: boolean;
  suggestedNextMode: string | null;
};

type MonthlyKpiRow = {
  tasks_completed: number | string | null;
  xp_gained: number | string | null;
};

type DominantPillarRow = {
  dominant_pillar: string | null;
  tasks_completed: number | string | null;
};

function buildSlide2(input: BuildMonthlyWrappedInput): MonthlyWrappedPayload['slide_2'] {
  const threshold = Math.ceil(input.tasksTotalEvaluated * 0.8);
  const missingTasks = Math.max(0, threshold - input.tasksMeetingGoal);

  if (input.eligibleForUpgrade) {
    return {
      title: 'upgrade_available',
      message: input.suggestedNextMode ? 'Ready for next mode' : 'Upgrade available',
      missingTasksToUpgrade: 0,
    };
  }

  return {
    title: 'you_were_close',
    message: 'You were close',
    missingTasksToUpgrade: missingTasks,
  };
}

async function getMonthlyKpis(userId: string, periodStart: string, nextPeriodStart: string): Promise<{
  tasksCompleted: number;
  xpGained: number;
  dominantPillar: string | null;
  dominantPillarTasksCompleted: number;
}> {
  const totals = await pool.query<MonthlyKpiRow>(
    `SELECT COALESCE(SUM(dl.quantity), 0)::int AS tasks_completed,
            COALESCE(SUM(COALESCE(cd.xp_base, 0) * GREATEST(dl.quantity, 1)), 0)::int AS xp_gained
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
  LEFT JOIN cat_difficulty cd ON cd.difficulty_id = t.difficulty_id
      WHERE dl.user_id = $1::uuid
        AND dl.date >= $2::date
        AND dl.date < $3::date`,
    [userId, periodStart, nextPeriodStart],
  );

  const dominantPillarResult = await pool.query<DominantPillarRow>(
    `SELECT cp.code AS dominant_pillar,
            COALESCE(SUM(dl.quantity), 0)::int AS tasks_completed
       FROM daily_log dl
       JOIN tasks t ON t.task_id = dl.task_id
       JOIN cat_pillar cp ON cp.pillar_id = t.pillar_id
      WHERE dl.user_id = $1::uuid
        AND dl.date >= $2::date
        AND dl.date < $3::date
   GROUP BY cp.code
   ORDER BY tasks_completed DESC, cp.code ASC
      LIMIT 1`,
    [userId, periodStart, nextPeriodStart],
  );

  const totalRow = totals.rows[0];
  const pillarRow = dominantPillarResult.rows[0];

  return {
    tasksCompleted: Number(totalRow?.tasks_completed ?? 0),
    xpGained: Number(totalRow?.xp_gained ?? 0),
    dominantPillar: pillarRow?.dominant_pillar ?? null,
    dominantPillarTasksCompleted: Number(pillarRow?.tasks_completed ?? 0),
  };
}

export async function buildAndPersistMonthlyWrapped(input: BuildMonthlyWrappedInput): Promise<MonthlyWrappedEntry> {
  const kpis = await getMonthlyKpis(input.userId, input.periodStart, input.nextPeriodStart);
  const slide2 = buildSlide2(input);

  const payload: MonthlyWrappedPayload = {
    period_key: input.periodKey,
    current_mode: input.currentMode,
    mode_weekly_target: input.modeWeeklyTarget,
    tasks_total_evaluated: input.tasksTotalEvaluated,
    tasks_meeting_goal: input.tasksMeetingGoal,
    task_pass_rate: input.taskPassRate,
    eligible_for_upgrade: input.eligibleForUpgrade,
    suggested_next_mode: input.suggestedNextMode,
    monthly_kpis: kpis,
    slide_2: slide2,
  };

  const entry = await insertMonthlyWrapped({
    userId: input.userId,
    periodKey: input.periodKey,
    payload,
    summary: {
      period_key: input.periodKey,
      current_mode: input.currentMode,
      suggested_next_mode: input.suggestedNextMode,
      eligible_for_upgrade: input.eligibleForUpgrade,
      missing_tasks_to_upgrade: slide2.missingTasksToUpgrade,
      tasks_completed: kpis.tasksCompleted,
      xp_gained: kpis.xpGained,
      dominant_pillar: kpis.dominantPillar,
    },
  });

  await trimMonthlyWrappedHistory(input.userId, 2);
  return entry;
}

export async function getRewardsHistoryMonthlyWrapups(userId: string): Promise<MonthlyWrappedEntry[]> {
  return listRecentMonthlyWrapped(userId, 2);
}
