import type { PoolClient } from 'pg';
import { withClient } from '../db.js';

export type JourneyGenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

export type JourneyGenerationState = {
  userId: string;
  status: JourneyGenerationStatus;
  correlationId: string | null;
  updatedAt: string;
  completedAt: string | null;
  failureReason: string | null;
};

const UPSERT_STATE_SQL = `
INSERT INTO user_journey_generation_state (
  user_id,
  status,
  correlation_id,
  completed_at,
  failure_reason,
  updated_at
)
VALUES (
  $1,
  $2,
  $3,
  CASE WHEN $2 = 'completed' THEN now() ELSE NULL END,
  CASE WHEN $2 = 'failed' THEN $4 ELSE NULL END,
  now()
)
ON CONFLICT (user_id)
DO UPDATE SET
  status = EXCLUDED.status,
  correlation_id = COALESCE(EXCLUDED.correlation_id, user_journey_generation_state.correlation_id),
  completed_at = CASE
    WHEN EXCLUDED.status = 'completed' THEN now()
    WHEN EXCLUDED.status IN ('pending', 'running') THEN NULL
    ELSE user_journey_generation_state.completed_at
  END,
  failure_reason = CASE
    WHEN EXCLUDED.status = 'failed' THEN EXCLUDED.failure_reason
    ELSE NULL
  END,
  updated_at = now();
`;

const SELECT_STATE_SQL = `
SELECT
  user_id,
  status,
  correlation_id,
  updated_at,
  completed_at,
  failure_reason
FROM user_journey_generation_state
WHERE user_id = $1
LIMIT 1
`;

type StateRow = {
  user_id: string;
  status: JourneyGenerationStatus;
  correlation_id: string | null;
  updated_at: Date | string;
  completed_at: Date | string | null;
  failure_reason: string | null;
};

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return value.toISOString();
}

function mapRow(row: StateRow): JourneyGenerationState {
  return {
    userId: row.user_id,
    status: row.status,
    correlationId: row.correlation_id,
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    completedAt: toIsoString(row.completed_at),
    failureReason: row.failure_reason,
  };
}

export async function upsertJourneyGenerationState(
  userId: string,
  status: JourneyGenerationStatus,
  options: { correlationId?: string | null; failureReason?: string | null } = {},
): Promise<void> {
  await withClient(async (client) => {
    await upsertJourneyGenerationStateWithClient(client, userId, status, options);
  });
}

export async function upsertJourneyGenerationStateWithClient(
  client: PoolClient,
  userId: string,
  status: JourneyGenerationStatus,
  options: { correlationId?: string | null; failureReason?: string | null } = {},
): Promise<void> {
  await client.query(UPSERT_STATE_SQL, [
    userId,
    status,
    options.correlationId ?? null,
    options.failureReason ?? null,
  ]);
}

export async function getJourneyGenerationState(userId: string): Promise<JourneyGenerationState | null> {
  return withClient(async (client) => {
    const result = await client.query<StateRow>(SELECT_STATE_SQL, [userId]);
    const row = result.rows[0];

    return row ? mapRow(row) : null;
  });
}
