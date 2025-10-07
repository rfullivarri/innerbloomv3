import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Webhook, type WebhookRequiredHeaders } from 'svix';
import { pool } from '../../db.js';

const INSERT_USER_SQL =
  'INSERT INTO users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO NOTHING';

type ClerkEvent = {
  type?: string;
  data?: {
    id?: string;
  };
};

type WebhookRequest = FastifyRequest & { rawBody?: string | Buffer };

type SvixHeaders = Pick<WebhookRequiredHeaders, 'svix-id' | 'svix-timestamp' | 'svix-signature'>;

export default async function clerkWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    fastify.log.warn('Clerk webhook secret not configured; Clerk webhooks route is disabled');
    fastify.post(
      '/api/webhooks/clerk',
      async (_request: FastifyRequest, reply: FastifyReply) =>
        reply
          .status(503)
          .send({ ok: false, error: 'Missing CLERK_WEBHOOK_SECRET' }),
    );
    return;
  }

  const webhook = new Webhook(secret);

  fastify.post('/api/webhooks/clerk', async (request: WebhookRequest, reply: FastifyReply) => {
    const headers = extractSvixHeaders(request.headers);
    if (!headers) {
      return reply
        .status(400)
        .send({ ok: false, error: 'Missing Svix signature headers' });
    }

    const payload = request.rawBody;
    const payloadString = typeof payload === 'string' ? payload : payload?.toString('utf8');
    if (!payloadString) {
      return reply.status(400).send({ ok: false, error: 'Invalid payload' });
    }

    let event: ClerkEvent;
    try {
      event = webhook.verify(payloadString, headers) as ClerkEvent;
    } catch (error) {
      request.log.error({ err: error }, 'Invalid Clerk webhook signature');
      return reply.status(400).send({ ok: false, error: 'Invalid signature' });
    }

    if (event.type === 'user.created') {
      const clerkId = event.data?.id;
      if (typeof clerkId === 'string' && clerkId.length > 0) {
        try {
          await pool.query(INSERT_USER_SQL, [clerkId]);
        } catch (error) {
          request.log.error({ err: error }, 'Failed to insert Clerk user');
          return reply.status(500).send({ ok: false, error: 'Failed to persist user' });
        }
      }
    }

    if (event.type === 'user.deleted') {
      request.log.info({ clerkUserId: event.data?.id }, 'Received Clerk user.deleted event');
    }

    return reply.status(200).send({ ok: true });
  });
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
