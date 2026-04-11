import { describe, expect, it, vi } from 'vitest';
import { createClerkAdminClient } from './clerk-admin-client.js';
import { HttpError } from '../lib/http-error.js';

describe('createClerkAdminClient', () => {
  it('requires a Clerk secret key', () => {
    const client = createClerkAdminClient({ secretKey: '' });

    expect(() => client.assertConfigured()).toThrow(HttpError);
  });

  it('deletes a Clerk user via the Backend API', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));
    const client = createClerkAdminClient({
      secretKey: 'sk_test_123',
      apiBaseUrl: 'https://clerk.test',
      fetchFn,
    });

    await client.deleteUser('user_123');

    expect(fetchFn).toHaveBeenCalledWith('https://clerk.test/v1/users/user_123', {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer sk_test_123',
        Accept: 'application/json',
      },
    });
  });

  it('treats missing Clerk users as already deleted', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 404 }));
    const client = createClerkAdminClient({
      secretKey: 'sk_test_123',
      fetchFn,
    });

    await expect(client.deleteUser('user_missing')).resolves.toBeUndefined();
  });
});
