import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, withClientSpy } = vi.hoisted(() => {
  type Row = {
    user_id: string;
    onboarding_session_id: string | null;
    version: number;
    state: 'in_progress' | 'completed';
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

  const rows = new Map<string, Row>();
  let nowCounter = 0;

  const nowIso = () => {
    nowCounter += 1;
    return new Date(Date.UTC(2026, 2, 13, 19, 0, nowCounter)).toISOString();
  };

  const ensureRow = (userId: string) => {
    const existing = rows.get(userId);
    if (existing) return existing;
    const now = nowIso();
    const row: Row = {
      user_id: userId,
      onboarding_session_id: null,
      version: 1,
      state: 'in_progress',
      onboarding_started_at: null,
      game_mode_selected_at: null,
      moderation_selected_at: null,
      tasks_generated_at: null,
      first_task_edited_at: null,
      returned_to_dashboard_after_first_edit_at: null,
      moderation_modal_shown_at: null,
      moderation_modal_resolved_at: null,
      first_daily_quest_prompted_at: null,
      first_daily_quest_completed_at: null,
      daily_quest_scheduled_at: null,
      onboarding_completed_at: null,
      source: {},
      created_at: now,
      updated_at: now,
    };
    rows.set(userId, row);
    return row;
  };

  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('INSERT INTO user_onboarding_progress')) {
      ensureRow(params[0] as string);
      return { rowCount: 1, rows: [] };
    }

    if (sql.includes('SELECT') && sql.includes('FROM user_onboarding_progress')) {
      const row = rows.get(params[0] as string);
      return { rowCount: row ? 1 : 0, rows: row ? [{ ...row }] : [] };
    }

    if (sql.includes('SET returned_to_dashboard_after_first_edit_at = NULL')) {
      const row = ensureRow(params[0] as string);
      row.returned_to_dashboard_after_first_edit_at = null;
      row.updated_at = nowIso();
      row.source = { ...row.source, returned_dashboard_timestamp_sanitized: true };
      return { rowCount: 1, rows: [] };
    }

    if (sql.includes('SET first_task_edited_at = COALESCE(first_task_edited_at, now())')) {
      const row = ensureRow(params[0] as string);
      row.first_task_edited_at ??= nowIso();
      row.updated_at = nowIso();
      return { rowCount: 1, rows: [] };
    }

    if (sql.includes('SET returned_to_dashboard_after_first_edit_at = COALESCE(returned_to_dashboard_after_first_edit_at, now())')) {
      const row = ensureRow(params[0] as string);
      row.returned_to_dashboard_after_first_edit_at ??= nowIso();
      row.updated_at = nowIso();
      return { rowCount: 1, rows: [] };
    }

    throw new Error(`Unhandled SQL in test: ${sql}`);
  });

  const client = { query };
  const withClient = vi.fn(async (callback: (client: typeof client) => Promise<unknown>) => callback(client));

  return { state: { rows, nowIso, ensureRow, query }, withClientSpy: withClient };
});

vi.mock('../../db.js', () => ({
  withClient: (callback: (client: { query: (sql: string, params?: unknown[]) => Promise<unknown> }) => Promise<unknown>) =>
    withClientSpy(callback),
}));

vi.mock('../journeyGenerationStateService.js', () => ({
  getJourneyGenerationState: vi.fn().mockResolvedValue(null),
}));

import {
  getOnboardingProgress,
  markOnboardingProgressStep,
  reconcileOnboardingProgressFromClient,
} from '../onboardingProgressService.js';

beforeEach(() => {
  state.rows.clear();
  state.query.mockClear();
  withClientSpy.mockClear();
});

describe('onboardingProgressService temporal guards', () => {
  it('does not reconcile returned_to_dashboard_after_first_edit when first_task_edited is absent', async () => {
    const progress = await reconcileOnboardingProgressFromClient('user-a', {
      returned_to_dashboard_after_first_edit: true,
    });

    expect(progress.first_task_edited_at).toBeNull();
    expect(progress.returned_to_dashboard_after_first_edit_at).toBeNull();
  });

  it('does not mark returned_to_dashboard_after_first_edit before first_task_edited exists', async () => {
    const progress = await markOnboardingProgressStep('user-b', 'returned_to_dashboard_after_first_edit');

    expect(progress.first_task_edited_at).toBeNull();
    expect(progress.returned_to_dashboard_after_first_edit_at).toBeNull();
  });

  it('sanitizes impossible returned timestamp already persisted from legacy data', async () => {
    const row = state.ensureRow('user-c');
    row.returned_to_dashboard_after_first_edit_at = '2026-03-13T18:57:02.000Z';
    row.first_task_edited_at = '2026-03-13T18:59:35.000Z';

    const progress = await getOnboardingProgress('user-c');

    expect(progress.first_task_edited_at).toBe('2026-03-13T18:59:35.000Z');
    expect(progress.returned_to_dashboard_after_first_edit_at).toBeNull();
  });
});
