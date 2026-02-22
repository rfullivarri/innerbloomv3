import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../lib/http-error.js';
import { mockNext, mockReq, mockRes } from '../tests/test-utils.js';

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
}));

import { requireActiveSubscription } from './require-active-subscription.js';

describe('requireActiveSubscription', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('allows active subscriptions', async () => {
    mockQuery.mockResolvedValue({ rows: [{ status: 'active', grace_ends_at: null }] });

    const req = mockReq({ user: { id: '11111111-2222-3333-4444-555555555555' } }) as Request;
    const res = mockRes() as Response;
    const next = mockNext();

    await requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks canceled subscriptions with standardized code', async () => {
    mockQuery.mockResolvedValue({ rows: [{ status: 'canceled', grace_ends_at: null }] });

    const req = mockReq({ user: { id: '11111111-2222-3333-4444-555555555555' } }) as Request;
    const res = mockRes() as Response;
    const next = mockNext();

    await requireActiveSubscription(req, res, next);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(HttpError);
    if (error instanceof HttpError) {
      expect(error.status).toBe(402);
      expect(error.code).toBe('subscription_inactive');
    }
  });

  it('allows past_due while grace period is still valid', async () => {
    const futureGrace = new Date(Date.now() + 5 * 60_000).toISOString();
    mockQuery.mockResolvedValue({ rows: [{ status: 'past_due', grace_ends_at: futureGrace }] });

    const req = mockReq({ user: { id: '11111111-2222-3333-4444-555555555555' } }) as Request;
    const res = mockRes() as Response;
    const next = mockNext();

    await requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks past_due when grace period expired', async () => {
    const expiredGrace = new Date(Date.now() - 5 * 60_000).toISOString();
    mockQuery.mockResolvedValue({ rows: [{ status: 'past_due', grace_ends_at: expiredGrace }] });

    const req = mockReq({ user: { id: '11111111-2222-3333-4444-555555555555' } }) as Request;
    const res = mockRes() as Response;
    const next = mockNext();

    await requireActiveSubscription(req, res, next);

    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(HttpError);
    if (error instanceof HttpError) {
      expect(error.status).toBe(402);
      expect(error.code).toBe('subscription_inactive');
    }
  });

  it('allows requests when subscription tables are not migrated yet', async () => {
    mockQuery.mockRejectedValue({ code: '42P01', message: 'relation "user_subscriptions" does not exist' });

    const req = mockReq({ user: { id: '11111111-2222-3333-4444-555555555555' } }) as Request;
    const res = mockRes() as Response;
    const next = mockNext();

    await requireActiveSubscription(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
