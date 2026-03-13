import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import {
  listUsersQuerySchema,
  logsQuerySchema,
  insightQuerySchema,
  tasksQuerySchema,
  taskStatsQuerySchema,
  updateTaskBodySchema,
  taskgenJobsQuerySchema,
  taskgenTraceQuerySchema,
  taskgenTraceByCorrelationParamsSchema,
  taskgenTraceGlobalQuerySchema,
  reminderSendBodySchema,
  feedbackDefinitionUpdateSchema,
  feedbackUserNotificationUpdateSchema,
  subscriptionNotificationsTriggerBodySchema,
  adminSubscriptionUpdateBodySchema,
  taskDifficultyCalibrationRunBodySchema,
  modeUpgradeAggregationRunBodySchema,
  adminManualGameModeChangeBodySchema,
  adminModeUpgradeCtaOverrideUpsertBodySchema,
} from './admin.schemas.js';
import {
  exportUserLogsCsv,
  getUserInsights,
  getUserLogs,
  getUserTaskStats,
  getUserTasks,
  listUsers,
  updateUserTask,
  listTaskgenJobs,
  getTaskgenJobLogs,
  getTaskgenUserOverview,
  retryTaskgenJob,
  sendTasksReadyPreview,
  sendDailyReminderPreview,
  listFeedbackDefinitions,
  updateFeedbackDefinition,
  getFeedbackUserState,
  getFeedbackUserHistory,
  updateFeedbackUserNotificationState,
  triggerSubscriptionNotificationsJob,
  getUserSubscriptionForAdmin,
  getUserModeUpgradeAnalysis,
  updateUserSubscriptionFromAdmin,
  adminChangeUserGameMode,
  clearUserModeUpgradeCtaOverride,
  getUserModeUpgradeCtaOverride,
  setUserModeUpgradeCtaOverride,
} from './admin.service.js';
import {
  getTaskgenEventsByCorrelation,
  getTaskgenEventsByUser,
  getTaskgenEventsGlobal,
} from '../../services/taskgenTraceService.js';
import { triggerTaskGenerationForUser } from '../../services/taskgenTriggerService.js';
import {
  runAdminTaskDifficultyCalibration,
  runMonthlyTaskDifficultyCalibrationForUser,
} from '../../services/taskDifficultyCalibrationService.js';
import { runUserMonthlyModeUpgradeAggregation } from '../../services/modeUpgradeMonthlyAggregationService.js';

const taskgenForceRunRequestSchema = z
  .object({
    user_id: z.string().uuid({ message: 'Invalid user id' }).optional(),
    userId: z.string().uuid({ message: 'Invalid user id' }).optional(),
    mode: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .transform((value) => (value ? value.toLowerCase() : undefined)),
  })
  .refine((value) => value.user_id ?? value.userId, {
    message: 'user_id is required',
    path: ['user_id'],
  })
  .transform((value) => ({
    user_id: value.user_id ?? value.userId!,
    mode: value.mode,
  }));

const userIdParamSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user id' }),
});

const taskIdParamSchema = userIdParamSchema.extend({
  taskId: z.string().min(1),
});

const jobIdParamSchema = z.object({
  jobId: z.string().uuid({ message: 'Invalid job id' }),
});

const reminderSendBody = reminderSendBodySchema.default({ channel: 'email' });
const feedbackDefinitionParamsSchema = z.object({ id: z.string().min(1) });

export const getAdminUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const result = await listUsers(query);
  res.json(result);
});

export const getAdminUserInsights = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = insightQuerySchema.parse(req.query);
  const result = await getUserInsights(userId, query);
  res.json(result);
});

export const getAdminUserLogs = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = logsQuerySchema.parse(req.query);
  const result = await getUserLogs(userId, query);
  res.json(result);
});

export const getAdminUserTasks = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = tasksQuerySchema.parse(req.query);
  const result = await getUserTasks(userId, query);
  res.json(result);
});

