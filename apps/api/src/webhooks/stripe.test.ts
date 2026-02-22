import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import stripeWebhookRouter from './stripe.js';

function buildApp() {
  const app = express();
  app.use('/api', stripeWebhookRouter);
  return app;
}

describe('stripe webhook route', () => {
  afterEach(() => {
    delete process.env.BILLING_PROVIDER;
  });

  it('returns mock response by default', async () => {
    const app = buildApp();

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe('mock');
    expect(response.body.received).toBe(true);
  });

  it('returns 501 when stripe provider is configured but not enabled', async () => {
    process.env.BILLING_PROVIDER = 'stripe';
    const app = buildApp();

    const response = await request(app)
      .post('/api/webhooks/stripe')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ type: 'invoice.paid' }));

    expect(response.status).toBe(501);
    expect(response.body.code).toBe('billing_provider_not_ready');
  });
});
