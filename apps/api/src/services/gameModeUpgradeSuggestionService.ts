import { pool } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { getActiveForcedGameModeUpgradeCtaOverride } from './gameModeUpgradeCtaOverrideService.js';
import { getRollingModeUpgradeAnalysis } from './modeUpgradeAnalysisService.js';
import { changeUserGameMode, resolveGameModeByCode } from './userGameModeChangeService.js';

const NEXT_MODE_BY_CODE: Record<string, string | null> = {
  LOW: 'CHILL',
  CHILL: 'FLOW',
  FLOW: 'EVOLVE',
  EVOLVE: null,
};

type UserModeRow = {
  user_id: string;
  game_mode_id: number | null;
  current_mode: string | null;
};


type SuggestionRow = {
  period_key: string;
  eligible_for_upgrade: boolean;
  accepted_at: string | null;
  dismissed_at: string | null;
  current_mode: string;
  suggested_mode: string | null;
};

const CTA_ACTIVE_WINDOW_DAYS = 7;

export type GameModeUpgradeSuggestion = {
  current_mode: string | null;
  suggested_mode: string | null;
  period_key: string | null;
  eligible_for_upgrade: boolean;
  tasks_total_evaluated: number;
  tasks_meeting_goal: number;
  task_pass_rate: number;
  accepted_at: string | null;
  dismissed_at: string | null;
  cta_enabled: boolean;
  cta_active_until: string | null;
  debug_forced_cta: boolean;
};

