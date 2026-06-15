import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { pool } from '../../db.js';
import { ensureUserExists } from './shared.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';
import {
  countUnseenWeeklyWrapped,
  findPendingWeeklyWrappedId,
  listSeenWeeklyWrappedIds,
  markWeeklyWrappedSeen,
} from '../../services/weeklyWrappedViewsService.js';

const paramsSchema = z.object({ id: z.string().uuid() });
const seenParamsSchema = z.object({ id: z.string().uuid(), weeklyWrappedId: z.string().uuid() });

async function listCompletionDays(userId: string, start: string, end: string): Promise<string[]> {
  const result = await pool.query<{ day_key: string }>(
    `SELECT DISTINCT date::text AS day_key
       FROM daily_log
      WHERE user_id = $1::uuid
        AND date >= $2::date
        AND date <= $3::date
        AND COALESCE(quantity, 0) > 0
   ORDER BY day_key ASC`,
    [userId, start, end],
  );

  return result.rows.map((row) => row.day_key).filter(Boolean);
}

export const getUserWeeklyWrappedLatest: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [items, unseenCount] = await Promise.all([getRecentWeeklyWrapped(id, 2), countUnseenWeeklyWrapped(id)]);
  const latest = items[0] ?? null;
  const seenIds = await listSeenWeeklyWrappedIds(id, latest ? [latest.id] : []);
  res.json({
    item: latest ? { ...latest, seen: seenIds.has(latest.id) } : null,
    unseen_count: unseenCount,
  });
};

export const getUserWeeklyWrappedPrevious: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);
  const [items, unseenCount] = await Promise.all([getRecentWeeklyWrapped(id, 2), countUnseenWeeklyWrapped(id)]);
  const previous = items[1] ?? null;
  const seenIds = await listSeenWeeklyWrappedIds(id, previous ? [previous.id] : []);
  res.json({
    item: previous ? { ...previous, seen: seenIds.has(previous.id) } : null,
    unseen_count: unseenCount,
  });
};

export const getUserWeeklyWrappedPending: AsyncHandler = async (req, res) => {
  const { id } = paramsSchema.parse(req.params);
  await ensureUserExists(id);

  const [items, pendingId, unseenCount] = await Promise.all([
    getRecentWeeklyWrapped(id, 52),
    findPendingWeeklyWrappedId(id),
    countUnseenWeeklyWrapped(id),
  ]);

  const pending = pendingId ? items.find((entry) => entry.id === pendingId) ?? null : null;
  const completionDays = pending
    ? await listCompletionDays(id, pending.weekStart, pending.weekEnd)
    : [];

  res.json({ item: pending ? { ...pending, seen: false, completionDays } : null, unseen_count: unseenCount });
};

export const markUserWeeklyWrappedSeen: AsyncHandler = async (req, res) => {
  const { id, weeklyWrappedId } = seenParamsSchema.parse(req.params);
  await ensureUserExists(id);

  const seenAt = await markWeeklyWrappedSeen(id, weeklyWrappedId);
  const unseenCount = await countUnseenWeeklyWrapped(id);
  res.json({ ok: true, seen_at: seenAt, unseen_count: unseenCount });
};
