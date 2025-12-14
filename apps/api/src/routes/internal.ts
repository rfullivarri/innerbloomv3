import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { runDailyReminderJob } from '../services/dailyReminderJob.js';
import { runWeeklyWrappedJob } from '../services/weeklyWrappedService.js';

const router = Router();

router.post(
  '/internal/cron/daily-reminders',
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
  '/internal/cron/weekly-wrapped',
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

export default router;
