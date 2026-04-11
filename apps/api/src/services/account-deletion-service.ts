import type { PoolClient, QueryResultRow } from 'pg';
import { withClient } from '../db.js';
import { HttpError } from '../lib/http-error.js';
import { createClerkAdminClient, type ClerkAdminClient } from './clerk-admin-client.js';

export type AccountDeletionResult = {
  deleted: {
    feedbackEvents: number;
    feedbackNotificationStates: number;
    weeklyWrapped: number;
    dailyLog: number;
    emotionLogs: number;
    tasks: number;
    users: number;
  };
};

export interface AccountDeletionService {
  deleteAccount(input: { userId: string; clerkUserId: string }): Promise<AccountDeletionResult>;
}

type DeleteAccountRow = QueryResultRow & {
  feedback_events_count: string | number;
  feedback_notification_states_count: string | number;
  weekly_wrapped_count: string | number;
  daily_log_count: string | number;
  emotions_logs_count: string | number;
  tasks_count: string | number;
  users_count: string | number;
};

const DELETE_ACCOUNT_SQL = `
WITH _uid AS (
  SELECT $1::uuid AS id
),
del_feedback_events AS (
  DELETE FROM feedback_events
  USING _uid
  WHERE feedback_events.user_id = _uid.id
  RETURNING 1
),
del_feedback_states AS (
  DELETE FROM feedback_user_notification_states
  USING _uid
  WHERE feedback_user_notification_states.user_id = _uid.id
  RETURNING 1
),
del_weekly_wrapped AS (
  DELETE FROM weekly_wrapped
  USING _uid
  WHERE weekly_wrapped.user_id = _uid.id
  RETURNING 1
),
del_daily_log AS (
  DELETE FROM daily_log
  USING _uid
  WHERE daily_log.user_id = _uid.id
  RETURNING 1
),
del_emotions_logs AS (
  DELETE FROM emotions_logs
  USING _uid
  WHERE emotions_logs.user_id = _uid.id
  RETURNING 1
),
del_tasks AS (
  DELETE FROM tasks
  USING _uid
  WHERE tasks.user_id = _uid.id
  RETURNING 1
),
del_users AS (
  DELETE FROM users
  USING _uid
  WHERE users.user_id = _uid.id
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM del_feedback_events) AS feedback_events_count,
  (SELECT count(*) FROM del_feedback_states) AS feedback_notification_states_count,
  (SELECT count(*) FROM del_weekly_wrapped) AS weekly_wrapped_count,
  (SELECT count(*) FROM del_daily_log) AS daily_log_count,
  (SELECT count(*) FROM del_emotions_logs) AS emotions_logs_count,
  (SELECT count(*) FROM del_tasks) AS tasks_count,
  (SELECT count(*) FROM del_users) AS users_count;
`;

function toCount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function deleteDatabaseRows(client: PoolClient, userId: string): Promise<AccountDeletionResult> {
  await client.query('BEGIN');

  try {
    const result = await client.query<DeleteAccountRow>(DELETE_ACCOUNT_SQL, [userId]);
    await client.query('COMMIT');

    const row = result.rows[0];
    if (!row) {
      throw new HttpError(500, 'account_delete_failed', 'Failed to delete account data.');
    }

    return {
      deleted: {
        feedbackEvents: toCount(row.feedback_events_count),
        feedbackNotificationStates: toCount(row.feedback_notification_states_count),
        weeklyWrapped: toCount(row.weekly_wrapped_count),
        dailyLog: toCount(row.daily_log_count),
        emotionLogs: toCount(row.emotions_logs_count),
        tasks: toCount(row.tasks_count),
        users: toCount(row.users_count),
      },
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}

export function createAccountDeletionService(options: {
  clerkClient?: ClerkAdminClient;
} = {}): AccountDeletionService {
  const clerkClient = options.clerkClient ?? createClerkAdminClient();

  return {
    async deleteAccount({ userId, clerkUserId }) {
      if (!userId?.trim()) {
        throw new HttpError(400, 'invalid_user_id', 'User id is required.');
      }

      if (!clerkUserId?.trim()) {
        throw new HttpError(400, 'invalid_clerk_user_id', 'Clerk user id is required.');
      }

      // Fail before mutating local data if the external deletion path is not configured.
      clerkClient.assertConfigured();

      const deletionResult = await withClient((client) => deleteDatabaseRows(client, userId));
      await clerkClient.deleteUser(clerkUserId);

      return deletionResult;
    },
  };
}

let cachedAccountDeletionService: AccountDeletionService | null = null;

export function getAccountDeletionService(): AccountDeletionService {
  if (!cachedAccountDeletionService) {
    cachedAccountDeletionService = createAccountDeletionService();
  }

  return cachedAccountDeletionService;
}

export function resetAccountDeletionServiceCache(): void {
  cachedAccountDeletionService = null;
}
