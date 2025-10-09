import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { pool } from '../src/db/pool.js';

const apiKey = process.env.CLERK_API_KEY;

if (!apiKey) {
  throw new Error('CLERK_API_KEY must be provided to run the backfill');
}

const UPSERT_SQL = `
INSERT INTO users (clerk_user_id, email_primary, full_name, image_url, timezone, locale)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email_primary = EXCLUDED.email_primary,
  full_name = EXCLUDED.full_name,
  image_url = EXCLUDED.image_url,
  timezone = EXCLUDED.timezone,
  locale = EXCLUDED.locale
RETURNING (xmax = 0) AS inserted;
`;

type ClerkEmailAddress = {
  id?: string | null;
  email_address?: string | null;
  reserved?: boolean | null;
};

type ClerkUser = {
  id?: string;
  email_addresses?: ClerkEmailAddress[] | null;
  primary_email_address_id?: string | null;
  primary_email_address?: ClerkEmailAddress | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
  timezone?: string | null;
  locale?: string | null;
};

function extractPrimaryEmail(user: ClerkUser): string | null {
  const fromPrimaryObject = user.primary_email_address?.email_address;
  const primaryIsReserved = user.primary_email_address?.reserved === true;

  if (
    typeof fromPrimaryObject === 'string' &&
    fromPrimaryObject.length > 0 &&
    !primaryIsReserved
  ) {
    return fromPrimaryObject;
  }

  const emailAddresses = user.email_addresses ?? [];
  const primaryId = user.primary_email_address_id;

  if (primaryId) {
    const match = emailAddresses.find((entry) => entry?.id === primaryId);
    if (match?.email_address && match.reserved !== true) {
      return match.email_address;
    }
  }

  for (const entry of emailAddresses) {
    if (entry?.email_address && entry.reserved !== true) {
      return entry.email_address;
    }
  }

  return null;
}

function extractFullName(user: ClerkUser): string | null {
  const parts = [user.first_name, user.last_name]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  if (parts.length > 0) {
    return parts.join(' ');
  }

  const username = typeof user.username === 'string' ? user.username.trim() : '';
  return username.length > 0 ? username : null;
}

function buildUpsertParams(user: ClerkUser): [string, string | null, string | null, string | null, string | null, string | null] {
  if (!user.id) {
    throw new Error('Clerk user is missing an id');
  }

  const email = extractPrimaryEmail(user);
  const fullName = extractFullName(user);
  const imageUrl = user.image_url ?? user.profile_image_url ?? null;
  const timezone = user.timezone ?? null;
  const locale = user.locale ?? null;

  return [user.id, email, fullName, imageUrl, timezone, locale];
}

async function fetchUsers(offset: number, limit: number): Promise<ClerkUser[]> {
  const url = new URL('https://api.clerk.com/v1/users');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Clerk API request failed with status ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new Error('Unexpected Clerk API response shape');
  }

  return payload as ClerkUser[];
}

async function main(): Promise<void> {
  const limit = 100;
  let offset = 0;
  let processed = 0;
  let inserted = 0;
  let updated = 0;

  while (true) {
    const users = await fetchUsers(offset, limit);

    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      const params = buildUpsertParams(user);
      const result = await pool.query<{ inserted: boolean }>(UPSERT_SQL, params);
      processed += 1;

      if (result.rows[0]?.inserted) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    offset += users.length;

    if (users.length < limit) {
      break;
    }

    await delay(200);
  }

  console.log(`Processed ${processed} users (${inserted} inserted, ${updated} updated).`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    await pool.end();
    process.exitCode = 1;
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
  });
