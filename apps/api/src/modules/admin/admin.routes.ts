import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { validateMarketingR2AssetUrls } from '../../services/marketingR2AssetService.js';
import {
  exportAdminUserLogsCsv,
  getAdminMe,
  getAdminUserInsights,
  getAdminUserLogs,
  getAdminUserTaskStats,
  getAdminTaskDifficultyCalibrationAudit,
  getAdminUserModeUpgradeAnalysis,
  getAdminUserTasks,
  getAdminUsers,
  getTaskgenJobLogsHandler,
  getTaskgenJobs,
  getTaskgenUserOverviewHandler,
  patchAdminUserTask,
  getTaskgenTraceForUser,
  getTaskgenTraceByCorrelation,
  getTaskgenTraceGlobal,
  postTaskgenForceRun,
  retryTaskgenJobHandler,
  postAdminSendReminder,
  postAdminSendTasksReady,
  postAdminRunSubscriptionNotifications,
  getAdminUserSubscription,
  putAdminUserSubscription,
  getAdminFeedbackDefinitions,
  patchAdminFeedbackDefinition,
  getAdminFeedbackUserHistory,
  getAdminFeedbackUserState,
  patchAdminFeedbackUserState,
  postAdminRunTaskDifficultyCalibration,
  postAdminRunModeUpgradeAggregation,
  postAdminRunHabitAchievementRetroactive,
  getAdminHabitAchievementDiagnostics,
  postAdminRunMonthlyReview,
  postAdminUserManualGameModeChange,
  postAdminRunModeUpgradeAnalysis,
  getAdminUserModeUpgradeCtaOverride,
  putAdminUserModeUpgradeCtaOverride,
  deleteAdminUserModeUpgradeCtaOverride,
  getAdminMonthlyPipelineStatus,
  getAdminMarketingCampaigns,
  getAdminMarketingAnalyticsInsights,
  getAdminMarketingAnalyticsStatus,
  getAdminMarketingCmoContextStatus,
  getAdminMarketingR2Status,
  patchAdminMarketingPost,
  postAdminMarketingCmoContext,
  postAdminMonthlyPipelineRun,
  postAdminMarketingAnalyticsSync,
  postAdminMarketingR2Assets,
  putAdminMarketingAnalyticsSettings,
} from './admin.handlers.js';
import { requireAdmin } from './admin.middleware.js';

const router = Router();
const adminRouter = Router();

const marketingMediaValidationBodySchema = z.object({
  urls: z.array(z.string().trim().url().max(2000)).min(1).max(100),
});

adminRouter.get('/me', getAdminMe);
adminRouter.get('/users', getAdminUsers);
adminRouter.get('/marketing/campaigns', getAdminMarketingCampaigns);
adminRouter.patch('/marketing/campaigns/:campaignCode/posts/:postCode', patchAdminMarketingPost);
adminRouter.post('/marketing/agents/cmo/context', postAdminMarketingCmoContext);
adminRouter.get('/marketing/agents/cmo/context/status', getAdminMarketingCmoContextStatus);
adminRouter.get('/marketing/analytics/status', getAdminMarketingAnalyticsStatus);
adminRouter.get('/marketing/analytics/insights', getAdminMarketingAnalyticsInsights);
adminRouter.post('/marketing/analytics/sync', postAdminMarketingAnalyticsSync);
adminRouter.put('/marketing/analytics/settings', putAdminMarketingAnalyticsSettings);
adminRouter.get('/marketing/r2/status', getAdminMarketingR2Status);
adminRouter.post('/marketing/r2/assets', postAdminMarketingR2Assets);
adminRouter.post('/marketing/r2/validate', asyncHandler(async (req, res) => {
  const body = marketingMediaValidationBodySchema.parse(req.body ?? {});
  const assets = await validateMarketingR2AssetUrls(body.urls);
  res.json({
    ok: assets.every((asset) => asset.ok),
    assets,
  });
}));
adminRouter.get('/taskgen/jobs', getTaskgenJobs);
adminRouter.get('/taskgen/jobs/:jobId/logs', getTaskgenJobLogsHandler);
adminRouter.post('/taskgen/jobs/:jobId/retry', retryTaskgenJobHandler);
adminRouter.get('/users/:userId/insights', getAdminUserInsights);
adminRouter.get('/users/:userId/logs', getAdminUserLogs);
adminRouter.get('/users/:userId/tasks', getAdminUserTasks);
adminRouter.get('/users/:userId/task-stats', getAdminUserTaskStats);
adminRouter.get('/user/:userId/mode-upgrade-analysis', getAdminUserModeUpgradeAnalysis);
adminRouter.get('/users/:userId/taskgen/latest', getTaskgenUserOverviewHandler);
adminRouter.patch('/users/:userId/tasks/:taskId', patchAdminUserTask);
adminRouter.get('/users/:userId/logs.csv', exportAdminUserLogsCsv);
adminRouter.post('/users/:userId/daily-reminder/send', postAdminSendReminder);
adminRouter.post('/users/:userId/tasks-ready/send', postAdminSendTasksReady);
adminRouter.get('/users/:userId/subscription', getAdminUserSubscription);
adminRouter.put('/users/:userId/subscription', putAdminUserSubscription);
adminRouter.post('/subscription-notifications/run', postAdminRunSubscriptionNotifications);
adminRouter.get('/taskgen/trace', getTaskgenTraceForUser);
adminRouter.get('/taskgen/trace/by-correlation/:id', getTaskgenTraceByCorrelation);
adminRouter.get('/taskgen/trace/global', getTaskgenTraceGlobal);
adminRouter.post('/taskgen/force-run', postTaskgenForceRun);
adminRouter.post('/task-difficulty-calibration/run', postAdminRunTaskDifficultyCalibration);
adminRouter.get('/task-difficulty-calibration/audit', getAdminTaskDifficultyCalibrationAudit);
adminRouter.post('/mode-upgrade-aggregation/run', postAdminRunModeUpgradeAggregation);
adminRouter.post('/habit-achievement/retroactive/run', postAdminRunHabitAchievementRetroactive);
adminRouter.get('/habit-achievement/retroactive/diagnostics', getAdminHabitAchievementDiagnostics);
adminRouter.get('/monthly-pipeline/status', getAdminMonthlyPipelineStatus);
adminRouter.post('/monthly-pipeline/run', postAdminMonthlyPipelineRun);
adminRouter.post('/user/:userId/run-monthly-review', postAdminRunMonthlyReview);
adminRouter.post('/user/:userId/mode-upgrade-analysis/run', postAdminRunModeUpgradeAnalysis);
adminRouter.get('/user/:userId/mode-upgrade-cta-override', getAdminUserModeUpgradeCtaOverride);
adminRouter.put('/user/:userId/mode-upgrade-cta-override', putAdminUserModeUpgradeCtaOverride);
adminRouter.delete('/user/:userId/mode-upgrade-cta-override', deleteAdminUserModeUpgradeCtaOverride);
adminRouter.post('/user/:userId/game-mode', postAdminUserManualGameModeChange);
adminRouter.get('/feedback/definitions', getAdminFeedbackDefinitions);
adminRouter.patch('/feedback/definitions/:id', patchAdminFeedbackDefinition);
adminRouter.get('/feedback/users/:userId/state', getAdminFeedbackUserState);
adminRouter.patch('/feedback/users/:userId/state', patchAdminFeedbackUserState);
adminRouter.get('/feedback/users/:userId/history', getAdminFeedbackUserHistory);

router.use('/admin', authMiddleware, requireAdmin, adminRouter);

export default router;
