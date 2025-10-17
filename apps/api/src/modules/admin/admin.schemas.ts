import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const listUsersQuerySchema = paginationSchema.extend({
  query: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
});

export const insightQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const logFiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  pillar: z.string().trim().min(1).max(100).optional(),
  trait: z.string().trim().min(1).max(100).optional(),
  difficulty: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  sort: z
    .string()
    .regex(/^[a-zA-Z0-9_]+:(asc|desc)$/)
    .optional(),
});

export const logsQuerySchema = paginationSchema.merge(logFiltersSchema);

export const tasksQuerySchema = z.object({
  pillar: z.string().trim().min(1).max(100).optional(),
  trait: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().min(1).max(200).optional(),
});

export const taskStatsQuerySchema = logFiltersSchema.omit({ sort: true }).extend({});

export const updateTaskBodySchema = z
  .object({
    weeklyTarget: z.number().int().min(0).max(10_000).optional(),
    archived: z.boolean().optional(),
    notes: z.string().trim().max(5_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one property must be provided',
  });

export const taskgenTraceUserQuerySchema = z.object({
  user_id: z.string().uuid({ message: 'Invalid user id' }),
});

export const taskgenTraceCorrelationParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid correlation id' }),
});

export const taskgenTraceGlobalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const taskgenForceRunBodySchema = z.object({
  user_id: z.string().uuid({ message: 'Invalid user id' }),
  mode: z
    .string()
    .trim()
    .regex(/^(low|chill|flow|evolve)$/i, { message: 'Invalid mode' })
    .optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type LogsQuery = z.infer<typeof logsQuerySchema>;
export type InsightQuery = z.infer<typeof insightQuerySchema>;
export type TasksQuery = z.infer<typeof tasksQuerySchema>;
export type TaskStatsQuery = z.infer<typeof taskStatsQuerySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type TaskgenTraceUserQuery = z.infer<typeof taskgenTraceUserQuerySchema>;
export type TaskgenTraceGlobalQuery = z.infer<typeof taskgenTraceGlobalQuerySchema>;
export type TaskgenForceRunBody = z.infer<typeof taskgenForceRunBodySchema>;
