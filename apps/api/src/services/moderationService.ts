import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';

type TrackerType = 'alcohol' | 'tobacco' | 'sugar';
type TrackerStatus = 'on_track' | 'off_track' | 'not_logged';

type TrackerRow = {
  type: TrackerType;
  is_enabled: boolean;
  is_paused: boolean;
  not_logged_tolerance_days: number;
  current_streak_days: number;
};

type DayRow = { day_key: string | null };

type LogRow = { day_key: string; status: TrackerStatus };

type DailyQuestSubmissionRow = { submitted: boolean };

const TRACKER_TYPES: readonly TrackerType[] = ['alcohol', 'tobacco', 'sugar'] as const;


function addUtcDays(dayKey: string, amount: number): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}


function parseDayKey(raw: unknown): string {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(raw.trim())) {
    throw new HttpError(400, 'invalid_day_key', 'dayKey must use YYYY-MM-DD format');
  }
  return raw.trim();
}

async function resolveCurrentDayKey(userId: string): Promise<string> {
  const result = await pool.query<DayRow>(
    `SELECT timezone(COALESCE(timezone, 'UTC'), now())::date::text AS day_key
       FROM users
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );

  const dayKey = result.rows[0]?.day_key?.trim();
  if (!dayKey) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  return dayKey;
}

async function ensureTrackers(userId: string): Promise<void> {
  await pool.query(
    `INSERT INTO moderation_trackers (user_id, type)
     SELECT $1::uuid, tracker.type
       FROM (VALUES ('alcohol'), ('tobacco'), ('sugar')) AS tracker(type)
     ON CONFLICT (user_id, type) DO NOTHING`,
    [userId],
  );
}

async function hasDailyQuestSubmission(userId: string, dayKey: string): Promise<boolean> {
  const result = await pool.query<DailyQuestSubmissionRow>(
    `SELECT (
      EXISTS(SELECT 1 FROM daily_log WHERE user_id = $1 AND date = $2)
      OR EXISTS(SELECT 1 FROM emotions_logs WHERE user_id = $1 AND date = $2)
    ) AS submitted`,
    [userId, dayKey],
  );

  return Boolean(result.rows[0]?.submitted);
}

async function recalculateStreak(userId: string, trackerType: TrackerType): Promise<number> {
  const configResult = await pool.query<Pick<TrackerRow, 'is_paused' | 'not_logged_tolerance_days'>>(
    `SELECT is_paused, not_logged_tolerance_days
       FROM moderation_trackers
      WHERE user_id = $1
        AND type = $2
      LIMIT 1`,
    [userId, trackerType],
  );

  const config = configResult.rows[0];
  if (!config) {
    return 0;
  }

  if (config.is_paused) {
    const current = await pool.query<{ current_streak_days: number }>(
      `SELECT current_streak_days FROM moderation_trackers WHERE user_id = $1 AND type = $2 LIMIT 1`,
      [userId, trackerType],
    );
    return current.rows[0]?.current_streak_days ?? 0;
  }

  const [logsResult, dayKey] = await Promise.all([
    pool.query<LogRow>(
      `SELECT day_key::text AS day_key, status
         FROM moderation_daily_logs
        WHERE user_id = $1
          AND tracker_type = $2
     ORDER BY day_key DESC
        LIMIT 180`,
      [userId, trackerType],
    ),
    resolveCurrentDayKey(userId),
  ]);

  const logMap = new Map(logsResult.rows.map((row) => [row.day_key, row.status]));

  let streak = 0;
  let notLoggedRun = 0;
  let cursor = dayKey;

  for (let i = 0; i < 180; i += 1) {
    const status = logMap.get(cursor) ?? 'not_logged';

    if (status === 'off_track') {
      break;
    }

    if (status === 'not_logged') {
      notLoggedRun += 1;
      if (notLoggedRun > config.not_logged_tolerance_days) {
        break;
      }
      cursor = addUtcDays(cursor, -1);
      continue;
    }

    streak += 1;
    notLoggedRun = 0;
    cursor = addUtcDays(cursor, -1);
  }

  await pool.query(
    `UPDATE moderation_trackers
        SET current_streak_days = $3,
            updated_at = now()
      WHERE user_id = $1
        AND type = $2`,
    [userId, trackerType, streak],
  );

  return streak;
}

export async function getModerationState(userId: string) {
  await ensureTrackers(userId);
  const dayKey = await resolveCurrentDayKey(userId);

  const [trackersResult, logsResult, submitted] = await Promise.all([
    pool.query<TrackerRow>(
      `SELECT type, is_enabled, is_paused, not_logged_tolerance_days, current_streak_days
         FROM moderation_trackers
        WHERE user_id = $1
     ORDER BY type ASC`,
      [userId],
    ),
    pool.query<{ tracker_type: TrackerType; status: TrackerStatus }>(
      `SELECT tracker_type, status
         FROM moderation_daily_logs
        WHERE user_id = $1
          AND day_key = $2`,
      [userId, dayKey],
    ),
    hasDailyQuestSubmission(userId, dayKey),
  ]);

  const statusByType = new Map<TrackerType, TrackerStatus>(
    logsResult.rows.map((row) => [row.tracker_type, row.status]),
  );

  return {
    dayKey,
    dailyQuestCompleted: submitted,
    trackers: trackersResult.rows.map((tracker) => ({
      ...tracker,
      statusToday: statusByType.get(tracker.type) ?? 'not_logged',
    })),
  };
}

export async function updateModerationStatus(
  userId: string,
  trackerType: TrackerType,
  payload: { dayKey: unknown; status: TrackerStatus },
) {
  const dayKey = parseDayKey(payload.dayKey);
  const currentDayKey = await resolveCurrentDayKey(userId);
  if (dayKey !== currentDayKey) {
    throw new HttpError(400, 'day_key_mismatch', 'dayKey must match current Daily Quest day');
  }

  await ensureTrackers(userId);

  await pool.query(
    `INSERT INTO moderation_daily_logs (user_id, tracker_type, day_key, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, tracker_type, day_key)
     DO UPDATE SET status = EXCLUDED.status,
                   updated_at = now()`,
    [userId, trackerType, dayKey, payload.status],
  );

  const currentStreakDays = await recalculateStreak(userId, trackerType);
  const state = await getModerationState(userId);
  return {
    ...state,
    updatedTracker: trackerType,
    currentStreakDays,
  };
}

export async function updateModerationConfig(
  userId: string,
  trackerType: TrackerType,
  payload: { isEnabled?: boolean; isPaused?: boolean; notLoggedToleranceDays?: number },
) {
  await ensureTrackers(userId);

  await pool.query(
    `UPDATE moderation_trackers
        SET is_enabled = COALESCE($3, is_enabled),
            is_paused = COALESCE($4, is_paused),
            not_logged_tolerance_days = COALESCE($5, not_logged_tolerance_days),
            updated_at = now()
      WHERE user_id = $1
        AND type = $2`,
    [
      userId,
      trackerType,
      payload.isEnabled ?? null,
      payload.isPaused ?? null,
      payload.notLoggedToleranceDays ?? null,
    ],
  );

  await recalculateStreak(userId, trackerType);
  return getModerationState(userId);
}

export { TRACKER_TYPES, type TrackerType, type TrackerStatus };
