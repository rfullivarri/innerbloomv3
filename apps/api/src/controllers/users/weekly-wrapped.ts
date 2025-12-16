import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { formatDateInTimezone } from './user-state-service.js';
import {
  getRecentWeeklyWrapped,
  maybeGenerateWeeklyWrappedForDate,
} from '../../services/weeklyWrappedService.js';

async function ensureCurrentWeeklyWrapped(id: string): Promise<void> {
  const todayKey = formatDateInTimezone(new Date(), 'UTC');
  await maybeGenerateWeeklyWrappedForDate(id, todayKey);
}

const paramsSchema = z.object({ id: z.string().uuid() });

export const getUserWeeklyWrappedLatest: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  await ensureCurrentWeeklyWrapped(id);
  const [latest] = await getRecentWeeklyWrapped(id, 2);
  res.json({ item: latest ?? null });
};

export const getUserWeeklyWrappedPrevious: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  await ensureCurrentWeeklyWrapped(id);
  const items = await getRecentWeeklyWrapped(id, 2);
  res.json({ item: items[1] ?? null });
};
