import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { formatDateInTimezone } from './user-state-service.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

function resolveCurrentWeekRange(now: Date): { start: string; end: string } {
  const currentDate = new Date(now);
  currentDate.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = currentDate.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const start = new Date(currentDate);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    start: formatDateInTimezone(start, 'UTC'),
    end: formatDateInTimezone(end, 'UTC'),
  };
}

export const getUserWeeklyWrappedLatest: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const items = await getRecentWeeklyWrapped(id, 2);
  const { start, end } = resolveCurrentWeekRange(new Date());
  const current = items.find((entry) => entry.weekEnd >= start && entry.weekEnd <= end);
  res.json({ item: current ?? null });
};

export const getUserWeeklyWrappedPrevious: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const items = await getRecentWeeklyWrapped(id, 2);
  const { start, end } = resolveCurrentWeekRange(new Date());
  const current = items.find((entry) => entry.weekEnd >= start && entry.weekEnd <= end);
  const previous = current ? items.find((entry) => entry.id !== current.id) ?? null : null;
  res.json({ item: previous ?? null });
};
