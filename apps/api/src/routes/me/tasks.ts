import express from 'express';
import type { Request, Response } from 'express';
import { query } from '../../db/pool.js';
import { HttpError } from '../../lib/http-error.js';

const router = express.Router();

const VALID_PILLARS = new Set(['BODY', 'MIND', 'SOUL']);
const VALID_DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD', 'EXTREME']);
const VALID_SOURCES = new Set(['CUSTOM', 'SYSTEM', 'AI']);

function requireUserId(req: Request): string {
  const userId = req.ctx?.userId;

  if (!userId) {
    throw new HttpError(500, 'Missing user context');
  }

  return userId;
}

async function resolvePillarId(code: string): Promise<string> {
  if (!VALID_PILLARS.has(code)) {
    throw new HttpError(400, 'Invalid pillar');
  }

  const result = await query<{ id: string }>(
    'SELECT id FROM public.pillars WHERE code = $1',
    [code],
  );

  if (!result.rowCount) {
    throw new HttpError(400, 'Pillar not found');
  }

  return result.rows[0].id;
}

async function resolveTraitId(code: string, pillarCode: string): Promise<string> {
  const result = await query<{ id: string }>(
    `
      SELECT t.id
      FROM public.traits t
      INNER JOIN public.pillars p ON p.id = t.pillar_id
      WHERE t.code = $1 AND p.code = $2
    `,
    [code, pillarCode],
  );

  if (!result.rowCount) {
    throw new HttpError(400, 'Trait not found for the specified pillar');
  }

  return result.rows[0].id;
}

async function resolveStatId(code: string, traitId: string | null): Promise<string> {
  const result = await query<{ id: string; trait_id: string | null }>(
    'SELECT id, trait_id FROM public.stats WHERE code = $1',
    [code],
  );

  if (!result.rowCount) {
    throw new HttpError(400, 'Stat not found');
  }

  const stat = result.rows[0];

  if (traitId && stat.trait_id && stat.trait_id !== traitId) {
    throw new HttpError(400, 'Stat does not belong to the provided trait');
  }

  return stat.id;
}

router.get('/tasks', async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const result = await query<{
      id: string;
      name: string;
      difficulty: string;
      base_xp: number;
      active: boolean;
      is_daily: boolean;
      sort_order: number | null;
    }>(
      `
        SELECT id, name, difficulty, base_xp, active, is_daily, sort_order
        FROM public.user_tasks
        WHERE user_id = $1 AND archived_at IS NULL
        ORDER BY active DESC, sort_order NULLS LAST, created_at DESC;
      `,
      [userId],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/tasks/expanded', async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const result = await query(
      `
        SELECT *
        FROM public.v_user_tasks_expanded
        WHERE user_id = $1
        ORDER BY active DESC, created_at DESC;
      `,
      [userId],
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const body = req.body as Record<string, unknown>;

    const templateId = typeof body.templateId === 'string' ? body.templateId : undefined;

    if (templateId && body.name) {
      throw new HttpError(400, 'Provide either templateId or custom task fields, not both.');
    }

    if (templateId) {
      const templateResult = await query<{
        name: string;
        pillar_id: string | null;
        trait_id: string | null;
        stat_id: string | null;
        default_difficulty: string;
        base_xp: number;
        source: string | null;
      }>(
        `
          SELECT name, pillar_id, trait_id, stat_id, default_difficulty, base_xp, source
          FROM public.task_templates
          WHERE id = $1 AND archived_at IS NULL;
        `,
        [templateId],
      );

      if (!templateResult.rowCount) {
        throw new HttpError(404, 'Task template not found');
      }

      const template = templateResult.rows[0];
      const source = template.source && VALID_SOURCES.has(template.source)
        ? template.source
        : 'SYSTEM';

      const insertResult = await query<{ id: string }>(
        `
          INSERT INTO public.user_tasks
            (user_id, template_id, pillar_id, trait_id, stat_id, name, difficulty, base_xp, source)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id;
        `,
        [
          userId,
          templateId,
          template.pillar_id,
          template.trait_id,
          template.stat_id,
          template.name,
          template.default_difficulty,
          template.base_xp,
          source === 'AI' ? 'AI' : 'SYSTEM',
        ],
      );

      res.status(201).json({ data: { id: insertResult.rows[0].id } });
      return;
    }

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : null;

    if (!name) {
      throw new HttpError(400, 'Task name is required');
    }

    const pillar = typeof body.pillar === 'string' ? body.pillar.toUpperCase() : null;

    if (!pillar) {
      throw new HttpError(400, 'Pillar is required');
    }

    const pillarId = await resolvePillarId(pillar);

    const traitCode = typeof body.trait === 'string' ? body.trait.toUpperCase() : null;
    const traitId = traitCode ? await resolveTraitId(traitCode, pillar) : null;

    const statCode = typeof body.stat === 'string' ? body.stat.toUpperCase() : null;
    const statId = statCode ? await resolveStatId(statCode, traitId) : null;

    const difficulty = typeof body.difficulty === 'string'
      ? body.difficulty.toUpperCase()
      : 'EASY';

    if (!VALID_DIFFICULTIES.has(difficulty)) {
      throw new HttpError(400, 'Invalid difficulty');
    }

    const baseXpValue =
      typeof body.baseXp === 'number' && Number.isFinite(body.baseXp)
        ? Math.max(0, Math.trunc(body.baseXp))
        : 10;

    const isDaily =
      typeof body.isDaily === 'boolean'
        ? body.isDaily
        : true;

    const sourceInput = typeof body.source === 'string' ? body.source.toUpperCase() : 'CUSTOM';

    if (!VALID_SOURCES.has(sourceInput)) {
      throw new HttpError(400, 'Invalid source');
    }

    const insertResult = await query<{ id: string }>(
      `
        INSERT INTO public.user_tasks
          (user_id, pillar_id, trait_id, stat_id, name, difficulty, base_xp, is_daily, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `,
      [
        userId,
        pillarId,
        traitId,
        statId,
        name,
        difficulty,
        baseXpValue,
        isDaily,
        sourceInput,
      ],
    );

    res.status(201).json({ data: { id: insertResult.rows[0].id } });
  } catch (error) {
    next(error);
  }
});

