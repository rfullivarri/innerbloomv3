import process from 'node:process';
import type { Request, Response } from 'express';
import express from 'express';
import {
  Webhook,
  WebhookVerificationError,
  type WebhookRequiredHeaders,
} from 'svix';
import { pool } from '../db.js';

type ClerkEmailAddress = {
  email_address?: string | null;
};

type ClerkEventData = {
  id?: string;
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

const SOFT_DELETE_USER_SQL = `
  UPDATE users
  SET deleted_at = NOW()
  WHERE clerk_user_id = $1;
`;

const router = express.Router();

const rawJsonMiddleware = express.raw({ type: 'application/json' });

router.post('/api/webhooks/clerk', rawJsonMiddleware, async (req: Request, res: Response) => {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('[clerk] Missing CLERK_WEBHOOK_SECRET; webhook disabled');
    return res.status(503).json({ ok: false, error: 'Missing CLERK_WEBHOOK_SECRET' });
  }

  const payloadBuffer = req.body;
  const headers = extractSvixHeaders(req.headers);

  if (!headers) {
    console.error('[clerk] Missing Svix signature headers');
    return res.status(400).json({ ok: false, error: 'Missing Svix signature headers' });
  }

  const payloadString =
    typeof payloadBuffer === 'string'
      ? payloadBuffer
      : Buffer.isBuffer(payloadBuffer)
        ? payloadBuffer.toString('utf8')
        : undefined;

  if (!payloadString) {
    console.error('[clerk] Invalid payload body received');
    return res.status(400).json({ ok: false, error: 'Invalid payload' });
  }

  let event: ClerkWebhookEvent;
  try {
    const webhook = new Webhook(secret);
    event = webhook.verify(payloadString, headers) as ClerkWebhookEvent;
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error('[clerk] Invalid webhook signature');
      return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }

    console.error('[clerk] Failed to verify webhook', error);
    return res.status(500).json({ ok: false, error: 'Failed to verify webhook' });
  }

  const eventType = event.type;
  const data = event.data ?? {};
  const clerkUserId = data.id;

  console.info('[clerk]', eventType, clerkUserId);

  if (!clerkUserId) {
    console.error('[clerk] Event missing clerk user id');
    return res.status(200).json({ ok: true });
  }

  try {
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const email = extractPrimaryEmail(data.email_addresses) ?? null;
      const firstName = data.first_name ?? null;
      const lastName = data.last_name ?? null;
      const avatarUrl = data.image_url ?? data.profile_image_url ?? null;

      await pool.query(UPSERT_USER_SQL, [
        clerkUserId,
        email,
        firstName,
        lastName,
        avatarUrl,
      ]);
    } else if (eventType === 'user.deleted') {
      await pool.query(SOFT_DELETE_USER_SQL, [clerkUserId]);
    }
  } catch (error) {
    console.error('[clerk] Failed to persist user', error);
    return res.status(500).json({ ok: false, error: 'Failed to persist user' });
  }

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

function extractPrimaryEmail(addresses: ClerkEmailAddress[] | undefined): string | undefined {
  if (!addresses || addresses.length === 0) {
    return undefined;
  }

  for (const address of addresses) {
    if (address?.email_address) {
      return address.email_address;
    }
  }

  return undefined;
}

function isSingleHeader(value: string | string[] | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

export default router;
