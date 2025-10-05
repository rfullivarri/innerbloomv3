import express from 'express';
import { Webhook } from 'svix';
import { asyncHandler } from '../../lib/async-handler.js';
import {
  mapClerkUserToShadow,
  type ClerkUserPayload,
} from '../../lib/clerk-users.js';
import {
  markShadowUserDeleted,
  upsertShadowUser,
} from '../../services/user-shadow.js';

const router = express.Router();

router.post(
  '/api/webhooks/clerk',
  asyncHandler(async (req, res) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;

    if (!secret) {
      console.error('CLERK_WEBHOOK_SECRET is not configured');
      res.status(500).json({ error: 'Webhook misconfigured' });
      return;
    }

    const svixId = req.get('svix-id');
    const svixTimestamp = req.get('svix-timestamp');
    const svixSignature = req.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: 'Missing Svix signature headers' });
      return;
    }

    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

    const webhook = new Webhook(secret);

    let eventRaw: unknown;
    try {
      eventRaw = webhook.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (error) {
      console.warn('Failed to verify Clerk webhook signature', error);
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = eventRaw as { type: string; data: unknown };

    if (
      event.type !== 'user.created' &&
      event.type !== 'user.updated' &&
      event.type !== 'user.deleted'
    ) {
      res.status(204).send();
      return;
    }

    const data = event.data as ClerkUserPayload;

    if (!data?.id) {
      res.status(400).json({ error: 'Webhook payload missing user id' });
      return;
    }

    if (event.type === 'user.deleted') {
      await markShadowUserDeleted(data.id);
      res.status(204).send();
      return;
    }

    const shadow = mapClerkUserToShadow(data);
    await upsertShadowUser(shadow);

    res.status(204).send();
  }),
);

export default router;
