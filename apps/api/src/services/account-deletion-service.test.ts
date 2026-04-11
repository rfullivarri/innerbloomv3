import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccountDeletionService } from './account-deletion-service.js';

const { mockWithClient } = vi.hoisted(() => ({
  mockWithClient: vi.fn(),
}));

vi.mock('../db.js', () => ({
  withClient: mockWithClient,
  dbReady: Promise.resolve(),
}));

function createMockClient(rows = [{
  feedback_events_count: '1',
  feedback_notification_states_count: '2',
  weekly_wrapped_count: '3',
  daily_log_count: '4',
  emotions_logs_count: '5',
  tasks_count: '6',
  users_count: '1',
}]) {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      return { rows };
    }),
  } as unknown as PoolClient & { query: ReturnType<typeof vi.fn> };
}

describe('createAccountDeletionService', () => {
  beforeEach(() => {
    mockWithClient.mockReset();
  });

  it('deletes database rows before deleting the Clerk user', async () => {
    const client = createMockClient();
    const clerkClient = {
      assertConfigured: vi.fn(),
      deleteUser: vi.fn(async () => undefined),
    };
    mockWithClient.mockImplementation(async (callback) => callback(client));

    const service = createAccountDeletionService({ clerkClient });
    const result = await service.deleteAccount({
      userId: '8f15868c-62ac-4749-bbf9-68bfb0f6f93f',
      clerkUserId: 'user_123',
    });

    expect(clerkClient.assertConfigured).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM users'),
      ['8f15868c-62ac-4749-bbf9-68bfb0f6f93f'],
    );
    expect(client.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(clerkClient.deleteUser).toHaveBeenCalledWith('user_123');
    expect(result.deleted).toEqual({
      feedbackEvents: 1,
      feedbackNotificationStates: 2,
      weeklyWrapped: 3,
      dailyLog: 4,
      emotionLogs: 5,
      tasks: 6,
      users: 1,
    });
  });

  it('rolls back when database deletion fails', async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        throw new Error('db failed');
      }),
    } as unknown as PoolClient & { query: ReturnType<typeof vi.fn> };
    const clerkClient = {
      assertConfigured: vi.fn(),
      deleteUser: vi.fn(async () => undefined),
    };
    mockWithClient.mockImplementation(async (callback) => callback(client));

    const service = createAccountDeletionService({ clerkClient });

    await expect(service.deleteAccount({
      userId: '8f15868c-62ac-4749-bbf9-68bfb0f6f93f',
      clerkUserId: 'user_123',
    })).rejects.toThrow('db failed');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(clerkClient.deleteUser).not.toHaveBeenCalled();
  });
});
