import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';

const ANALYSIS_WINDOW_DAYS = 30;
const GOAL_THRESHOLD = 0.8;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

type UserModeRow = {
  user_id: string;
  game_mode_id: number | null;
  current_mode: string | null;
  current_weekly_target: number | string | null;
};

type TaskRow = {
  task_id: string;
  task_name: string;
  created_at: string;
};

type CompletionRow = {
  task_id: string;
  actual_count: number | string;
};

type HistoryRow = {
  game_mode_id: number;
  effective_at: string;
  mode_code: string;
  weekly_target: number | string | null;
};

type ModeSegment = {
  start: string;
  end: string;
  game_mode_id: number;
  mode_code: string;
  weekly_target: number;
  days: number;
};

export type ModeUpgradeAnalysisTask = {
  task_id: string;
  task_name: string;
  actual_count: number;
  expected_count: number;
  completion_rate: number;
  meets_goal: boolean;
  mode_segments_used: {
    start: string;
    end: string;
    mode_code: string;
    weekly_target: number;
    days: number;
    expected_count: number;
  }[];
};

export type RollingModeUpgradeAnalysis = {
  has_analysis: boolean;
  analysis_window_days: number;
  analysis_start: string;
  analysis_end: string;
  analysis_basis: 'rolling_30_days';
  debug_reason: string | null;
  eligible_for_upgrade: boolean;
  current_mode: string | null;
  next_mode: string | null;
  tasks_total_evaluated: number;
  tasks_meeting_goal: number;
  task_pass_rate: number;
  threshold: number;
  missing_tasks: number | null;
  cta_enabled: boolean;
  tasks: ModeUpgradeAnalysisTask[];
};

function dateOnlyUtc(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_IN_DAY);
}

function parseDate(value: string): Date {
  return dateOnlyUtc(new Date(value));
}

function daysInclusive(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / MS_IN_DAY) + 1;
}

function resolveNextModeCode(currentMode: string | null): string | null {
  switch ((currentMode ?? '').trim().toUpperCase()) {
    case 'LOW':
      return 'CHILL';
    case 'CHILL':
      return 'FLOW';
    case 'FLOW':
      return 'EVOLVE';
    case 'EVOLVE':
    default:
      return null;
  }
}

function buildModeSegments(params: {
  historyRows: HistoryRow[];
  periodStart: Date;
  periodEnd: Date;
  fallbackModeId: number | null;
  fallbackModeCode: string | null;
  fallbackWeeklyTarget: number;
}): ModeSegment[] {
  const sorted = [...params.historyRows]
    .map((row) => ({ ...row, effective_date: parseDate(row.effective_at) }))
    .sort((a, b) => a.effective_date.getTime() - b.effective_date.getTime());

  const beforeOrAtStart = [...sorted].reverse().find((entry) => entry.effective_date.getTime() <= params.periodStart.getTime());
  const inWindow = sorted.filter(
    (entry) => entry.effective_date.getTime() > params.periodStart.getTime() && entry.effective_date.getTime() <= params.periodEnd.getTime(),
  );

  const anchors: { at: Date; game_mode_id: number; mode_code: string; weekly_target: number }[] = [];

  if (beforeOrAtStart) {
    anchors.push({
      at: params.periodStart,
      game_mode_id: beforeOrAtStart.game_mode_id,
      mode_code: beforeOrAtStart.mode_code,
      weekly_target: Number(beforeOrAtStart.weekly_target ?? 0),
    });
  } else if (params.fallbackModeId && params.fallbackModeCode) {
    anchors.push({
      at: params.periodStart,
      game_mode_id: params.fallbackModeId,
      mode_code: params.fallbackModeCode,
      weekly_target: params.fallbackWeeklyTarget,
    });
  }

  for (const row of inWindow) {
    anchors.push({
      at: row.effective_date,
      game_mode_id: row.game_mode_id,
      mode_code: row.mode_code,
      weekly_target: Number(row.weekly_target ?? 0),
    });
  }

  if (anchors.length === 0) {
    return [];
  }

  const segments: ModeSegment[] = [];

  for (let idx = 0; idx < anchors.length; idx += 1) {
    const start = anchors[idx].at;
    const nextStart = anchors[idx + 1]?.at;
    const end = nextStart ? addDays(nextStart, -1) : params.periodEnd;

    if (end.getTime() < start.getTime()) {
      continue;
    }

    segments.push({
      start: formatDate(start),
      end: formatDate(end),
      game_mode_id: anchors[idx].game_mode_id,
      mode_code: anchors[idx].mode_code,
      weekly_target: Math.max(0, anchors[idx].weekly_target),
      days: daysInclusive(start, end),
    });
  }

  return segments;
}