function computeCtaWindow(createdAt: string | null): string | null {
  if (!createdAt) {
    return null;
  }

  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return null;
  }

  return new Date(createdAtMs + CTA_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isCtaEnabled(params: {
  eligibleForUpgrade: boolean;
  suggestedMode: string | null;
  acceptedAt: string | null;
  ctaActiveUntil: string | null;
}): boolean {
  if (!params.eligibleForUpgrade || !params.suggestedMode || params.acceptedAt || !params.ctaActiveUntil) {
    return false;
  }

  return Date.parse(params.ctaActiveUntil) > Date.now();
}

export function resolveNextGameModeCode(currentModeCode: string | null | undefined): string | null {
  if (!currentModeCode) {
    return null;
  }

  const normalized = currentModeCode.trim().toUpperCase();
  return NEXT_MODE_BY_CODE[normalized] ?? null;
}

async function getUserCurrentMode(client: typeof pool, userId: string): Promise<UserModeRow> {
  const result = await client.query<UserModeRow>(
    `SELECT u.user_id,
            u.game_mode_id,
            gm.code AS current_mode
       FROM users u
  LEFT JOIN cat_game_mode gm ON gm.game_mode_id = u.game_mode_id
      WHERE u.user_id = $1::uuid
      LIMIT 1`,
    [userId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  return row;
}


async function upsertSuggestionState(client: typeof pool, params: {
  userId: string;
  periodKey: string;
  currentGameModeId: number;
  suggestedGameModeId: number | null;
  eligibleForUpgrade: boolean;
}): Promise<{ accepted_at: string | null; dismissed_at: string | null; created_at: string | null }> {
  const result = await client.query<{ accepted_at: string | null; dismissed_at: string | null; created_at: string | null }>(
    `INSERT INTO user_game_mode_upgrade_suggestions (
      user_id,
      period_key,
      current_game_mode_id,
      suggested_game_mode_id,
      eligible_for_upgrade
    ) VALUES ($1::uuid, $2, $3, $4, $5)
    ON CONFLICT (user_id, period_key, current_game_mode_id)
    DO UPDATE SET
      suggested_game_mode_id = EXCLUDED.suggested_game_mode_id,
      eligible_for_upgrade = EXCLUDED.eligible_for_upgrade,
      updated_at = NOW()
    RETURNING accepted_at, dismissed_at, created_at`,
    [
      params.userId,
      params.periodKey,
      params.currentGameModeId,
      params.suggestedGameModeId,
      params.eligibleForUpgrade,
    ],
  );

  return result.rows[0] ?? { accepted_at: null, dismissed_at: null, created_at: null };
}

export async function getGameModeUpgradeSuggestion(userId: string): Promise<GameModeUpgradeSuggestion> {
  const user = await getUserCurrentMode(pool, userId);
  const forcedOverride = await getActiveForcedGameModeUpgradeCtaOverride(userId);

  if (!user.game_mode_id || !user.current_mode) {
    return {
      current_mode: user.current_mode,
      suggested_mode: null,
      period_key: null,
      eligible_for_upgrade: false,
      tasks_total_evaluated: 0,
      tasks_meeting_goal: 0,
      task_pass_rate: 0,
      accepted_at: null,
      dismissed_at: null,
      cta_enabled: false,
      cta_active_until: null,
      debug_forced_cta: false,
    };
  }

  if (forcedOverride) {
    const forcedCurrentMode = forcedOverride.forced_current_mode ?? user.current_mode;
    const forcedNextModeCode = forcedOverride.forced_next_mode ?? resolveNextGameModeCode(forcedCurrentMode);
    const forcedNextMode = forcedNextModeCode ? await resolveGameModeByCode(pool, forcedNextModeCode) : null;
    const canSuggest = Boolean(forcedNextMode);
    const suggestionState = await upsertSuggestionState(pool, {
      userId,
      periodKey: 'debug_forced',
      currentGameModeId: user.game_mode_id,
      suggestedGameModeId: canSuggest ? (forcedNextMode?.game_mode_id ?? null) : null,
      eligibleForUpgrade: canSuggest,
    });

    const ctaActiveUntil = forcedOverride.expires_at;
    const ctaEnabled = Boolean(canSuggest) && (!ctaActiveUntil || Date.parse(ctaActiveUntil) > Date.now());

    return {
      current_mode: forcedCurrentMode,
      suggested_mode: canSuggest ? (forcedNextMode?.code ?? null) : null,
      period_key: 'debug_forced',
      eligible_for_upgrade: canSuggest,
      tasks_total_evaluated: 0,
      tasks_meeting_goal: 0,
      task_pass_rate: 0,
      accepted_at: suggestionState.accepted_at,
      dismissed_at: suggestionState.dismissed_at,
      cta_enabled: ctaEnabled,
      cta_active_until: ctaActiveUntil,
      debug_forced_cta: true,
    };
  }

  const analysis = await getRollingModeUpgradeAnalysis(userId);
  const periodKey = `rolling_${analysis.analysis_end}`;

  if (!analysis.has_analysis) {
    return {
      current_mode: user.current_mode,
      suggested_mode: null,
      period_key: periodKey,
      eligible_for_upgrade: false,
      tasks_total_evaluated: 0,
      tasks_meeting_goal: 0,
      task_pass_rate: 0,
      accepted_at: null,
      dismissed_at: null,
      cta_enabled: false,
      cta_active_until: null,
      debug_forced_cta: false,
    };
  }

  const nextModeCode = resolveNextGameModeCode(user.current_mode);
  const eligibleForUpgrade = Boolean(analysis.eligible_for_upgrade);
  const nextMode = nextModeCode ? await resolveGameModeByCode(pool, nextModeCode) : null;
  const canSuggest = eligibleForUpgrade && Boolean(nextMode);

  const suggestionState = await upsertSuggestionState(pool, {
    userId,
    periodKey,
    currentGameModeId: user.game_mode_id,
    suggestedGameModeId: canSuggest ? (nextMode?.game_mode_id ?? null) : null,
    eligibleForUpgrade,
  });

  const ctaActiveUntil = computeCtaWindow(suggestionState.created_at);
  const ctaEnabled = isCtaEnabled({
    eligibleForUpgrade,
    suggestedMode: canSuggest ? (nextMode?.code ?? null) : null,
    acceptedAt: suggestionState.accepted_at,
    ctaActiveUntil,
  });

  return {
    current_mode: user.current_mode,
    suggested_mode: canSuggest ? (nextMode?.code ?? null) : null,
    period_key: periodKey,
    eligible_for_upgrade: eligibleForUpgrade,
    tasks_total_evaluated: analysis.tasks_total_evaluated,
    tasks_meeting_goal: analysis.tasks_meeting_goal,
    task_pass_rate: analysis.task_pass_rate,
    accepted_at: suggestionState.accepted_at,
    dismissed_at: suggestionState.dismissed_at,
    cta_enabled: ctaEnabled,
    cta_active_until: ctaActiveUntil,
    debug_forced_cta: false,
  };
}

async function getLatestSuggestionForCurrentMode(client: typeof pool, userId: string): Promise<SuggestionRow | null> {
  const result = await client.query<SuggestionRow>(
    `SELECT s.period_key,
            s.eligible_for_upgrade,
            s.accepted_at,
            s.dismissed_at,
            gm_current.code AS current_mode,
            gm_suggested.code AS suggested_mode
       FROM user_game_mode_upgrade_suggestions s
 INNER JOIN cat_game_mode gm_current ON gm_current.game_mode_id = s.current_game_mode_id
  LEFT JOIN cat_game_mode gm_suggested ON gm_suggested.game_mode_id = s.suggested_game_mode_id
      WHERE s.user_id = $1::uuid
        AND s.current_game_mode_id = (
          SELECT game_mode_id
            FROM users
           WHERE user_id = $1::uuid
        )
      ORDER BY s.period_key DESC, s.created_at DESC
      LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function acceptGameModeUpgradeSuggestion(userId: string): Promise<GameModeUpgradeSuggestion> {
  await pool.query('BEGIN');

  try {
    const suggestion = await getGameModeUpgradeSuggestion(userId);

    if (!suggestion.period_key || !suggestion.current_mode) {
      throw new HttpError(409, 'upgrade_suggestion_unavailable', 'No upgrade suggestion is available');
    }

    if (!suggestion.eligible_for_upgrade || !suggestion.suggested_mode) {
      throw new HttpError(409, 'upgrade_suggestion_not_eligible', 'Upgrade suggestion is not eligible');
    }

    const latestSuggestion = await getLatestSuggestionForCurrentMode(pool, userId);

    if (!latestSuggestion || latestSuggestion.period_key !== suggestion.period_key) {
      throw new HttpError(409, 'upgrade_suggestion_stale', 'Upgrade suggestion is stale');
    }

    if (latestSuggestion.accepted_at) {
      await pool.query('COMMIT');
      return suggestion;
    }

    const nextMode = await resolveGameModeByCode(pool, suggestion.suggested_mode);
    const currentMode = await resolveGameModeByCode(pool, suggestion.current_mode);

    try {
      await changeUserGameMode(pool, {
        userId,
        nextGameModeId: nextMode.game_mode_id,
        nextModeCode: nextMode.code,
        expectedCurrentGameModeId: currentMode.game_mode_id,
      });
    } catch (error) {
      if (error instanceof HttpError && error.code === 'game_mode_change_conflict') {
        throw new HttpError(409, 'upgrade_suggestion_stale', 'User game mode changed before accepting suggestion');
      }

      throw error;
    }

    const markAcceptedResult = await pool.query<{ accepted_at: string }>(
      `UPDATE user_game_mode_upgrade_suggestions
          SET accepted_at = COALESCE(accepted_at, NOW()),
              dismissed_at = NULL,
              updated_at = NOW()
        WHERE user_id = $1::uuid
          AND period_key = $2
          AND current_game_mode_id = $3
      RETURNING accepted_at`,
      [userId, suggestion.period_key, currentMode.game_mode_id],
    );

    await pool.query('COMMIT');

    return {
      ...suggestion,
      accepted_at: markAcceptedResult.rows[0]?.accepted_at ?? suggestion.accepted_at,
      dismissed_at: null,
    };
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

export async function dismissGameModeUpgradeSuggestion(userId: string): Promise<GameModeUpgradeSuggestion> {
  const suggestion = await getGameModeUpgradeSuggestion(userId);

  if (!suggestion.period_key || !suggestion.current_mode) {
    return suggestion;
  }

  const currentMode = await resolveGameModeByCode(pool, suggestion.current_mode);

  const result = await pool.query<{ dismissed_at: string }>(
    `UPDATE user_game_mode_upgrade_suggestions
        SET dismissed_at = COALESCE(dismissed_at, NOW()),
            updated_at = NOW()
      WHERE user_id = $1::uuid
        AND period_key = $2
        AND current_game_mode_id = $3
    RETURNING dismissed_at`,
    [userId, suggestion.period_key, currentMode.game_mode_id],
  );

  return {
    ...suggestion,
    dismissed_at: result.rows[0]?.dismissed_at ?? suggestion.dismissed_at,
  };
}
