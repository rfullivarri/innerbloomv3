import { z } from 'zod';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { ensureUserExists } from './shared.js';
import { formatDateInTimezone } from './user-state-service.js';
import { getRecentWeeklyWrapped } from '../../services/weeklyWrappedService.js';
import {
  countUnseenWeeklyWrapped,
  findPendingWeeklyWrappedId,
  listSeenWeeklyWrappedIds,
  markWeeklyWrappedSeen,
} from '../../services/weeklyWrappedViewsService.js';

const paramsSchema = z.object({ id: z.string().uuid() });
const seenParamsSchema = z.object({ id: z.string().uuid(), weeklyWrappedId: z.string().uuid() });

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
  const [items, unseenCount] = await Promise.all([getRecentWeeklyWrapped(id, 2), countUnseenWeeklyWrapped(id)]);
  const { start, end } = resolveCurrentWeekRange(new Date());
  const current = items.find((entry) => entry.weekEnd >= start && entry.weekEnd <= end);
  const latest = current ?? items[0] ?? null;
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
  const { start, end } = resolveCurrentWeekRange(new Date());
  const current = items.find((entry) => entry.weekEnd >= start && entry.weekEnd <= end);
  const previous = current
    ? items.find((entry) => entry.id !== current.id) ?? null
    : items[1] ?? items[0] ?? null;
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

  res.json({ item: pending ? { ...pending, seen: false } : null, unseen_count: unseenCount });
};

export const markUserWeeklyWrappedSeen: AsyncHandler = async (req, res) => {
  const { id, weeklyWrappedId } = seenParamsSchema.parse(req.params);
  await ensureUserExists(id);

  const seenAt = await markWeeklyWrappedSeen(id, weeklyWrappedId);
  const unseenCount = await countUnseenWeeklyWrapped(id);
  res.json({ ok: true, seen_at: seenAt, unseen_count: unseenCount });
};
