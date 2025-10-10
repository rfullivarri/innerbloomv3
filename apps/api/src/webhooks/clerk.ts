import { Buffer } from 'node:buffer';
import process from 'node:process';
import type { Request, Response } from 'express';
import express from 'express';
import {
  Webhook,
  WebhookVerificationError,
  type WebhookRequiredHeaders,
} from 'svix';
import { pool } from '../db.js';

const router = express.Router();

const rawJsonMiddleware = express.raw({ type: 'application/json' });

const hasSecretConfigured = Boolean(process.env.CLERK_WEBHOOK_SECRET);
console.info('[clerk-webhook] signing secret detected', { hasSecret: hasSecretConfigured });

const ENSURE_SCHEMA_SQL = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users (clerk_user_id);
`;

const UPSERT_USER_SQL = `
INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url, deleted_at)
VALUES ($1, $2, $3, $4, $5, NULL)
ON CONFLICT (clerk_user_id) DO UPDATE
  SET email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      avatar_url = EXCLUDED.avatar_url,
      deleted_at = NULL;
`;

const SYNC_LEGACY_PROFILE_SQL = `
UPDATE users
SET email_primary = $2,
    full_name = $3,
    image_url = $4
WHERE clerk_user_id = $1;
`;

const SOFT_DELETE_USER_SQL = `
UPDATE users
SET deleted_at = NOW()
WHERE clerk_user_id = $1;
`;

type ClerkEmailAddress = {
  id?: string | null;
  email_address?: string | null;
};

type ClerkEventData = {
  id?: string;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
};

type ClerkWebhookEvent = {
  type?: string;
  data?: ClerkEventData;
};

type SvixHeaders = Pick<
  WebhookRequiredHeaders,
  'svix-id' | 'svix-timestamp' | 'svix-signature'
>;

let ensureSchemaPromise: Promise<void> | null = null;

router.get('/webhooks/clerk/health', (_req, res) => {
  return res.status(200).json({ ok: true });
});

router.post(
  '/webhooks/clerk',
  rawJsonMiddleware,
  async (req: Request, res: Response): Promise<Response> => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[clerk-webhook] Missing CLERK_WEBHOOK_SECRET');
      return res.status(503).json({ code: 'webhook_disabled' });
    }

    console.info('[clerk-webhook] incoming event with secret configured', {
      hasSecret: Boolean(secret),
    });

    const payloadString = toPayloadString(req.body);
    if (!payloadString) {
      console.error('[clerk-webhook] Invalid payload received');
      return res.status(400).json({ code: 'invalid_payload' });
    }

    const headers = extractSvixHeaders(req.headers);
    if (!headers) {
      console.warn('[clerk-webhook] Missing Svix signature headers');
      return res.status(400).json({ code: 'invalid_signature' });
    }

    let event: ClerkWebhookEvent;
    try {
      const webhook = new Webhook(secret);
      event = webhook.verify(payloadString, headers) as ClerkWebhookEvent;
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.warn('[clerk-webhook] Signature verification failed');
        return res.status(400).json({ code: 'invalid_signature' });
      }

      console.error('[clerk-webhook] Unexpected verification error', error);
      return res.status(500).json({ code: 'verification_failed' });
    }

    const eventType = event.type;
    const data = event.data;
    const clerkUserId = data?.id;

    if (!eventType || !clerkUserId) {
      console.warn('[clerk-webhook] Event missing type or clerk_user_id');
      return res.status(200).json({ ok: true });
    }

    console.info('[clerk-webhook]', eventType, clerkUserId);

    try {
      if (eventType === 'user.created' || eventType === 'user.updated') {
        await ensureSchema();

        const email = getPrimaryEmail(data);
        const firstName = normalizeName(data?.first_name);
        const lastName = normalizeName(data?.last_name);
        const avatarUrl = extractAvatarUrl(data?.image_url, data?.profile_image_url);
        const fullName = buildFullName(firstName, lastName);

        await pool.query(UPSERT_USER_SQL, [
          clerkUserId,
          email,
          firstName,
          lastName,
          avatarUrl,
        ]);

        await pool.query(SYNC_LEGACY_PROFILE_SQL, [
          clerkUserId,
          email,
          fullName,
          avatarUrl,
        ]);
      } else if (eventType === 'user.deleted') {
        await ensureSchema();
        await pool.query(SOFT_DELETE_USER_SQL, [clerkUserId]);
      }
    } catch (error) {
      console.error('[clerk-webhook] Failed to persist user', error);
      return res.status(500).json({ code: 'persistence_error' });
    }

    return res.status(200).json({ ok: true });
  },
);

function extractSvixHeaders(headers: Request['headers']): SvixHeaders | null {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signature = headers['svix-signature'];

  if (!isSingleHeader(id) || !isSingleHeader(timestamp) || !isSingleHeader(signature)) {
    return null;
  }

  return {
    'svix-id': id,
    'svix-timestamp': timestamp,
    'svix-signature': signature,
  };
}

function isSingleHeader(value: string | string[] | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function toPayloadString(body: unknown): string | null {
  if (typeof body === 'string') {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  return null;
}

function getPrimaryEmail(data: ClerkEventData | undefined): string | null {
  if (!data) {
    return null;
  }

  const primaryId = data.primary_email_address_id ?? null;
  const addresses = Array.isArray(data.email_addresses) ? data.email_addresses : [];

  const candidate = primaryId
    ? addresses.find((address) => address?.id === primaryId)
    : addresses[0];

  const raw = candidate?.email_address;

  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeName(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function buildFullName(firstName: string, lastName: string): string | null {
  const parts = [firstName, lastName].map((part) => part.trim()).filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' ');
}

function extractAvatarUrl(
  imageUrl: string | null | undefined,
  profileImageUrl: string | null | undefined,
): string | null {
  const primary = normalizeUrl(imageUrl);
  if (primary) {
    return primary;
  }

  return normalizeUrl(profileImageUrl);
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = pool
      .query(ENSURE_SCHEMA_SQL)
      .then(() => undefined)
      .catch((error: unknown) => {
        ensureSchemaPromise = null;
        throw error;
      });
  }

  await ensureSchemaPromise;
}

export default router;
