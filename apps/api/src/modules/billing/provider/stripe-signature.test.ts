import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyStripeSignature } from './stripe-signature.js';

function createHeader(payload: string, secret: string, timestamp: number): string {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');

  return `t=${timestamp},v1=${digest}`;
}

describe('verifyStripeSignature', () => {
  it('accepts valid Stripe signature', () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });
    const secret = 'whsec_test';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = createHeader(payload, secret, timestamp);

    expect(() => verifyStripeSignature(payload, header, secret)).not.toThrow();
  });

  it('rejects invalid Stripe signature', () => {
    const payload = JSON.stringify({ id: 'evt_1', type: 'invoice.paid' });
    const secret = 'whsec_test';
    const timestamp = Math.floor(Date.now() / 1000);
    const header = `t=${timestamp},v1=invalid`;

    expect(() => verifyStripeSignature(payload, header, secret)).toThrowError(/verification failed/i);
  });
});
