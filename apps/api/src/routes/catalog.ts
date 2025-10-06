import express from 'express';
import { query } from '../db/pool.js';
import { HttpError } from '../lib/http-error.js';

const router = express.Router();

const VALID_PILLARS = new Set(['BODY', 'MIND', 'SOUL']);

router.get('/pillars', async (_req, res, next) => {
  try {
    const result = await query<{ code: string; name: string; description: string | null }>(
      `
        SELECT code, name, description
        FROM public.pillars
        ORDER BY code;
      `,
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/traits', async (req, res, next) => {
  const pillar = typeof req.query.pillar === 'string' ? req.query.pillar.toUpperCase() : undefined;

  if (!pillar || !VALID_PILLARS.has(pillar)) {
    next(new HttpError(400, 'Invalid pillar. Expected BODY, MIND, or SOUL.'));
    return;
  }

  try {
    const result = await query<{ code: string; name: string; position: number }>(
      `
        SELECT t.code, t.name, t.position
        FROM public.traits t
        INNER JOIN public.pillars p ON p.id = t.pillar_id
        WHERE p.code = $1
        ORDER BY t.position;
      `,
      [pillar],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/templates', async (req, res, next) => {
  const pillar = typeof req.query.pillar === 'string' ? req.query.pillar.toUpperCase() : undefined;
  const trait = typeof req.query.trait === 'string' ? req.query.trait.toUpperCase() : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;

  if (pillar && !VALID_PILLARS.has(pillar)) {
    next(new HttpError(400, 'Invalid pillar. Expected BODY, MIND, or SOUL.'));
    return;
  }

  try {
    const conditions: string[] = ['tt.archived_at IS NULL'];
    const params: unknown[] = [];

    if (pillar) {
      params.push(pillar);
      conditions.push(`p.code = $${params.length}`);
    }

    if (trait) {
      params.push(trait);
      conditions.push(`tr.code = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`tt.name ILIKE $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<{
      id: string;
      name: string;
      default_difficulty: string;
      base_xp: number;
    }>(
      `
        SELECT tt.id, tt.name, tt.default_difficulty, tt.base_xp
        FROM public.task_templates tt
        LEFT JOIN public.pillars p ON p.id = tt.pillar_id
        LEFT JOIN public.traits tr ON tr.id = tt.trait_id
        ${whereClause}
        ORDER BY tt.name;
      `,
      params,
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
