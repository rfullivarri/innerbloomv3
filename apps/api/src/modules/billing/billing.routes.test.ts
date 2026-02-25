import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { HttpError } from '../../lib/http-error.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearBillingSubscriptionsForTest } from './billing.service.js';

const { authMiddlewareMock } = vi.hoisted(() => ({
  authMiddlewareMock: (req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      id: 'billing-user-1',
      clerkId: 'clerk-billing-user-1',
      email: 'billing@example.com',
      isNew: false,
    };
    next();
  },
}));

vi.mock('../../middlewares/auth-middleware.js', () => ({
  authMiddleware: authMiddlewareMock,
}));

import billingRoutes from './billing.routes.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', billingRoutes);

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    void next;
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'invalid_request' });
    }

    if (error instanceof HttpError) {
      return res.status(error.status).json({ code: error.code, message: error.message });
    }

    return res.status(500).json({ code: 'internal_error' });
  });
  return app;
}

describe('billing.routes', () => {
  beforeEach(() => {
    clearBillingSubscriptionsForTest();
    delete process.env.BILLING_PROVIDER;
  });

  it('returns billing plans', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/billing/plans');

    expect(response.status).toBe(200);
    expect(response.body.plans).toHaveLength(4);
  });

  it('returns default free subscription and allows subscribe/cancel/reactivate flow', async () => {
    const app = buildApp();

    const subscription = await request(app).get('/api/billing/subscription');
    expect(subscription.status).toBe(200);
    expect(subscription.body.subscription.plan).toBe('FREE');

    const subscribe = await request(app).post('/api/billing/subscribe').send({ plan: 'MONTH' });
    expect(subscribe.status).toBe(200);
    expect(subscribe.body.subscription.plan).toBe('MONTH');

    const change = await request(app)
      .post('/api/billing/change-plan')
      .send({ plan: 'SIX_MONTHS', status: 'PAST_DUE' });
    expect(change.status).toBe(200);
    expect(change.body.subscription.status).toBe('PAST_DUE');
    expect(change.body.subscription.gracePeriodEndsAt).toBeTruthy();

    const cancel = await request(app).post('/api/billing/cancel').send({ reason: 'test' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.subscription.status).toBe('CANCELED');

    const reactivate = await request(app).post('/api/billing/reactivate').send({});
    expect(reactivate.status).toBe(200);
    expect(reactivate.body.subscription.status).toBe('ACTIVE');
  });


  it('creates mock checkout and portal sessions', async () => {
    const app = buildApp();

    const checkout = await request(app)
      .post('/api/billing/checkout-session')
      .send({ plan: 'MONTH' });
    expect(checkout.status).toBe(201);
    expect(checkout.body.provider).toBe('mock');
    expect(checkout.body.checkoutUrl).toContain('mock-billing.local');

    const portal = await request(app)
      .post('/api/billing/portal-session')
      .send({ returnUrl: 'https://example.com/account' });
    expect(portal.status).toBe(201);
    expect(portal.body.provider).toBe('mock');
    expect(portal.body.portalUrl).toContain('mock-billing.local');
  });

  it('returns misconfiguration error when stripe provider lacks required env vars', async () => {
    process.env.BILLING_PROVIDER = 'stripe';
    const app = buildApp();

    const checkout = await request(app)
      .post('/api/billing/checkout-session')
      .send({ plan: 'MONTH' });
    expect(checkout.status).toBe(503);
    expect(checkout.body.code).toBe('billing_misconfigured');

    const portal = await request(app).post('/api/billing/portal-session').send({});
    expect(portal.status).toBe(400);
  });

  it('validates subscription payload', async () => {
    const app = buildApp();
    const response = await request(app).post('/api/billing/subscribe').send({ plan: 'FREE' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
  });
});
