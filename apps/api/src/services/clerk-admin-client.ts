import process from 'node:process';
import { HttpError } from '../lib/http-error.js';

export interface ClerkAdminClient {
  assertConfigured(): void;
  deleteUser(clerkUserId: string): Promise<void>;
}

export interface ClerkAdminClientConfig {
  secretKey?: string;
  apiBaseUrl?: string;
  fetchFn?: typeof fetch;
}

function normalizeApiBaseUrl(value?: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : 'https://api.clerk.com';
}

export function createClerkAdminClient(config: ClerkAdminClientConfig = {}): ClerkAdminClient {
  const secretKey = config.secretKey ?? process.env.CLERK_SECRET_KEY;
  const apiBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl ?? process.env.CLERK_API_BASE_URL);
  const fetchFn = config.fetchFn ?? fetch;

  const assertConfigured = () => {
    if (!secretKey?.trim()) {
      throw new HttpError(
        503,
        'clerk_admin_not_configured',
        'Account deletion is not configured.',
      );
    }
  };

  return {
    assertConfigured,

    async deleteUser(clerkUserId: string): Promise<void> {
      assertConfigured();
      const normalizedSecretKey = secretKey?.trim();

      const normalizedClerkUserId = clerkUserId.trim();
      if (!normalizedClerkUserId) {
        throw new HttpError(400, 'invalid_clerk_user_id', 'Clerk user id is required.');
      }

      const response = await fetchFn(
        `${apiBaseUrl}/v1/users/${encodeURIComponent(normalizedClerkUserId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${normalizedSecretKey}`,
            Accept: 'application/json',
          },
        },
      );

      if (response.ok || response.status === 404) {
        return;
      }

      let details: unknown = null;
      try {
        details = await response.json();
      } catch {
        details = await response.text().catch(() => null);
      }

      throw new HttpError(
        502,
        'clerk_delete_failed',
        'Failed to delete the Clerk user.',
        { status: response.status, details },
      );
    },
  };
}