router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const { id } = req.params;
    const body = req.body as Record<string, unknown>;

    const updates: string[] = [];
    const params: unknown[] = [];

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        throw new HttpError(400, 'Task name cannot be empty');
      }
      params.push(name);
      updates.push(`name = $${params.length}`);
    }

    if (typeof body.difficulty === 'string') {
      const difficulty = body.difficulty.toUpperCase();
      if (!VALID_DIFFICULTIES.has(difficulty)) {
        throw new HttpError(400, 'Invalid difficulty');
      }
      params.push(difficulty);
      updates.push(`difficulty = $${params.length}`);
    }

    if (body.baseXp !== undefined) {
      if (body.baseXp === null) {
        throw new HttpError(400, 'baseXp cannot be null');
      }
      const baseXp = Number(body.baseXp);
      if (!Number.isFinite(baseXp)) {
        throw new HttpError(400, 'baseXp must be a number');
      }
      params.push(Math.max(0, Math.trunc(baseXp)));
      updates.push(`base_xp = $${params.length}`);
    }

    if (typeof body.isDaily === 'boolean') {
      params.push(body.isDaily);
      updates.push(`is_daily = $${params.length}`);
    }

    if (body.sortOrder !== undefined) {
      if (body.sortOrder === null) {
        params.push(null);
      } else {
        const sortOrder = Number(body.sortOrder);
        if (!Number.isFinite(sortOrder)) {
          throw new HttpError(400, 'sortOrder must be a number');
        }
        params.push(Math.trunc(sortOrder));
      }
      updates.push(`sort_order = $${params.length}`);
    }

    if (body.notes !== undefined) {
      if (body.notes === null) {
        params.push(null);
      } else if (typeof body.notes === 'string') {
        params.push(body.notes);
      } else {
        throw new HttpError(400, 'notes must be a string or null');
      }
      updates.push(`notes = $${params.length}`);
    }

    if (typeof body.active === 'boolean') {
      params.push(body.active);
      updates.push(`active = $${params.length}`);
    }

    if (typeof body.pillar === 'string') {
      const pillarCode = body.pillar.toUpperCase();
      const pillarId = await resolvePillarId(pillarCode);
      params.push(pillarId);
      updates.push(`pillar_id = $${params.length}`);
    }

    let traitId: string | null | undefined;

    if (body.trait !== undefined) {
      if (body.trait === null) {
        traitId = null;
      } else if (typeof body.trait === 'string') {
        const pillarCode = typeof body.pillar === 'string'
          ? body.pillar.toUpperCase()
          : undefined;

        if (!pillarCode) {
          const current = await query<{ pillar_code: string }>(
            `
              SELECT p.code AS pillar_code
              FROM public.user_tasks ut
              INNER JOIN public.pillars p ON p.id = ut.pillar_id
              WHERE ut.id = $1 AND ut.user_id = $2
            `,
            [id, userId],
          );

          if (!current.rowCount) {
            throw new HttpError(404, 'Task not found');
          }

          traitId = await resolveTraitId(body.trait.toUpperCase(), current.rows[0].pillar_code);
        } else {
          traitId = await resolveTraitId(body.trait.toUpperCase(), pillarCode);
        }
      } else {
        throw new HttpError(400, 'trait must be a string or null');
      }
    }

    if (traitId !== undefined) {
      params.push(traitId);
      updates.push(`trait_id = $${params.length}`);
    }

    if (body.stat !== undefined) {
      if (body.stat === null) {
        params.push(null);
        updates.push(`stat_id = $${params.length}`);
      } else if (typeof body.stat === 'string') {
        const effectiveTraitId =
          traitId !== undefined
            ? traitId
            : (await query<{ trait_id: string | null }>(
                'SELECT trait_id FROM public.user_tasks WHERE id = $1 AND user_id = $2',
                [id, userId],
              )).rows[0]?.trait_id ?? null;

        const statId = await resolveStatId(body.stat.toUpperCase(), effectiveTraitId);
        params.push(statId);
        updates.push(`stat_id = $${params.length}`);
      } else {
        throw new HttpError(400, 'stat must be a string or null');
      }
    }

    if (!updates.length) {
      throw new HttpError(400, 'No fields provided for update');
    }

    params.push(new Date());
    updates.push(`updated_at = $${params.length}`);

    params.push(id);
    const taskIdIndex = params.length;
    params.push(userId);
    const userIdIndex = params.length;

    const updateQuery = `
      UPDATE public.user_tasks
      SET ${updates.join(', ')}
      WHERE id = $${taskIdIndex} AND user_id = $${userIdIndex}
      RETURNING id;
    `;

    const result = await query<{ id: string }>(updateQuery, params);

    if (!result.rowCount) {
      throw new HttpError(404, 'Task not found');
    }

    res.json({ data: { id: result.rows[0].id } });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks/:id/archive', async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const { id } = req.params;

    const result = await query<{ id: string }>(
      `
        UPDATE public.user_tasks
        SET archived_at = NOW(), active = FALSE, updated_at = NOW()
        WHERE id = $1 AND user_id = $2
        RETURNING id;
      `,
      [id, userId],
    );

    if (!result.rowCount) {
      throw new HttpError(404, 'Task not found');
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
