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
const rawJson = express.raw({ type: 'application/json' });

const UPSERT_USER_SQL = `
INSERT INTO users (clerk_user_id, email, first_name, last_name, image_url, timezone, channel_scheduler, deleted_at)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  CASE WHEN $6::boolean THEN $7 ELSE 'UTC' END,
  CASE WHEN $8::boolean THEN $9 ELSE 'email' END,
  NULL
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email             = COALESCE(EXCLUDED.email,             users.email),
  first_name        = COALESCE(EXCLUDED.first_name,        users.first_name),
  last_name         = COALESCE(EXCLUDED.last_name,         users.last_name),
  image_url         = COALESCE(EXCLUDED.image_url,         users.image_url),
  timezone          = COALESCE((CASE WHEN $6::boolean THEN EXCLUDED.timezone ELSE NULL END), users.timezone),
  channel_scheduler = COALESCE((CASE WHEN $8::boolean THEN EXCLUDED.channel_scheduler ELSE NULL END), users.channel_scheduler),
  deleted_at        = NULL
RETURNING user_id;
`;

const SYNC_LEGACY_SQL = `
UPDATE users
SET email_primary = COALESCE($2, email_primary),
    full_name     = COALESCE($3, full_name),
    avatar_url    = COALESCE($4, avatar_url)
WHERE clerk_user_id = $1;
`;

const LOG_EVENT_SQL = `
INSERT INTO clerk_webhook_events (svix_id, event_type, payload)
VALUES ($1, $2, $3)
ON CONFLICT (svix_id) DO NOTHING;
`;

const SOFT_DELETE_USER_SQL = `
UPDATE users
SET deleted_at = now()
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
  timezone?: string | null;
  channel_scheduler?: string | null;
  public_metadata?: Record<string, unknown> | null;
};

type ClerkWebhookEvent = {
  type?: string;
  data?: ClerkEventData;
};

type SvixHeaders = Pick<
  WebhookRequiredHeaders,
  'svix-id' | 'svix-timestamp' | 'svix-signature'
>;

const loggingEnabled = process.env.API_LOGGING === 'true';

const logInfo = (message: string, meta?: Record<string, unknown>) => {
  if (!loggingEnabled) {
    return;
  }

  if (typeof meta === 'undefined') {
    console.info('[clerk-webhook]', message);
    return;
  }

  console.info('[clerk-webhook]', message, meta);
};

logInfo('registering routes');

router.get('/webhooks/clerk/health', (_req, res) => {
  return res.status(200).json({ ok: true });
});

const norm = (value?: string | null): string | null => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : null;
};

const buildFullName = (first?: string | null, last?: string | null): string | null => {
  const parts = [norm(first), norm(last)].filter(Boolean) as string[];
  return parts.length ? parts.join(' ') : null;
};

router.post('/webhooks/clerk', rawJson, async (req: Request, res: Response): Promise<Response> => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[clerk-webhook] Missing CLERK_WEBHOOK_SECRET');
    return res.status(503).json({ code: 'webhook_disabled' });
  }

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

  const svixId = headers['svix-id'];
  const eventType = event.type;
  const data = event.data;
  const clerkId = data?.id ?? null;

  if (!eventType || !clerkId) {
    logInfo('ignoring event missing metadata', { eventType, clerkId });
    return res.status(200).json({ ok: true });
  }

  logInfo('received event', { eventType, clerkId });

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const email = getPrimaryEmail(data);
      const firstName = norm(data?.first_name);
      const lastName = norm(data?.last_name);
      const imageUrl = norm(data?.image_url) ?? norm((data as { profile_image_url?: string | null })?.profile_image_url);
      const fullName = buildFullName(firstName, lastName);
      const timezone = resolveTimezone(data);
      const channelScheduler = resolveChannelScheduler(data);
      const timezoneProvided = timezone !== null;
      const channelSchedulerProvided = channelScheduler !== null;

      await pool.query('BEGIN');
      await pool.query(LOG_EVENT_SQL, [svixId, eventType, payloadString]);
      const result = await pool.query(UPSERT_USER_SQL, [
        clerkId,
        email,
        firstName,
        lastName,
        imageUrl,
        timezoneProvided,
        timezone,
        channelSchedulerProvided,
        channelScheduler,
      ]);
      await pool.query(SYNC_LEGACY_SQL, [clerkId, email, fullName, imageUrl]);
      await pool.query('COMMIT');

      const userId = result.rows[0]?.user_id ?? null;
      logInfo('persisted user', { eventType, clerkId, userId });

      return res.status(200).json({ ok: true, user_id: userId });
    }

    if (eventType === 'user.deleted') {
      await pool.query('BEGIN');
      await pool.query(LOG_EVENT_SQL, [svixId, eventType, payloadString]);
      await pool.query(SOFT_DELETE_USER_SQL, [clerkId]);
      await pool.query('COMMIT');

      logInfo('soft deleted user', { clerkId });

      return res.status(200).json({ ok: true });
    }
  } catch (error: unknown) {
    await pool.query('ROLLBACK').catch(() => {
      // ignore rollback failures
    });
    console.error('[clerk-webhook] persist error', {
      message: (error as { message?: string })?.message,
      code: (error as { code?: string })?.code,
      detail: (error as { detail?: unknown })?.detail,
      constraint: (error as { constraint?: string })?.constraint,
    });
    logInfo('handler failed', { eventType, clerkId });
    return res.status(500).json({ code: 'persistence_error' });
  }

  logInfo('ignored event type', { eventType, clerkId });
  return res.status(200).json({ ok: true });
});

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
  const pid = data?.primary_email_address_id;
  const arr = data?.email_addresses ?? [];
  const hit = pid ? arr.find((address) => address?.id === pid) : arr[0];
  const raw = hit?.email_address?.trim();
  return raw && raw.length ? raw : null;
}

function resolveTimezone(data: ClerkEventData | undefined): string | null {
  const direct = norm(data?.timezone);
  if (direct) {
    return direct;
  }

  const fromMetadata = extractFromMetadata(data?.public_metadata, ['timezone', 'time_zone']);
  return fromMetadata ?? null;
}

function resolveChannelScheduler(data: ClerkEventData | undefined): string | null {
  const direct = norm((data as { channel_scheduler?: string | null; channelScheduler?: string | null })?.channel_scheduler);
  if (direct) {
    return direct;
  }

  const camel = norm((data as { channelScheduler?: string | null })?.channelScheduler);
  if (camel) {
    return camel;
  }

  const fromMetadata = extractFromMetadata(data?.public_metadata, ['channel_scheduler', 'channelScheduler']);
  return fromMetadata ?? null;
}

function extractFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string') {
      const normalized = norm(value);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

export default router;
