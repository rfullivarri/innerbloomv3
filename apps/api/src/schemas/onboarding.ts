import { z } from 'zod';

const stringArraySchema = z.array(z.string());

const lowSchema = z.object({
  body: stringArraySchema,
  soul: stringArraySchema,
  mind: stringArraySchema,
  note: z.string(),
});

const chillSchema = z.object({
  oneThing: z.string(),
  motiv: stringArraySchema,
});

const flowSchema = z.object({
  goal: z.string(),
  imped: stringArraySchema,
});

const evolveSchema = z.object({
  goal: z.string(),
  trade: stringArraySchema,
  att: z.string(),
});

const foundationsSchema = z.object({
  body: stringArraySchema,
  soul: stringArraySchema,
  mind: stringArraySchema,
  bodyOpen: z.string(),
  soulOpen: z.string(),
  mindOpen: z.string(),
});

const quickStartManualTaskCandidateSchema = z.object({
  task: z.string().min(1),
  pillar_code: z.string().min(1),
  trait_code: z.string().min(1),
  input_value: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const quickStartDataSchema = z.object({
  selected_moderations: z.array(z.enum(['alcohol', 'tobacco', 'sugar'])).default([]),
  manual_task_candidates: z.array(quickStartManualTaskCandidateSchema).default([]),
  selected_tasks_by_pillar: z
    .object({
      body: z.array(z.string()).default([]),
      mind: z.array(z.string()).default([]),
      soul: z.array(z.string()).default([]),
    })
    .optional(),
});

const modes = ['LOW', 'CHILL', 'FLOW', 'EVOLVE'] as const;

export const onboardingIntroSchema = z.object({
  ts: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'ts must be a valid ISO-8601 string' }),
  client_id: z.string().uuid({ message: 'client_id must be a valid UUID' }),
  email: z
    .string()
    .email({ message: 'email must be a valid email' })
    .refine((value) => value === value.toLowerCase(), { message: 'email must be lowercase' }),
  mode: z.enum(modes),
  data: z.object({
    low: lowSchema,
    chill: chillSchema,
    flow: flowSchema,
    evolve: evolveSchema,
    foundations: foundationsSchema,
    quick_start: quickStartDataSchema.optional(),
  }),
  xp: z.object({
    total: z.coerce.number().min(0),
    Body: z.coerce.number().min(0),
    Mind: z.coerce.number().min(0),
    Soul: z.coerce.number().min(0),
  }),
  meta: z
    .object({
      tz: z.string(),
      lang: z.string(),
      device: z.string(),
      version: z.string(),
      user_id: z.string().min(1),
      onboarding_path: z.enum(['traditional', 'quick_start']).optional(),
    })
    .catchall(z.unknown()),
});

export type OnboardingIntroPayload = z.infer<typeof onboardingIntroSchema>;