export async function getRollingModeUpgradeAnalysis(userId: string, now: Date = new Date()): Promise<RollingModeUpgradeAnalysis> {
  const analysisEndDate = dateOnlyUtc(now);
  const analysisStartDate = addDays(analysisEndDate, -ANALYSIS_WINDOW_DAYS + 1);
  const analysisStart = formatDate(analysisStartDate);
  const analysisEnd = formatDate(analysisEndDate);

  const userResult = await pool.query<UserModeRow>(
    `SELECT u.user_id,
            u.game_mode_id,
            gm.code AS current_mode,
            gm.weekly_target AS current_weekly_target
       FROM users u
  LEFT JOIN cat_game_mode gm ON gm.game_mode_id = u.game_mode_id
      WHERE u.user_id = $1::uuid
      LIMIT 1`,
    [userId],
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  const [tasksResult, completionResult, historyResult] = await Promise.all([
    pool.query<TaskRow>(
      `SELECT t.task_id,
              COALESCE(t.task, 'Unnamed task') AS task_name,
              t.created_at::text AS created_at
         FROM tasks t
        WHERE t.user_id = $1::uuid
          AND t.active = TRUE
        ORDER BY t.task ASC, t.task_id ASC`,
      [userId],
    ),
    pool.query<CompletionRow>(
      `SELECT dl.task_id,
              COALESCE(SUM(dl.quantity), 0)::int AS actual_count
         FROM daily_log dl
        WHERE dl.user_id = $1::uuid
          AND dl.date >= $2::date
          AND dl.date <= $3::date
        GROUP BY dl.task_id`,
      [userId, analysisStart, analysisEnd],
    ),
    pool.query<HistoryRow>(
      `SELECT h.game_mode_id,
              h.effective_at::text,
              gm.code AS mode_code,
              gm.weekly_target
         FROM user_game_mode_history h
    INNER JOIN cat_game_mode gm ON gm.game_mode_id = h.game_mode_id
        WHERE h.user_id = $1::uuid
          AND h.effective_at::date <= $2::date
        ORDER BY h.effective_at ASC`,
      [userId, analysisEnd],
    ),
  ]);

  const completionByTask = new Map(completionResult.rows.map((row) => [row.task_id, Number(row.actual_count ?? 0)]));

  const tasks: ModeUpgradeAnalysisTask[] = [];

  for (const task of tasksResult.rows) {
    const taskCreatedDate = parseDate(task.created_at);
    const taskStartDate = taskCreatedDate.getTime() > analysisStartDate.getTime() ? taskCreatedDate : analysisStartDate;

    if (taskStartDate.getTime() > analysisEndDate.getTime()) {
      continue;
    }

    const segments = buildModeSegments({
      historyRows: historyResult.rows,
      periodStart: taskStartDate,
      periodEnd: analysisEndDate,
      fallbackModeId: user.game_mode_id,
      fallbackModeCode: user.current_mode,
      fallbackWeeklyTarget: Number(user.current_weekly_target ?? 0),
    });

    const expectedCountRaw = segments.reduce((sum, segment) => sum + (segment.weekly_target * segment.days) / 7, 0);
    const expectedCount = Number(expectedCountRaw.toFixed(4));

    if (expectedCount <= 0) {
      continue;
    }

    const actualCount = completionByTask.get(task.task_id) ?? 0;
    const completionRate = actualCount / expectedCount;

    tasks.push({
      task_id: task.task_id,
      task_name: task.task_name,
      actual_count: actualCount,
      expected_count: expectedCount,
      completion_rate: Number(completionRate.toFixed(4)),
      meets_goal: completionRate >= GOAL_THRESHOLD,
      mode_segments_used: segments.map((segment) => ({
        start: segment.start,
        end: segment.end,
        mode_code: segment.mode_code,
        weekly_target: segment.weekly_target,
        days: segment.days,
        expected_count: Number(((segment.weekly_target * segment.days) / 7).toFixed(4)),
      })),
    });
  }

  const tasksTotalEvaluated = tasks.length;
  const tasksMeetingGoal = tasks.filter((task) => task.meets_goal).length;
  const taskPassRate = tasksTotalEvaluated > 0 ? tasksMeetingGoal / tasksTotalEvaluated : 0;
  const nextMode = resolveNextModeCode(user.current_mode);
  const eligibleForUpgrade = Boolean(nextMode) && taskPassRate >= GOAL_THRESHOLD && tasksTotalEvaluated > 0;
  const requiredTasks = tasksTotalEvaluated > 0 ? Math.ceil(tasksTotalEvaluated * GOAL_THRESHOLD) : null;
  const missingTasks = requiredTasks == null ? null : Math.max(0, requiredTasks - tasksMeetingGoal);
  const hasAnalysis = tasksTotalEvaluated > 0;

  return {
    has_analysis: hasAnalysis,
    analysis_window_days: ANALYSIS_WINDOW_DAYS,
    analysis_start: analysisStart,
    analysis_end: analysisEnd,
    analysis_basis: 'rolling_30_days',
    debug_reason: hasAnalysis ? null : 'no_evaluable_tasks',
    eligible_for_upgrade: eligibleForUpgrade,
    current_mode: user.current_mode,
    next_mode: nextMode,
    tasks_total_evaluated: tasksTotalEvaluated,
    tasks_meeting_goal: tasksMeetingGoal,
    task_pass_rate: Number(taskPassRate.toFixed(4)),
    threshold: GOAL_THRESHOLD,
    missing_tasks: missingTasks,
    cta_enabled: hasAnalysis && eligibleForUpgrade && nextMode != null,
    tasks,
  };
}
