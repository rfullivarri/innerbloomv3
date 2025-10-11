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
    })
    .catchall(z.unknown()),
});

export type OnboardingIntroPayload = z.infer<typeof onboardingIntroSchema>;
