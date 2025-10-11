import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../lib/http-error.js';
import {
  listUsersQuerySchema,
  logsQuerySchema,
  insightQuerySchema,
  tasksQuerySchema,
  updateTaskBodySchema,
} from './admin.schemas.js';
import {
  exportUserLogsCsv,
  getUserInsights,
  getUserLogs,
  getUserTasks,
  listUsers,
  updateUserTask,
} from './admin.service.js';

const userIdParamSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user id' }),
});

const taskIdParamSchema = userIdParamSchema.extend({
  taskId: z.string().min(1),
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
