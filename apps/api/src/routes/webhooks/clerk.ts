import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Webhook, type WebhookRequiredHeaders } from 'svix';
import { pool } from '../../db/pool.js';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

const UPSERT_SQL = `
INSERT INTO users (clerk_user_id, email_primary, full_name, image_url, timezone, locale)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email_primary = EXCLUDED.email_primary,
  full_name = EXCLUDED.full_name,
  image_url = EXCLUDED.image_url,
  timezone = EXCLUDED.timezone,
  locale = EXCLUDED.locale;
`;

type SvixHeaders = Pick<WebhookRequiredHeaders, 'svix-id' | 'svix-timestamp' | 'svix-signature'>;

type ClerkEmailAddress = {
  id?: string | null;
  email_address?: string | null;
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

type ClerkWebhookEvent = {
  data: ClerkUser;
  type: string;
};

type WebhookRequest = FastifyRequest & { rawBody?: string | Buffer };

function extractPrimaryEmail(user: ClerkUser): string | null {
  const fromPrimaryObject = user.primary_email_address?.email_address;
  if (typeof fromPrimaryObject === 'string' && fromPrimaryObject.length > 0) {
    return fromPrimaryObject;
  }

  const emailAddresses = user.email_addresses ?? [];
  const primaryId = user.primary_email_address_id;

  if (primaryId) {
    const match = emailAddresses.find((entry) => entry?.id === primaryId);
    if (match?.email_address) {
      return match.email_address;
    }
  }

  for (const entry of emailAddresses) {
    if (entry?.email_address) {
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

async function handleUserUpsert(reply: FastifyReply, user: ClerkUser): Promise<void> {
  const params = buildUpsertParams(user);
  await pool.query(UPSERT_SQL, params);
  await reply.status(204).send();
}

async function handleUserDeleted(reply: FastifyReply, user: ClerkUser): Promise<void> {
  if (!user.id) {
    throw new Error('Clerk user is missing an id');
  }

  await pool.query('UPDATE users SET deleted_at = now() WHERE clerk_user_id = $1', [user.id]);
  await reply.status(204).send();
}

export default async function clerkWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  if (!webhookSecret) {
    fastify.log.warn('Clerk webhook secret not configured; Clerk webhooks route is disabled');
    fastify.post(
      '/api/webhooks/clerk',
      async (_request: FastifyRequest, reply: FastifyReply) =>
        reply.status(503).send({ error: 'Clerk webhook secret not configured' }),
    );
    return;
  }

  const webhookVerifier = new Webhook(webhookSecret);
  fastify.post(
    '/api/webhooks/clerk',
    async (request: WebhookRequest, reply: FastifyReply) => {
      const headers = extractSvixHeaders(request.headers);
      if (!headers) {
        return reply.status(400).send({ error: 'Missing Svix signature headers' });
      }

      const payload = request.rawBody;
      if (payload === undefined) {
        return reply.status(400).send({ error: 'Request body is required for signature verification' });
      }

      const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');

      let event: ClerkWebhookEvent;
      try {
        event = webhookVerifier.verify(payloadString, headers) as ClerkWebhookEvent;
      } catch (error) {
        request.log.error({ err: error }, 'Invalid Clerk webhook signature');
        return reply.status(400).send({ error: 'Invalid signature' });
      }

      const { type, data } = event;

      try {
        if (type === 'user.created' || type === 'user.updated') {
          await handleUserUpsert(reply, data);
          return;
        }

        if (type === 'user.deleted') {
          await handleUserDeleted(reply, data);
          return;
        }

        request.log.warn({ eventType: type }, 'Unhandled Clerk webhook event');
        return reply.status(422).send({ error: 'Unhandled event type' });
      } catch (error) {
        request.log.error({ err: error }, 'Failed processing Clerk webhook');
        return reply.status(500).send({ error: 'Failed to process webhook' });
      }
    },
  );
}

function extractSvixHeaders(headers: WebhookRequest['headers']): SvixHeaders | null {
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
