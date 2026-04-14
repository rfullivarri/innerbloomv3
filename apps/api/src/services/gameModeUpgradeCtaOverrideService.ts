import { pool } from '../db.js';

export type GameModeUpgradeCtaOverride = {
  user_id: string;
  enabled: boolean;
  forced_current_mode: string | null;
  forced_next_mode: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type OverrideRow = {
  user_id: string;
  enabled: boolean;
  forced_current_mode: string | null;
  forced_next_mode: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getGameModeUpgradeCtaOverride(userId: string): Promise<GameModeUpgradeCtaOverride | null> {
  const result = await pool.query<OverrideRow>(
    `SELECT user_id,
            enabled,
            forced_current_mode,
            forced_next_mode,
            expires_at,
            created_at,
            updated_at
       FROM user_game_mode_upgrade_cta_overrides
      WHERE user_id = $1::uuid
      LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function getActiveForcedGameModeUpgradeCtaOverride(userId: string): Promise<GameModeUpgradeCtaOverride | null> {
  const result = await pool.query<OverrideRow>(
    `SELECT user_id,
            enabled,
            forced_current_mode,
            forced_next_mode,
            expires_at,
            created_at,
            updated_at
       FROM user_game_mode_upgrade_cta_overrides
      WHERE user_id = $1::uuid
        AND enabled = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1`,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function upsertGameModeUpgradeCtaOverride(input: {
  userId: string;
  enabled: boolean;
  forcedCurrentMode: string | null;
  forcedNextMode: string | null;
  expiresAt: string | null;
}): Promise<GameModeUpgradeCtaOverride> {
  const result = await pool.query<OverrideRow>(
    `INSERT INTO user_game_mode_upgrade_cta_overrides (
      user_id,
      enabled,
      forced_current_mode,
      forced_next_mode,
      expires_at
    ) VALUES ($1::uuid, $2, $3, $4, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      forced_current_mode = EXCLUDED.forced_current_mode,
      forced_next_mode = EXCLUDED.forced_next_mode,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
    RETURNING user_id, enabled, forced_current_mode, forced_next_mode, expires_at, created_at, updated_at`,
    [
      input.userId,
      input.enabled,
      null,
      input.forcedNextMode ? input.forcedNextMode.trim().toUpperCase() : null,
      input.expiresAt,
    ],
  );

  return result.rows[0];
}

export async function clearGameModeUpgradeCtaOverride(userId: string): Promise<void> {
  await pool.query(
    `DELETE FROM user_game_mode_upgrade_cta_overrides
      WHERE user_id = $1::uuid`,
    [userId],
  );
}
