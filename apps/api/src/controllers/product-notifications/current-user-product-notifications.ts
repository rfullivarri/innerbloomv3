import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import {
  getProductNotificationPreferences,
  upsertProductNotificationPreferences,
} from '../../repositories/user-product-notification-preferences.repository.js';

const preferencesSchema = z.object({
  weekly_wrapped_enabled: z.boolean(),
  growth_calibration_enabled: z.boolean(),
  monthly_wrapped_enabled: z.boolean(),
  habit_achievement_enabled: z.boolean(),
});

function serialize(preferences: Awaited<ReturnType<typeof getProductNotificationPreferences>>) {
  return {
    weeklyWrappedEnabled: preferences.weekly_wrapped_enabled,
    growthCalibrationEnabled: preferences.growth_calibration_enabled,
    monthlyWrappedEnabled: preferences.monthly_wrapped_enabled,
    habitAchievementEnabled: preferences.habit_achievement_enabled,
    updatedAt: preferences.updated_at instanceof Date ? preferences.updated_at.toISOString() : preferences.updated_at,
  };
}

export const getCurrentUserProductNotificationPreferences: AsyncHandler = async (req, res) => {
  if (!req.user) throw new HttpError(401, 'unauthorized', 'Authentication required');
  res.json(serialize(await getProductNotificationPreferences(req.user.id)));
};

export const putCurrentUserProductNotificationPreferences: AsyncHandler = async (req, res) => {
  if (!req.user) throw new HttpError(401, 'unauthorized', 'Authentication required');
  const body = preferencesSchema.parse(req.body ?? {});
  res.json(serialize(await upsertProductNotificationPreferences(req.user.id, body)));
};
