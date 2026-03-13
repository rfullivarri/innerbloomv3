import type { PoolClient } from 'pg';
import { withClient } from '../db.js';
import { getJourneyGenerationState } from './journeyGenerationStateService.js';

export type OnboardingProgressState = 'in_progress' | 'completed';

export type OnboardingProgress = {
  user_id: string;
  onboarding_session_id: string | null;
  version: number;
  state: OnboardingProgressState;
  onboarding_started_at: string | null;
  game_mode_selected_at: string | null;
  moderation_selected_at: string | null;
  tasks_generated_at: string | null;
  first_task_edited_at: string | null;
  returned_to_dashboard_after_first_edit_at: string | null;
  moderation_modal_shown_at: string | null;
  moderation_modal_resolved_at: string | null;
  first_daily_quest_prompted_at: string | null;
  first_daily_quest_completed_at: string | null;
  daily_quest_scheduled_at: string | null;
  onboarding_completed_at: string | null;
  source: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type ProgressRow = Omit<OnboardingProgress, 'source'> & { source: unknown };

const STEP_COLUMN_MAP = {
  onboarding_started: 'onboarding_started_at',
  game_mode_selected: 'game_mode_selected_at',
  moderation_selected: 'moderation_selected_at',
  tasks_generated: 'tasks_generated_at',
  first_task_edited: 'first_task_edited_at',
  returned_to_dashboard_after_first_edit: 'returned_to_dashboard_after_first_edit_at',
  moderation_modal_shown: 'moderation_modal_shown_at',
  moderation_modal_resolved: 'moderation_modal_resolved_at',
  first_daily_quest_prompted: 'first_daily_quest_prompted_at',
  first_daily_quest_completed: 'first_daily_quest_completed_at',
  daily_quest_scheduled: 'daily_quest_scheduled_at',
  onboarding_completed: 'onboarding_completed_at',
} as const;

export type OnboardingProgressStep = keyof typeof STEP_COLUMN_MAP;

const SELECT_PROGRESS_SQL = `
SELECT
  user_id,
  onboarding_session_id,
  version,
  state,
  onboarding_started_at,
  game_mode_selected_at,
  moderation_selected_at,
  tasks_generated_at,
  first_task_edited_at,
  returned_to_dashboard_after_first_edit_at,
  moderation_modal_shown_at,
  moderation_modal_resolved_at,
  first_daily_quest_prompted_at,
  first_daily_quest_completed_at,
  daily_quest_scheduled_at,
  onboarding_completed_at,
  source,
  created_at,
  updated_at
FROM user_onboarding_progress
WHERE user_id = $1
LIMIT 1
`;

const ENSURE_BASE_ROW_SQL = `
INSERT INTO user_onboarding_progress (user_id)
VALUES ($1)
ON CONFLICT (user_id) DO NOTHING
`;

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

function toProgress(row: ProgressRow): OnboardingProgress {
  return {
    ...row,
    onboarding_started_at: toIso(row.onboarding_started_at),
    game_mode_selected_at: toIso(row.game_mode_selected_at),
    moderation_selected_at: toIso(row.moderation_selected_at),
    tasks_generated_at: toIso(row.tasks_generated_at),
    first_task_edited_at: toIso(row.first_task_edited_at),
    returned_to_dashboard_after_first_edit_at: toIso(row.returned_to_dashboard_after_first_edit_at),
    moderation_modal_shown_at: toIso(row.moderation_modal_shown_at),
    moderation_modal_resolved_at: toIso(row.moderation_modal_resolved_at),
    first_daily_quest_prompted_at: toIso(row.first_daily_quest_prompted_at),
    first_daily_quest_completed_at: toIso(row.first_daily_quest_completed_at),
    daily_quest_scheduled_at: toIso(row.daily_quest_scheduled_at),
    onboarding_completed_at: toIso(row.onboarding_completed_at),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    updated_at: toIso(row.updated_at) ?? new Date().toISOString(),
    source: row.source && typeof row.source === 'object' ? (row.source as Record<string, unknown>) : {},
  };
}

async function readProgressWithClient(client: PoolClient, userId: string): Promise<OnboardingProgress | null> {
  const result = await client.query<ProgressRow>(SELECT_PROGRESS_SQL, [userId]);
  const row = result.rows[0];
  return row ? toProgress(row) : null;
}

async function deriveProgress(client: PoolClient, userId: string): Promise<Partial<OnboardingProgress>> {
  const base = await client.query<{
    onboarding_session_id: string | null;
    onboarding_started_at: Date | string | null;
    game_mode_selected_at: Date | string | null;
    moderation_selected_at: Date | string | null;
    first_task_edited_at: Date | string | null;
    first_daily_quest_completed_at: Date | string | null;
    daily_quest_scheduled_at: Date | string | null;
  }>(
    `SELECT
      (SELECT os.onboarding_session_id FROM onboarding_session os WHERE os.user_id = $1 ORDER BY os.updated_at DESC NULLS LAST, os.created_at DESC NULLS LAST LIMIT 1) AS onboarding_session_id,
      (SELECT os.created_at FROM onboarding_session os WHERE os.user_id = $1 ORDER BY os.updated_at DESC NULLS LAST, os.created_at DESC NULLS LAST LIMIT 1) AS onboarding_started_at,
      (SELECT os.updated_at FROM onboarding_session os WHERE os.user_id = $1 ORDER BY os.updated_at DESC NULLS LAST, os.created_at DESC NULLS LAST LIMIT 1) AS game_mode_selected_at,
      (SELECT MIN(mt.updated_at) FROM moderation_trackers mt WHERE mt.user_id = $1 AND mt.is_enabled = true) AS moderation_selected_at,
      (SELECT MIN(t.updated_at) FROM tasks t WHERE t.user_id = $1) AS first_task_edited_at,
      (SELECT MIN(dl.date)::timestamp AT TIME ZONE 'UTC' FROM daily_log dl WHERE dl.user_id = $1) AS first_daily_quest_completed_at,
      (SELECT MIN(udr.updated_at) FROM user_daily_reminders udr WHERE udr.user_id = $1 AND lower(udr.status) = 'active') AS daily_quest_scheduled_at`,
    [userId],
  );

  const generation = await getJourneyGenerationState(userId);
  const row = base.rows[0];
  return {
    onboarding_session_id: row?.onboarding_session_id ?? null,
    onboarding_started_at: toIso(row?.onboarding_started_at),
    game_mode_selected_at: toIso(row?.game_mode_selected_at),
    moderation_selected_at: toIso(row?.moderation_selected_at),
    tasks_generated_at: generation?.status === 'completed' ? generation.completedAt : null,
    first_task_edited_at: toIso(row?.first_task_edited_at),
    first_daily_quest_completed_at: toIso(row?.first_daily_quest_completed_at),
    daily_quest_scheduled_at: toIso(row?.daily_quest_scheduled_at),
  };
}

function computeState(progress: Partial<OnboardingProgress>): OnboardingProgressState {
  return progress.onboarding_completed_at ? 'completed' : 'in_progress';
}

export async function getOnboardingProgress(userId: string): Promise<OnboardingProgress> {
  return withClient(async (client) => {
    let progress = await readProgressWithClient(client, userId);
    if (progress) return progress;

    const derived = await deriveProgress(client, userId);
    await client.query(ENSURE_BASE_ROW_SQL, [userId]);
    await client.query(
      `UPDATE user_onboarding_progress
          SET onboarding_session_id = COALESCE(onboarding_session_id, $2),
              onboarding_started_at = COALESCE(onboarding_started_at, $3),
              game_mode_selected_at = COALESCE(game_mode_selected_at, $4),
              moderation_selected_at = COALESCE(moderation_selected_at, $5),
              tasks_generated_at = COALESCE(tasks_generated_at, $6),
              first_task_edited_at = COALESCE(first_task_edited_at, $7),
              first_daily_quest_completed_at = COALESCE(first_daily_quest_completed_at, $8),
              daily_quest_scheduled_at = COALESCE(daily_quest_scheduled_at, $9),
              state = CASE WHEN COALESCE(onboarding_completed_at, $10) IS NOT NULL THEN 'completed' ELSE state END,
              onboarding_completed_at = COALESCE(onboarding_completed_at, $10),
              source = source || jsonb_build_object('derived', true, 'derived_at', now()),
              updated_at = now()
        WHERE user_id = $1`,
      [
        userId,
        derived.onboarding_session_id ?? null,
        derived.onboarding_started_at ?? null,
        derived.game_mode_selected_at ?? null,
        derived.moderation_selected_at ?? null,
        derived.tasks_generated_at ?? null,
        derived.first_task_edited_at ?? null,
        derived.first_daily_quest_completed_at ?? null,
        derived.daily_quest_scheduled_at ?? null,
        derived.first_daily_quest_completed_at && derived.daily_quest_scheduled_at ? derived.first_daily_quest_completed_at : null,
      ],
    );

    progress = await readProgressWithClient(client, userId);
    if (!progress) {
      throw new Error('Failed to initialize onboarding progress');
    }

    return progress;
  });
}

export async function markOnboardingProgressStep(
  userId: string,
  step: OnboardingProgressStep,
  options: { onboardingSessionId?: string | null; source?: Record<string, unknown> } = {},
): Promise<OnboardingProgress> {
  return withClient((client) => markOnboardingProgressStepWithClient(client, userId, step, options));
}

export async function markOnboardingProgressStepWithClient(
  client: PoolClient,
  userId: string,
  step: OnboardingProgressStep,
  options: { onboardingSessionId?: string | null; source?: Record<string, unknown> } = {},
): Promise<OnboardingProgress> {
  await client.query(ENSURE_BASE_ROW_SQL, [userId]);
  const column = STEP_COLUMN_MAP[step];

  await client.query(
    `UPDATE user_onboarding_progress
        SET ${column} = COALESCE(${column}, now()),
            onboarding_session_id = COALESCE(onboarding_session_id, $2),
            onboarding_completed_at = CASE
              WHEN $3::boolean THEN COALESCE(onboarding_completed_at, now())
              ELSE onboarding_completed_at
            END,
            state = CASE
              WHEN onboarding_completed_at IS NOT NULL OR $3::boolean THEN 'completed'
              ELSE 'in_progress'
            END,
            source = source || $4::jsonb,
            updated_at = now()
      WHERE user_id = $1`,
    [userId, options.onboardingSessionId ?? null, step === 'onboarding_completed', JSON.stringify(options.source ?? {})],
  );

  const progress = await readProgressWithClient(client, userId);
  if (!progress) throw new Error('Failed to read onboarding progress after step update');
  return progress;
}

export async function reconcileOnboardingProgressFromClient(
  userId: string,
  flags: Partial<Record<OnboardingProgressStep, boolean>>,
): Promise<OnboardingProgress> {
  const enabledSteps = Object.entries(flags)
    .filter((entry): entry is [OnboardingProgressStep, boolean] => Boolean(entry[1]))
    .map(([key]) => key as OnboardingProgressStep);

  if (enabledSteps.length === 0) {
    return getOnboardingProgress(userId);
  }

  return withClient(async (client) => {
    await client.query(ENSURE_BASE_ROW_SQL, [userId]);

    for (const step of enabledSteps) {
      const column = STEP_COLUMN_MAP[step];
      await client.query(
        `UPDATE user_onboarding_progress
            SET ${column} = COALESCE(${column}, now()),
                state = CASE WHEN onboarding_completed_at IS NOT NULL OR $2::boolean THEN 'completed' ELSE state END,
                onboarding_completed_at = CASE WHEN $2::boolean THEN COALESCE(onboarding_completed_at, now()) ELSE onboarding_completed_at END,
                source = source || jsonb_build_object('legacy_reconciled', true, 'legacy_reconciled_at', now()),
                updated_at = now()
          WHERE user_id = $1`,
        [userId, step === 'onboarding_completed'],
      );
    }

    const progress = await readProgressWithClient(client, userId);
    if (!progress) {
      throw new Error('Failed to reconcile onboarding progress');
    }

    return {
      ...progress,
      state: computeState(progress),
    };
  });
}
