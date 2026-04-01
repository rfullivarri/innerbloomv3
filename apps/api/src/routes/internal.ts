import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { runDailyReminderJob } from '../services/dailyReminderJob.js';
import { runSubscriptionNotificationsJob } from '../services/subscriptionNotificationsJob.js';
import { runWeeklyWrappedJob } from '../services/weeklyWrappedService.js';
import {
  runMonthlyTaskDifficultyCalibration,
  runTaskDifficultyCalibrationBackfill,
} from '../services/taskDifficultyCalibrationService.js';
import { createRateLimitMiddleware } from '../middlewares/rate-limit.js';
import { runUserMonthlyModeUpgradeAggregation } from '../services/modeUpgradeMonthlyAggregationService.js';
import { runMonthlyHabitAchievementDetection } from '../services/habitAchievementService.js';

const router = Router();

const cronRateLimit = createRateLimitMiddleware({
  keyPrefix: 'internal-cron',
  windowMs: 60_000,
  maxRequests: 10,
});

router.post(
  '/internal/cron/daily-reminders',
  cronRateLimit,
  asyncHandler(async (req, res) => {
    const expectedSecret = process.env.CRON_SECRET?.trim();

    if (!expectedSecret) {
      res.status(503).json({ code: 'cron_secret_missing', message: 'CRON secret is not configured' });
      return;
    }

    const providedSecret = req.get('x-cron-secret')?.trim();

    if (!providedSecret || providedSecret !== expectedSecret) {
      res.status(401).json({ code: 'invalid_cron_secret', message: 'Invalid or missing cron secret' });
      return;
    }

    const result = await runDailyReminderJob(new Date());

    res.json({ ok: true, ...result });
  }),
);

router.post(
  '/internal/cron/subscription-notifications',
  cronRateLimit,
  asyncHandler(async (req, res) => {
    const expectedSecret = process.env.CRON_SECRET?.trim();

    if (!expectedSecret) {
      res.status(503).json({ code: 'cron_secret_missing', message: 'CRON secret is not configured' });
      return;
    }

    const providedSecret = req.get('x-cron-secret')?.trim();

    if (!providedSecret || providedSecret !== expectedSecret) {
      res.status(401).json({ code: 'invalid_cron_secret', message: 'Invalid or missing cron secret' });
      return;
    }

    const result = await runSubscriptionNotificationsJob(new Date());
    res.json({ ok: true, ...result });
  }),
);

router.post(
  '/internal/cron/weekly-wrapped',
  cronRateLimit,
  asyncHandler(async (req, res) => {
    const expectedSecret = process.env.CRON_SECRET?.trim();

    if (!expectedSecret) {
      res.status(503).json({ code: 'cron_secret_missing', message: 'CRON secret is not configured' });
      return;
    }

    const providedSecret = req.get('x-cron-secret')?.trim();

    if (!providedSecret || providedSecret !== expectedSecret) {
      res.status(401).json({ code: 'invalid_cron_secret', message: 'Invalid or missing cron secret' });
      return;
    }

    const result = await runWeeklyWrappedJob(new Date());

    res.json({ ok: true, ...result });
  }),
);

router.post(
  '/internal/cron/monthly-task-difficulty',
  cronRateLimit,
  asyncHandler(async (req, res) => {
    const expectedSecret = process.env.CRON_SECRET?.trim();

    if (!expectedSecret) {
      res.status(503).json({ code: 'cron_secret_missing', message: 'CRON secret is not configured' });
      return;
    }

    const providedSecret = req.get('x-cron-secret')?.trim();

    if (!providedSecret || providedSecret !== expectedSecret) {
      res.status(401).json({ code: 'invalid_cron_secret', message: 'Invalid or missing cron secret' });
      return;
    }

    const shouldBackfill = req.query.backfill === '1';
    const now = new Date();
    const result = shouldBackfill
      ? await runTaskDifficultyCalibrationBackfill(now)
      : await runMonthlyTaskDifficultyCalibration(now);

    const modeUpgradeAggregation = shouldBackfill ? null : await runUserMonthlyModeUpgradeAggregation({ now });
    const habitAchievement = shouldBackfill || !modeUpgradeAggregation
      ? null
      : await runMonthlyHabitAchievementDetection({
          now,
          periodStart: modeUpgradeAggregation.periodStart,
          nextPeriodStart: modeUpgradeAggregation.nextPeriodStart,
        });

    res.json({
      ok: true,
      backfill: shouldBackfill,
      ...result,
      mode_upgrade_aggregation: modeUpgradeAggregation,
      habit_achievement: habitAchievement,
    });
  }),
);

export default router;
