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
  taskgenForceRunBodySchema,
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
  forceRunTaskgenForUser,
} from './admin.service.js';
import {
  getTaskgenEventsByCorrelation,
  getTaskgenEventsByUser,
  getTaskgenEventsGlobal,
} from '../../services/taskgenTraceService.js';
import { triggerTaskGenerationForUser } from '../../services/taskgenTriggerService.js';

const userIdParamSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user id' }),
});

const taskIdParamSchema = userIdParamSchema.extend({
  taskId: z.string().min(1),
});

const jobIdParamSchema = z.object({
  jobId: z.string().uuid({ message: 'Invalid job id' }),
});

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

export const forceRunTaskgenHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = taskgenForceRunBodySchema.parse(req.body);
  const result = await forceRunTaskgenForUser(body);
  res.json(result);
});
