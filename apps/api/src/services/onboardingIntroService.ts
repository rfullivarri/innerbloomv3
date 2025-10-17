import type { PoolClient } from 'pg';
import { withClient } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import type { OnboardingIntroPayload } from '../schemas/onboarding.js';
import { triggerTaskGenerationForUser } from './taskgenTriggerService.js';

const ONBOARDING_MODE_IMAGE_PATHS: Record<OnboardingIntroPayload['mode'], string> = {
  LOW: '/LowMood.jpg',
  CHILL: '/Chill-Mood.jpg',
  FLOW: '/FlowMood.jpg',
  EVOLVE: '/Evolve-Mood.jpg',
} as const;

export function resolveModeImageUrl(mode: OnboardingIntroPayload['mode']): string | null {
  const path = ONBOARDING_MODE_IMAGE_PATHS[mode];

  if (!path) {
    return null;
  }

  const baseUrl = process.env.WEB_PUBLIC_BASE_URL;

  if (!baseUrl) {
    return path;
  }

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return `${normalizedBaseUrl}${path}`;
}

const SELECT_USER_SQL = 'SELECT user_id FROM users WHERE clerk_user_id = $1 LIMIT 1';
const SELECT_GAME_MODE_SQL =
  'SELECT game_mode_id, code FROM cat_game_mode WHERE code = $1 LIMIT 1';
const SELECT_PILLARS_SQL =
  "SELECT pillar_id, code FROM cat_pillar WHERE code = ANY($1::text[])";
const UPSERT_SESSION_SQL = `
WITH upd AS (
  UPDATE onboarding_session
  SET
    game_mode_id = $3,
    xp_total     = $4,
    xp_body      = $5,
    xp_mind      = $6,
    xp_soul      = $7,
    email        = $8,
    meta         = $9::jsonb,
    updated_at   = now()
  WHERE user_id = $1 AND client_id = $2
  RETURNING onboarding_session_id
)
INSERT INTO onboarding_session
  (user_id, client_id, game_mode_id, xp_total, xp_body, xp_mind, xp_soul, email, meta)
SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb
WHERE NOT EXISTS (SELECT 1 FROM upd)
RETURNING onboarding_session_id;
`;
const UPSERT_ANSWERS_SQL = `
WITH upd AS (
  UPDATE onboarding_answers
  SET payload = $2::jsonb
  WHERE onboarding_session_id = $1
  RETURNING 1
)
INSERT INTO onboarding_answers (onboarding_session_id, payload)
SELECT $1, $2::jsonb
WHERE NOT EXISTS (SELECT 1 FROM upd);
`;
const UPSERT_FOUNDATIONS_SQL = `
WITH upd AS (
  UPDATE onboarding_foundations
  SET items = $3, open_text = $4
  WHERE onboarding_session_id = $1 AND pillar_id = $2
  RETURNING 1
)
INSERT INTO onboarding_foundations
  (onboarding_session_id, pillar_id, items, open_text)
SELECT $1,$2,$3,$4
WHERE NOT EXISTS (SELECT 1 FROM upd);
`;
const UPDATE_USER_GAME_MODE_SQL =
  'UPDATE users SET game_mode_id = $2, image_url = $3, avatar_url = $3 WHERE user_id = $1';
const INSERT_XP_BONUS_SQL = `
INSERT INTO xp_bonus
  (user_id, pillar_id, source, amount, meta)
SELECT $1,$2,'onboarding',$3,$4::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM xp_bonus
  WHERE user_id = $1 AND pillar_id = $2 AND source = 'onboarding'
);
`;
const SELECT_LATEST_SESSION_SQL = `
  SELECT
    onboarding_session_id,
    client_id,
    game_mode_id,
    xp_total,
    xp_body,
    xp_mind,
    xp_soul,
    email,
    meta,
    created_at,
    updated_at
  FROM onboarding_session
  WHERE user_id = $1
  ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1
`;
const SELECT_SESSION_ANSWERS_SQL =
  'SELECT payload FROM onboarding_answers WHERE onboarding_session_id = $1 LIMIT 1';
const SELECT_SESSION_FOUNDATIONS_SQL = `
  SELECT f.pillar_id, p.code, f.items, f.open_text
  FROM onboarding_foundations f
  JOIN cat_pillar p ON p.pillar_id = f.pillar_id
  WHERE f.onboarding_session_id = $1
`;

const REQUIRED_PILLARS = ['BODY', 'MIND', 'SOUL'] as const;

type UserRow = { user_id: string };
type GameModeRow = { game_mode_id: string; code: string | null };
type PillarRow = { pillar_id: string; code: string };
type SessionRow = {
  onboarding_session_id: string;
  client_id: string;
  game_mode_id: string;
  xp_total: number;
  xp_body: number;
  xp_mind: number;
  xp_soul: number;
  email: string | null;
  meta: unknown;
  created_at: Date | string;
  updated_at: Date | string;
};
type AnswersRow = { payload: unknown };
type FoundationRow = {
  pillar_id: string;
  code: string;
  items: unknown;
  open_text: string | null;
};

