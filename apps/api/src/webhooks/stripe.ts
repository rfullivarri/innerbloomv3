import { Buffer } from 'node:buffer';
import express, { type Request, type Response } from 'express';
import { handleBillingWebhookEvent } from '../modules/billing/billing.service.js';
import { isHttpError } from '../lib/http-error.js';

const router = express.Router();
const rawJson = express.raw({ type: 'application/json' });

router.post('/webhooks/stripe', rawJson, async (req: Request, res: Response) => {
  const signature = req.header('stripe-signature');
  const body = toPayload(req.body);

  try {
    const result = await handleBillingWebhookEvent(signature, body);
    return res.status(200).json(result);
  } catch (error) {
    if (isHttpError(error)) {
      return res.status(error.status).json({
        code: error.code,
        message: error.message,
      });
    }

    return res.status(500).json({
      code: 'billing_webhook_failed',
      message: 'Unable to process billing webhook',
    });
  }
});

function toPayload(body: unknown): unknown {
  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf-8').trim();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return body;
}

export default router;
