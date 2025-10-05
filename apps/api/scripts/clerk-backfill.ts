import 'dotenv/config';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import {
  mapClerkUserToShadow,
  type ClerkUserPayload,
} from '../src/lib/clerk-users.js';
import { upsertShadowUser } from '../src/services/user-shadow.js';
import pool from '../src/db/pool.js';

const CLERK_API_URL = 'https://api.clerk.com/v1/users';
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 250;

const clerkApiKey = process.env.CLERK_API_KEY;

if (!clerkApiKey) {
  console.error('CLERK_API_KEY is required to run the backfill');
  process.exit(1);
}

async function fetchUsers(offset: number): Promise<ClerkUserPayload[]> {
  const url = new URL(CLERK_API_URL);
  url.searchParams.set('limit', PAGE_SIZE.toString());
  url.searchParams.set('offset', offset.toString());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${clerkApiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch Clerk users (status ${response.status}): ${body}`,
    );
  }

  const payload = (await response.json()) as unknown;

  if (Array.isArray(payload)) {
    return payload as ClerkUserPayload[];
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: ClerkUserPayload[] }).data;
  }

  throw new Error('Unexpected Clerk API response format');
}

async function main() {
  let offset = 0;
  let totalProcessed = 0;

  try {
    while (true) {
      const users = await fetchUsers(offset);

      if (users.length === 0) {
        break;
      }

      for (const user of users) {
        const shadow = mapClerkUserToShadow(user);
        await upsertShadowUser(shadow);
        totalProcessed += 1;
      }

      if (users.length < PAGE_SIZE) {
        break;
      }

      offset += users.length;
      await delay(PAGE_DELAY_MS);
    }

    console.log(`Backfill completed. Processed ${totalProcessed} users.`);
  } catch (error) {
    console.error('Backfill failed', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
