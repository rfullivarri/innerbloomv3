import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import { Webhook } from 'svix';
import { query } from '../../db/pool.js';
import { HttpError } from '../../lib/http-error.js';

const router = express.Router();

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('CLERK_WEBHOOK_SECRET must be configured');
}

router.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    const svixId = req.get('svix-id');
    const svixTimestamp = req.get('svix-timestamp');
    const svixSignature = req.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      next(new HttpError(400, 'Missing Svix signature headers'));
      return;
    }

    const payload = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    const headers = {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    };

    const webhook = new Webhook(webhookSecret);

    try {
      const event = webhook.verify(payload, headers) as {
        type: string;
        data: {
          id: string;
          email_addresses?: Array<{ id: string; email_address: string }>;
          primary_email_address_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
          image_url?: string | null;
        };
      };

      const { type, data } = event;
      const clerkUserId = data.id;

      if (!clerkUserId) {
        throw new HttpError(400, 'Invalid webhook payload: missing user id');
      }

      if (type === 'user.deleted') {
        await query(
          'UPDATE public.users SET deleted_at = NOW() WHERE clerk_user_id = $1',
          [clerkUserId],
        );

        res.status(204).end();
        return;
      }

      if (type === 'user.created' || type === 'user.updated') {
        const email = data.email_addresses?.find((address) =>
          address.id === data.primary_email_address_id,
        )?.email_address
          ?? data.email_addresses?.[0]?.email_address
          ?? null;

        const fullName = data.full_name
          ?? (([data.first_name, data.last_name].filter(Boolean).join(' ')) || null);
        const imageUrl = data.image_url ?? null;

        await query(
          `
            INSERT INTO public.users (clerk_user_id, email_primary, full_name, image_url)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (clerk_user_id) DO UPDATE SET
              email_primary = COALESCE(EXCLUDED.email_primary, public.users.email_primary),
              full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
              image_url = COALESCE(EXCLUDED.image_url, public.users.image_url),
              deleted_at = NULL;
          `,
          [clerkUserId, email, fullName, imageUrl],
        );

        res.status(204).end();
        return;
      }

      res.status(204).end();
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
        return;
      }

      next(new HttpError(400, 'Invalid webhook signature or payload', error));
    }
  },
);

export default router;
