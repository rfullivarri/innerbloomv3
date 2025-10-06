import { z } from 'zod';
import { HttpError } from './http-error.js';

export const uuidSchema = z
  .string()
  .uuid({ message: 'id must be a valid UUID' });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const optionalDateSchema = z
  .union([z.string(), z.undefined()])
  .transform((value, ctx) => {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return undefined;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date format' });
      return z.NEVER;
    }

    return parsed;
  });

export const dateRangeQuerySchema = z.object({
  from: optionalDateSchema,
  to: optionalDateSchema,
});

function normalizeToUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function resolveDateRange(
  input: { from?: Date; to?: Date },
  defaultDays = 30,
): { from: Date; to: Date } {
  const to = normalizeToUtcDate(input.to ?? new Date());
  let from: Date;

  if (input.from) {
    from = normalizeToUtcDate(input.from);
  } else {
    from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (defaultDays - 1));
  }

  if (from > to) {
    throw new HttpError(400, 'invalid_date_range', 'from must be before or equal to to');
  }

  return { from, to };
}

export function formatAsDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