type PillarMap = Map<string, string>;

type NormalizedXp = {
  total: number;
  body: number;
  mind: number;
  soul: number;
};

type NormalizedMode = Lowercase<OnboardingIntroPayload['mode']>;

export interface SubmitOnboardingResult {
  sessionId: string;
  awarded: boolean;
  userId: string;
  mode: NormalizedMode;
}

type SubmitOnboardingIntroDeps = {
  triggerTaskGenerationForUser: typeof triggerTaskGenerationForUser;
};

const defaultSubmitOnboardingIntroDeps: SubmitOnboardingIntroDeps = {
  triggerTaskGenerationForUser,
};

export interface DebugOnboardingSession {
  session: SessionRow;
  answers: unknown | null;
  foundations: {
    pillar_id: string;
    pillar_code: string;
    items: unknown;
    open_text: string | null;
  }[];
}

export async function submitOnboardingIntro(
  clerkUserId: string,
  payload: OnboardingIntroPayload,
  deps: SubmitOnboardingIntroDeps = defaultSubmitOnboardingIntroDeps,
): Promise<SubmitOnboardingResult> {
  return withClient(async (client) => {
    await client.query('BEGIN');

    try {
      const userId = await resolveUserId(client, clerkUserId);
      const { id: gameModeId } = await resolveGameMode(
        client,
        payload.mode,
      );
      const imageUrl = resolveModeImageUrl(payload.mode);

      if (!imageUrl) {
        throw new HttpError(500, 'missing_mode_image', 'Missing mood image for onboarding mode');
      }
      const pillarMap = await resolvePillarMap(client);
      const normalizedXp = normalizeXp(payload.xp);

      const sessionId = await upsertSession(client, {
        userId,
        payload,
        gameModeId,
        xp: normalizedXp,
      });

      await client.query(UPSERT_ANSWERS_SQL, [sessionId, JSON.stringify(payload)]);

      await upsertFoundations(client, sessionId, pillarMap, payload);

      const awarded = await insertXpBonus(
        client,
        userId,
        pillarMap,
        normalizedXp,
        payload,
        sessionId,
      );

      // Update the user's mode imagery after all onboarding data has been persisted.
      await client.query(UPDATE_USER_GAME_MODE_SQL, [userId, gameModeId, imageUrl]);

      await client.query('COMMIT');

      const normalizedMode = payload.mode.toLowerCase() as NormalizedMode;
      deps.triggerTaskGenerationForUser({ userId, mode: normalizedMode });

      return { sessionId, awarded, userId, mode: normalizedMode };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function getLatestOnboardingSession(
  clerkUserId: string,
): Promise<DebugOnboardingSession | null> {
  return withClient(async (client) => {
    const userId = await resolveUserId(client, clerkUserId);

    const sessionResult = await client.query<SessionRow>(SELECT_LATEST_SESSION_SQL, [userId]);
    const session = sessionResult.rows[0];

    if (!session) {
      return null;
    }

    const answersResult = await client.query<AnswersRow>(SELECT_SESSION_ANSWERS_SQL, [
      session.onboarding_session_id,
    ]);
    const foundationsResult = await client.query<FoundationRow>(SELECT_SESSION_FOUNDATIONS_SQL, [
      session.onboarding_session_id,
    ]);

    const answersPayload = answersResult.rows[0]?.payload ?? null;

    return {
      session,
      answers: sanitizeAnswersPayload(answersPayload),
      foundations: foundationsResult.rows.map((row) => ({
        pillar_id: row.pillar_id,
        pillar_code: row.code,
        items: row.items,
        open_text: row.open_text,
      })),
    };
  });
}

async function resolveUserId(client: PoolClient, clerkUserId: string): Promise<string> {
  const result = await client.query<UserRow>(SELECT_USER_SQL, [clerkUserId]);
  const row = result.rows[0];

  if (!row) {
    throw new HttpError(401, 'unauthorized', 'User not found for provided credentials');
  }

  return row.user_id;
}

async function resolveGameMode(client: PoolClient, code: string): Promise<{ id: string }> {
  const result = await client.query<GameModeRow>(SELECT_GAME_MODE_SQL, [code]);
  const row = result.rows[0];

  if (!row) {
    throw new HttpError(409, 'invalid_game_mode', 'Invalid onboarding mode');
  }

  return {
    id: row.game_mode_id,
  };
}

async function resolvePillarMap(client: PoolClient): Promise<PillarMap> {
  const result = await client.query<PillarRow>(SELECT_PILLARS_SQL, [REQUIRED_PILLARS]);

  const map: PillarMap = new Map();
  for (const row of result.rows) {
    map.set(row.code, row.pillar_id);
  }

  for (const pillar of REQUIRED_PILLARS) {
    if (!map.has(pillar)) {
      throw new HttpError(409, 'missing_pillar', `Pillar ${pillar} is not configured`);
    }
  }

  return map;
}

async function upsertSession(
  client: PoolClient,
  input: {
    userId: string;
    payload: OnboardingIntroPayload;
    gameModeId: string;
    xp: NormalizedXp;
  },
): Promise<string> {
  const sessionResult = await client.query<{ onboarding_session_id: string }>(UPSERT_SESSION_SQL, [
    input.userId,
    input.payload.client_id,
    input.gameModeId,
    input.xp.total,
    input.xp.body,
    input.xp.mind,
    input.xp.soul,
    input.payload.email,
    JSON.stringify(input.payload.meta),
  ]);

  const sessionRow = sessionResult.rows[0];

  if (!sessionRow) {
    throw new HttpError(500, 'session_upsert_failed', 'Failed to persist onboarding session');
  }

  console.info('[session upsert] done', { sessionId: sessionRow.onboarding_session_id });

  return sessionRow.onboarding_session_id;
}

async function upsertFoundations(
  client: PoolClient,
  sessionId: string,
  pillarMap: PillarMap,
  payload: OnboardingIntroPayload,
): Promise<void> {
  const foundations = payload.data.foundations;
  const bodyPillarId = pillarMap.get('BODY');
  const mindPillarId = pillarMap.get('MIND');
  const soulPillarId = pillarMap.get('SOUL');

  if (!bodyPillarId || !mindPillarId || !soulPillarId) {
    throw new HttpError(409, 'missing_pillar', 'Required pillars are not configured');
  }

  const foundationRows = [
    {
      pillarId: bodyPillarId,
      items: foundations.body,
      openText: foundations.bodyOpen,
    },
    {
      pillarId: mindPillarId,
      items: foundations.mind,
      openText: foundations.mindOpen,
    },
    {
      pillarId: soulPillarId,
      items: foundations.soul,
      openText: foundations.soulOpen,
    },
  ];

  for (const { pillarId, items, openText } of foundationRows) {
    await client.query(UPSERT_FOUNDATIONS_SQL, [sessionId, pillarId, items, openText]);
  }

  console.info('[foundations upsert] body/mind/soul done');
}

async function insertXpBonus(
  client: PoolClient,
  userId: string,
  pillarMap: PillarMap,
  xp: NormalizedXp,
  payload: OnboardingIntroPayload,
  sessionId: string,
): Promise<boolean> {
  const bodyPillarId = pillarMap.get('BODY');
  const mindPillarId = pillarMap.get('MIND');
  const soulPillarId = pillarMap.get('SOUL');

  if (!bodyPillarId || !mindPillarId || !soulPillarId) {
    throw new HttpError(409, 'missing_pillar', 'Required pillars are not configured');
  }

  const xpMeta = {
    ...payload.meta,
    onboarding_session_id: sessionId,
    ts: payload.ts,
    client_id: payload.client_id,
  };
  const metaJson = JSON.stringify(xpMeta);

  const xpBonuses = [
    { pillarId: bodyPillarId, amount: xp.body },
    { pillarId: mindPillarId, amount: xp.mind },
    { pillarId: soulPillarId, amount: xp.soul },
  ];

  let inserted = 0;

  for (const bonus of xpBonuses) {
    const result = await client.query(INSERT_XP_BONUS_SQL, [
      userId,
      bonus.pillarId,
      bonus.amount,
      metaJson,
    ]);

    inserted += result.rowCount ?? 0;
  }

  console.info('[bonus insert] attempted');

  return inserted > 0;
}

function normalizeXp(xpRaw: OnboardingIntroPayload['xp'] | undefined): NormalizedXp {
  const raw = xpRaw ?? ({} as OnboardingIntroPayload['xp']);

  const ensureNumber = (value: unknown): number | undefined => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
      throw new HttpError(400, 'invalid_xp', 'xp inválido');
    }

    return value;
  };

  const xp_body = Math.round(ensureNumber(raw.Body) ?? 0);
  const xp_mind = Math.round(ensureNumber(raw.Mind) ?? 0);
  const xp_soul = Math.round(ensureNumber(raw.Soul) ?? 0);
  let xp_total = Math.round(ensureNumber(raw.total) ?? 0);
  const sum = xp_body + xp_mind + xp_soul;
  if (xp_total !== sum) xp_total = sum;

  return {
    total: xp_total,
    body: xp_body,
    mind: xp_mind,
    soul: xp_soul,
  };
}

function sanitizeAnswersPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const { email: _email, meta: _meta, ...rest } = payload as Record<string, unknown>;
  void _email;
  void _meta;

  return rest;
}
