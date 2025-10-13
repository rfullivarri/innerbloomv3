import { z } from 'zod';
import { pool } from '../../db.js';
import type { AsyncHandler } from '../../lib/async-handler.js';
import { uuidSchema } from '../../lib/validation.js';

const PILLAR_CODES = ['BODY', 'MIND', 'SOUL'] as const;
const PILLAR_ID_TO_CODE: Record<number, (typeof PILLAR_CODES)[number]> = {
  1: 'BODY',
  2: 'MIND',
  3: 'SOUL',
};

const paramsSchema = z.object({
  id: uuidSchema,
});

type RawRow = Record<string, unknown>;

function toNumber(value: unknown): number {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePillarCode(value: unknown): (typeof PILLAR_CODES)[number] | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return PILLAR_ID_TO_CODE[value] ?? null;
  }

  if (typeof value === 'bigint') {
    return PILLAR_ID_TO_CODE[Number(value)] ?? null;
  }

  const text = value.toString().trim();

  if (text.length === 0) {
    return null;
  }

  const upper = text.toUpperCase();

  if (upper === 'BODY' || upper === 'CUERPO') {
    return 'BODY';
  }

  if (upper === 'MIND' || upper === 'MENTE') {
    return 'MIND';
  }

  if (upper === 'SOUL' || upper === 'ALMA') {
    return 'SOUL';
  }

  const numeric = Number(text);

  if (Number.isFinite(numeric)) {
    return PILLAR_ID_TO_CODE[numeric] ?? null;
  }

  return null;
}

function resolvePillarCode(row: RawRow): (typeof PILLAR_CODES)[number] | null {
  const explicitFields = [
    'pillar_code',
    'pillar',
    'code',
    'pillar_name',
    'pillarname',
    'pillar_id',
    'pillarid',
  ];

  for (const field of explicitFields) {
    if (field in row) {
      const code = normalizePillarCode(row[field]);

      if (code) {
        return code;
      }
    }
  }

  for (const value of Object.values(row)) {
    const code = normalizePillarCode(value);

    if (code) {
      return code;
    }
  }

  return null;
}

function extractMetric(row: RawRow, { preferWeek }: { preferWeek: boolean }): number {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const lowerKey = key.toLowerCase();

    if (!lowerKey.includes('xp')) {
      continue;
    }

    if (preferWeek) {
      if (!lowerKey.includes('week') && !lowerKey.includes('7')) {
        continue;
      }
    } else if (lowerKey.includes('week') || lowerKey.includes('7')) {
      continue;
    }

    const parsed = toNumber(value);

    if (parsed !== 0 || value === 0 || value === '0') {
      return parsed;
    }
  }

  if (preferWeek) {
    for (const [key, value] of entries) {
      const lowerKey = key.toLowerCase();

      if (!lowerKey.includes('week')) {
        continue;
      }

      const parsed = toNumber(value);

      if (parsed !== 0 || value === 0 || value === '0') {
        return parsed;
      }
    }
  } else {
    for (const [key, value] of entries) {
      const lowerKey = key.toLowerCase();

      if (!lowerKey.includes('total')) {
        continue;
      }

      const parsed = toNumber(value);

      if (parsed !== 0 || value === 0 || value === '0') {
        return parsed;
      }
    }
  }

  return 0;
}

export const getUserPillars: AsyncHandler = async (req, res) => {
  const parsedParams = paramsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).json({ error: 'bad_request', detail: 'invalid uuid' });
  }

  const { id } = parsedParams.data;

  const userResult = await pool.query<{ weekly_target: number | null }>(
    `SELECT gm.weekly_target AS weekly_target
       FROM users u
  LEFT JOIN cat_game_mode gm
         ON gm.game_mode_id = u.game_mode_id
      WHERE u.user_id = $1
      LIMIT 1`,
    [id],
  );

  if (userResult.rowCount === 0) {
    return res.status(404).json({ error: 'user_not_found' });
  }

  const weeklyTarget = toNumber(userResult.rows[0]?.weekly_target);

  const [totalsResult, weekResult] = await Promise.all([
    pool.query<RawRow>(
      `SELECT *
         FROM v_user_xp_by_pillar
        WHERE user_id = $1`,
      [id],
    ),
    pool.query<RawRow>(
      `SELECT *
         FROM v_user_pillars_week
        WHERE user_id = $1`,
      [id],
    ),
  ]);

  const totals: Record<(typeof PILLAR_CODES)[number], number> = {
    BODY: 0,
    MIND: 0,
    SOUL: 0,
  };

  for (const row of totalsResult.rows ?? []) {
    const code = resolvePillarCode(row);

    if (!code) {
      continue;
    }

    totals[code] = extractMetric(row, { preferWeek: false });
  }

  const weekly: Record<(typeof PILLAR_CODES)[number], number> = {
    BODY: 0,
    MIND: 0,
    SOUL: 0,
  };

  for (const row of weekResult.rows ?? []) {
    const code = resolvePillarCode(row);

    if (!code) {
      continue;
    }

    weekly[code] = extractMetric(row, { preferWeek: true });
  }

  const response = {
    user_id: id,
    pillars: PILLAR_CODES.map((code) => {
      const xp = Math.round(totals[code] ?? 0);
      const xpWeek = Math.round(weekly[code] ?? 0);
      const progress = weeklyTarget > 0 ? Math.round((xpWeek / weeklyTarget) * 100) : 0;

      return {
        code,
        xp,
        xp_week: xpWeek,
        progress_pct: Math.min(100, Math.max(0, progress)),
      };
    }),
  };

  return res.json(response);
};