export const getAdminUserTaskStats = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = taskStatsQuerySchema.parse(req.query);
  const result = await getUserTaskStats(userId, query);
  res.json(result);
});

export const patchAdminUserTask = asyncHandler(async (req: Request, res: Response) => {
  const { userId, taskId } = taskIdParamSchema.parse(req.params);
  const body = updateTaskBodySchema.parse(req.body);
  const result = await updateUserTask(userId, taskId, body);
  res.json(result);
});

export const exportAdminUserLogsCsv = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const query = logsQuerySchema.parse(req.query);
  const csv = await exportUserLogsCsv(userId, query);

  if (!csv) {
    throw new HttpError(404, 'not_found', 'No logs available for export');
  }

  res.type('text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="user-logs.csv"');
  res.send(csv);
});

export const postAdminSendReminder = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const body = reminderSendBody.parse(req.body ?? {});
  const result = await sendDailyReminderPreview(userId, body.channel ?? 'email');
  res.json(result);
});

export const postAdminSendTasksReady = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await sendTasksReadyPreview(userId);
  res.json(result);
});



export const getAdminUserSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await getUserSubscriptionForAdmin(userId);
  res.json(result);
});

export const putAdminUserSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const body = adminSubscriptionUpdateBodySchema.parse(req.body ?? {});
  const result = await updateUserSubscriptionFromAdmin(userId, {
    planCode: body.planCode,
    status: body.status,
  });
  res.json(result);
});

export const postAdminRunSubscriptionNotifications = asyncHandler(async (req: Request, res: Response) => {
  const body = subscriptionNotificationsTriggerBodySchema.parse(req.body ?? {});
  const runAt = body.runAt ? new Date(body.runAt) : new Date();
  const result = await triggerSubscriptionNotificationsJob(runAt);
  res.json(result);
});

export const getAdminMe = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export const getTaskgenJobs = asyncHandler(async (req: Request, res: Response) => {
  const query = taskgenJobsQuerySchema.parse(req.query);
  const result = await listTaskgenJobs(query);
  res.json(result);
});

export const getTaskgenJobLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = jobIdParamSchema.parse(req.params);
  const logs = await getTaskgenJobLogs(jobId);
  res.json(logs);
});

export const getTaskgenUserOverviewHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const overview = await getTaskgenUserOverview(userId);
  res.json(overview);
});

export const retryTaskgenJobHandler = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = jobIdParamSchema.parse(req.params);
  const result = await retryTaskgenJob(jobId);
  res.json(result);
});

export const getTaskgenTraceForUser = asyncHandler(async (req: Request, res: Response) => {
  const query = taskgenTraceQuerySchema.parse(req.query);
  const events = getTaskgenEventsByUser(query.user_id).slice(0, query.limit);
  res.json({ events });
});

export const getTaskgenTraceByCorrelation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = taskgenTraceByCorrelationParamsSchema.parse(req.params);
  const events = getTaskgenEventsByCorrelation(id);
  res.json({ events });
});

export const getTaskgenTraceGlobal = asyncHandler(async (req: Request, res: Response) => {
  const query = taskgenTraceGlobalQuerySchema.parse(req.query);
  const events = getTaskgenEventsGlobal(query.limit);
  res.json({ events });
});

export const postTaskgenForceRun = asyncHandler(async (req: Request, res: Response) => {
  const parsed = taskgenForceRunRequestSchema.parse(req.body);

  const correlationId = triggerTaskGenerationForUser({
    userId: parsed.user_id,
    mode: parsed.mode,
    origin: 'admin:force-run',
    metadata: { requestedMode: parsed.mode ?? null },
  });

  res.json({ ok: true, correlation_id: correlationId });
});

export const getAdminFeedbackDefinitions = asyncHandler(async (_req: Request, res: Response) => {
  const items = await listFeedbackDefinitions();
  res.json({ items, total: items.length, syncedAt: new Date().toISOString() });
});

