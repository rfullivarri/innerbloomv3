import { pool } from '../db.js';

const TABLE_NAME = 'user_product_notification_preferences';

export type ProductNotificationPreferences = {
  weekly_wrapped_enabled: boolean;
  growth_calibration_enabled: boolean;
  monthly_wrapped_enabled: boolean;
  habit_achievement_enabled: boolean;
  updated_at: Date | string | null;
};

export type ProductNotificationPreferencesInput = Pick<
  ProductNotificationPreferences,
  'weekly_wrapped_enabled' | 'growth_calibration_enabled' | 'monthly_wrapped_enabled' | 'habit_achievement_enabled'
>;

const DEFAULT_PREFERENCES: ProductNotificationPreferences = {
  weekly_wrapped_enabled: false,
  growth_calibration_enabled: false,
  monthly_wrapped_enabled: false,
  habit_achievement_enabled: false,
  updated_at: null,
};

export async function getProductNotificationPreferences(userId: string): Promise<ProductNotificationPreferences> {
  const result = await pool.query<ProductNotificationPreferences>(
    `SELECT weekly_wrapped_enabled, growth_calibration_enabled, monthly_wrapped_enabled, habit_achievement_enabled, updated_at
       FROM ${TABLE_NAME}
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? DEFAULT_PREFERENCES;
}

export async function upsertProductNotificationPreferences(
  userId: string,
  preferences: ProductNotificationPreferencesInput,
): Promise<ProductNotificationPreferences> {
  const result = await pool.query<ProductNotificationPreferences>(
    `INSERT INTO ${TABLE_NAME} (
       user_id, weekly_wrapped_enabled, growth_calibration_enabled, monthly_wrapped_enabled, habit_achievement_enabled
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET
       weekly_wrapped_enabled = EXCLUDED.weekly_wrapped_enabled,
       growth_calibration_enabled = EXCLUDED.growth_calibration_enabled,
       monthly_wrapped_enabled = EXCLUDED.monthly_wrapped_enabled,
       habit_achievement_enabled = EXCLUDED.habit_achievement_enabled,
       updated_at = now()
     RETURNING weekly_wrapped_enabled, growth_calibration_enabled, monthly_wrapped_enabled, habit_achievement_enabled, updated_at`,
    [
      userId,
      preferences.weekly_wrapped_enabled,
      preferences.growth_calibration_enabled,
      preferences.monthly_wrapped_enabled,
      preferences.habit_achievement_enabled,
    ],
  );
  return result.rows[0] ?? DEFAULT_PREFERENCES;
}

export async function getProductNotificationPreferenceSummary(): Promise<{
  configuredUsers: number;
  weeklyWrappedEnabled: number;
  growthCalibrationEnabled: number;
  monthlyWrappedEnabled: number;
  habitAchievementEnabled: number;
}> {
  const result = await pool.query<{
    configured_users: string;
    weekly_wrapped_enabled: string;
    growth_calibration_enabled: string;
    monthly_wrapped_enabled: string;
    habit_achievement_enabled: string;
  }>(
    `SELECT COUNT(*)::text AS configured_users,
            COUNT(*) FILTER (WHERE weekly_wrapped_enabled)::text AS weekly_wrapped_enabled,
            COUNT(*) FILTER (WHERE growth_calibration_enabled)::text AS growth_calibration_enabled,
            COUNT(*) FILTER (WHERE monthly_wrapped_enabled)::text AS monthly_wrapped_enabled,
            COUNT(*) FILTER (WHERE habit_achievement_enabled)::text AS habit_achievement_enabled
       FROM ${TABLE_NAME}`,
  );
  const row = result.rows[0];
  return {
    configuredUsers: Number(row?.configured_users ?? 0),
    weeklyWrappedEnabled: Number(row?.weekly_wrapped_enabled ?? 0),
    growthCalibrationEnabled: Number(row?.growth_calibration_enabled ?? 0),
    monthlyWrappedEnabled: Number(row?.monthly_wrapped_enabled ?? 0),
    habitAchievementEnabled: Number(row?.habit_achievement_enabled ?? 0),
  };
}
