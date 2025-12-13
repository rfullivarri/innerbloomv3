import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';

const paramsSchema = z.object({ id: z.string().uuid() });

export const getUserWeeklyWrappedLatest: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [latest] = await getRecentWeeklyWrapped(id, 2);
  res.json({ item: latest ?? null });
};

export const getUserWeeklyWrappedPrevious: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const items = await getRecentWeeklyWrapped(id, 2);
  res.json({ item: items[1] ?? null });
};
