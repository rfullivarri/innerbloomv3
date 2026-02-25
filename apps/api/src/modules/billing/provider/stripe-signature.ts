import crypto from 'node:crypto';
import { HttpError } from '../../../lib/http-error.js';

const DEFAULT_TOLERANCE_SECONDS = 300;

type StripeSignatureParts = {
  timestamp: number;
  signatures: string[];
};

function parseStripeSignatureHeader(value: string): StripeSignatureParts {
  const pieces = value.split(',').map((part) => part.trim()).filter(Boolean);
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const piece of pieces) {
    const [key, val] = piece.split('=', 2);
    if (key === 't' && val) {
      const parsed = Number.parseInt(val, 10);
      if (Number.isFinite(parsed)) {
        timestamp = parsed;
      }
      continue;
    }

    if (key === 'v1' && val) {
      signatures.push(val);
    }
  }

  if (!timestamp || signatures.length === 0) {
    throw new HttpError(400, 'invalid_signature', 'Invalid Stripe signature header');
  }

  return { timestamp, signatures };
}

export function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): void {
  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestamp) > DEFAULT_TOLERANCE_SECONDS) {
    throw new HttpError(400, 'invalid_signature', 'Stripe signature timestamp is outside tolerance');
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const isValid = signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, 'utf8');
    if (candidateBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  });

  if (!isValid) {
    throw new HttpError(400, 'invalid_signature', 'Stripe signature verification failed');
  }
}
