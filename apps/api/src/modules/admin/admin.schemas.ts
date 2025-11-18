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

const optionalNumericId = z.union([z.coerce.number().int().positive(), z.null()]).optional();

const userTaskUpdateKeys = [
  'title',
  'pillar_id',
  'trait_id',
  'stat_id',
  'difficulty_id',
  'is_active',
] as const;

export const updateTaskBodySchema = z
  .object({
    title: z
      .string({
        invalid_type_error: 'title must be a string',
      })
      .trim()
      .min(1, 'title is required')
      .optional(),
    pillar_id: optionalNumericId,
    trait_id: optionalNumericId,
    stat_id: optionalNumericId,
    difficulty_id: optionalNumericId,
    is_active: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const hasAny = userTaskUpdateKeys.some((key) => key in value);
    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one property must be provided',
        path: [],
      });
    }
  });

const upperTrimmed = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .transform((value) => value.toUpperCase());

export const taskgenJobsQuerySchema = z.object({
  status: upperTrimmed.optional(),
  mode: upperTrimmed.optional(),
  user: z.string().trim().min(1).max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1_000).default(50),
});

export const taskgenForceRunBodySchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user id' }),
  mode: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined)),
});

export const taskgenTraceQuerySchema = z.object({
  user_id: z.string().uuid({ message: 'Invalid user id' }),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const taskgenTraceByCorrelationParamsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid correlation id' }),
});

export const taskgenTraceGlobalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const reminderSendBodySchema = z.object({
  channel: z.literal('email').optional().default('email'),
});

const feedbackStatusSchema = z.enum(['active', 'paused', 'draft', 'deprecated']);

const feedbackCtaSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    href: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .nullable()
      .transform((value) => value ?? null),
  })
  .transform((value) => ({ label: value.label, href: value.href ?? null }));

export const feedbackDefinitionUpdateSchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    copy: z.string().trim().min(1).max(2000).optional(),
    trigger: z.string().trim().min(1).max(500).optional(),
    channel: z.string().trim().min(1).max(120).optional(),
    type: z.string().trim().min(1).max(100).optional(),
    frequency: z.string().trim().min(1).max(120).optional(),
    scope: z
      .array(z.string().trim().min(1).max(80))
      .min(1)
      .max(8)
      .optional(),
    status: feedbackStatusSchema.optional(),
    priority: z.coerce.number().int().min(0).max(100).optional(),
    cta: feedbackCtaSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (!Object.keys(value).length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one property must be provided',
        path: [],
      });
    }
  });

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type LogsQuery = z.infer<typeof logsQuerySchema>;
export type InsightQuery = z.infer<typeof insightQuerySchema>;
export type TasksQuery = z.infer<typeof tasksQuerySchema>;
export type TaskStatsQuery = z.infer<typeof taskStatsQuerySchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskBodySchema>;
export type TaskgenJobsQuery = z.infer<typeof taskgenJobsQuerySchema>;
export type TaskgenForceRunBody = z.infer<typeof taskgenForceRunBodySchema>;
export type TaskgenTraceQuery = z.infer<typeof taskgenTraceQuerySchema>;
export type TaskgenTraceGlobalQuery = z.infer<typeof taskgenTraceGlobalQuerySchema>;
export type ReminderSendBody = z.infer<typeof reminderSendBodySchema>;
export type FeedbackDefinitionUpdateInput = z.infer<typeof feedbackDefinitionUpdateSchema>;
