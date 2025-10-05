import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { players } from '../db/schema.js';
import { asyncHandler } from '../lib/async-handler.js';
import { HttpError } from '../lib/http-error.js';

const router = Router();

async function ensurePlayer() {
  const [existing] = await db.select().from(players).limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(players)
    .values({ nickname: 'Chill Player' })
    .returning();

  if (!created) {
    throw new HttpError(500, 'Unable to create default player');
  }

  return created;
}

router.get(
  '/player',
  asyncHandler(async (_req, res) => {
    const player = await ensurePlayer();
    res.json({ player });
  }),
);

const updateXpSchema = z.object({
  amount: z
    .number({ required_error: 'amount is required' })
    .int('amount must be an integer')
    .min(1, 'amount must be at least 1')
    .max(1000, 'amount must be at most 1000'),
});

router.post(
  '/player/xp',
  asyncHandler(async (req, res) => {
    const { amount } = updateXpSchema.parse(req.body);
    const player = await ensurePlayer();

    const [updated] = await db
      .update(players)
      .set({
        totalXp: player.totalXp + amount,
        updatedAt: new Date(),
      })
      .where(eq(players.id, player.id))
      .returning();

    if (!updated) {
      throw new HttpError(500, 'Unable to update player XP');
    }

    res.json({ player: updated });
  }),
);

export default router;
