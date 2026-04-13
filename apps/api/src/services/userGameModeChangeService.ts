import type { PoolClient } from 'pg';
import { HttpError } from '../lib/http-error.js';

const MODE_IMAGE_PATHS: Record<string, string> = {
  LOW: '/LowMood.jpg',
  CHILL: '/Chill-Mood.jpg',
  FLOW: '/FlowMood.jpg',
  EVOLVE: '/Evolve-Mood.jpg',
};

type QueryClient = Pick<PoolClient, 'query'>;

type GameModeRow = {
  game_mode_id: number;
  code: string;
};

type UserRow = {
  user_id: string;
  game_mode_id: number | null;
};

type UpdatedUserModeRow = {
  user_id: string;
  game_mode_id: number;
  image_url: string | null;
  avatar_url: string | null;
};

export function resolveGameModeImageUrl(modeCode: string): string | null {
  const normalizedCode = modeCode.trim().toUpperCase();
  const path = MODE_IMAGE_PATHS[normalizedCode];

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

export async function resolveGameModeByCode(client: QueryClient, modeCode: string): Promise<GameModeRow> {
  const normalizedCode = modeCode.trim().toUpperCase();
  const result = await client.query<GameModeRow>(
    `SELECT game_mode_id, code
       FROM cat_game_mode
      WHERE code = $1
      LIMIT 1`,
    [normalizedCode],
  );

  const row = result.rows[0];

  if (!row) {
    throw new HttpError(409, 'invalid_game_mode', 'Invalid game mode');
  }

  return row;
}

export async function resolveGameModeById(client: QueryClient, gameModeId: number): Promise<GameModeRow> {
  const result = await client.query<GameModeRow>(
    `SELECT game_mode_id, code
       FROM cat_game_mode
      WHERE game_mode_id = $1
      LIMIT 1`,
    [gameModeId],
  );

  const row = result.rows[0];

  if (!row) {
    throw new HttpError(409, 'invalid_game_mode', 'Invalid game mode');
  }

  return row;
}

export async function changeUserGameMode(client: QueryClient, input: {
  userId: string;
  nextGameModeId: number;
  nextModeCode: string;
  expectedCurrentGameModeId?: number | null;
}): Promise<UpdatedUserModeRow> {
  // Keep nextModeCode in the signature for API compatibility with existing call sites.
  // Rhythm (game_mode) writes must not mutate visual identity fields.
  void input.nextModeCode;

  const updateResult = await client.query<UpdatedUserModeRow>(
    `UPDATE users
        SET game_mode_id = $2
      WHERE user_id = $1::uuid
        AND ($3::int IS NULL OR game_mode_id = $3)
    RETURNING user_id, game_mode_id, image_url, avatar_url`,
    [input.userId, input.nextGameModeId, input.expectedCurrentGameModeId ?? null],
  );

  const updatedRow = updateResult.rows[0];

  if (updatedRow) {
    return updatedRow;
  }

  const userResult = await client.query<UserRow>(
    `SELECT user_id, game_mode_id
       FROM users
      WHERE user_id = $1::uuid
      LIMIT 1`,
    [input.userId],
  );

  if (!userResult.rows[0]) {
    throw new HttpError(404, 'user_not_found', 'User not found');
  }

  throw new HttpError(409, 'game_mode_change_conflict', 'User game mode changed before update');
}