export const patchAdminFeedbackDefinition = asyncHandler(async (req: Request, res: Response) => {
  const { id } = feedbackDefinitionParamsSchema.parse(req.params);
  const body = feedbackDefinitionUpdateSchema.parse(req.body);
  const item = await updateFeedbackDefinition(id, body);
  res.json({ item });
});

export const getAdminFeedbackUserState = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await getFeedbackUserState(userId);
  res.json(result);
});

export const getAdminFeedbackUserHistory = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await getFeedbackUserHistory(userId);
  res.json(result);
});

export const patchAdminFeedbackUserState = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const body = feedbackUserNotificationUpdateSchema.parse(req.body);
  const result = await updateFeedbackUserNotificationState(userId, body);
  res.json(result);
});



export const postAdminRunModeUpgradeAggregation = asyncHandler(async (req: Request, res: Response) => {
  const body = modeUpgradeAggregationRunBodySchema.parse(req.body ?? {});
  const result = await runUserMonthlyModeUpgradeAggregation({
    userId: body.userId,
    periodKey: body.period_key,
  });

  res.json({
    ok: true,
    source: 'monthly_mode_upgrade_aggregation',
    userId: body.userId ?? null,
    period_key: result.periodKey,
    period_start: result.periodStart,
    next_period_start: result.nextPeriodStart,
    scope: result.scope,
    processed: result.processed,
    persisted: result.persisted,
  });
});

export const getAdminUserModeUpgradeAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await getUserModeUpgradeAnalysis(userId);
  res.json(result);
});


export const getAdminUserModeUpgradeCtaOverride = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const item = await getUserModeUpgradeCtaOverride(userId);
  res.json({ item });
});

export const putAdminUserModeUpgradeCtaOverride = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const body = adminModeUpgradeCtaOverrideUpsertBodySchema.parse(req.body ?? {});
  const item = await setUserModeUpgradeCtaOverride({
    userId,
    enabled: body.enabled,
    forcedCurrentMode: body.forcedCurrentMode,
    forcedNextMode: body.forcedNextMode,
    expiresAt: body.expiresAt ?? null,
  });
  res.json({ ok: true, item });
});

export const deleteAdminUserModeUpgradeCtaOverride = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await clearUserModeUpgradeCtaOverride(userId);
  res.json(result);
});

export const postAdminUserManualGameModeChange = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const body = adminManualGameModeChangeBodySchema.parse(req.body ?? {});
  const result = await adminChangeUserGameMode({
    userId,
    targetModeId: body.targetModeId,
    targetModeKey: body.targetModeKey,
    reason: body.reason,
  });

  res.json(result);
});

export const postAdminRunModeUpgradeAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);
  const result = await getUserModeUpgradeAnalysis(userId);
  res.json({ ok: true, source: 'admin_manual_rolling_mode_upgrade_analysis', ...result });
});

export const postAdminRunMonthlyReview = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = userIdParamSchema.parse(req.params);

  const now = new Date();
  await runMonthlyTaskDifficultyCalibrationForUser({ userId, now });
  const result = await runUserMonthlyModeUpgradeAggregation({ userId, now });

  res.json({
    ok: true,
    source: 'admin_manual_monthly_review',
    userId,
    period_key: result.periodKey,
    period_start: result.periodStart,
    next_period_start: result.nextPeriodStart,
    scope: result.scope,
    processed: result.processed,
    persisted: result.persisted,
  });
});

export const postAdminRunTaskDifficultyCalibration = asyncHandler(async (req: Request, res: Response) => {
  const body = taskDifficultyCalibrationRunBodySchema.parse(req.body ?? {});
  const result = await runAdminTaskDifficultyCalibration({
    userId: body.userId,
    windowDays: body.window_days,
    mode: body.mode,
  });

  res.json({
    ok: true,
    source: 'admin_run',
    scope: body.userId ? 'single_user' : 'all_users',
    userId: body.userId ?? null,
    window_days: body.window_days,
    mode: body.mode,
    ...result,
  });
});
