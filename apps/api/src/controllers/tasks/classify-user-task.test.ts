import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnsureUserExists, mockVerifyToken, mockClassifyTaskForUser } = vi.hoisted(() => ({
  mockEnsureUserExists: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockClassifyTaskForUser: vi.fn(),
}));

vi.mock('../../db.js', () => ({
  pool: {
    query: vi.fn(),
  },
  dbReady: Promise.resolve(),
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
}));

vi.mock('../users/shared.js', () => ({
  ensureUserExists: mockEnsureUserExists,
}));

vi.mock('../../services/task-classification.service.js', () => ({
  classifyTaskForUser: mockClassifyTaskForUser,
}));

vi.mock('../../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

vi.mock('../../middlewares/require-active-subscription.js', () => ({
  requireActiveSubscription: (_req: unknown, _res: unknown, next: (error?: unknown) => void) => next(),
}));

import app from '../../app.js';

const userId = '11111111-2222-3333-4444-555555555555';

describe('POST /api/users/:id/tasks/classify', () => {
  beforeEach(() => {
    mockEnsureUserExists.mockReset();
    mockVerifyToken.mockReset();
    mockClassifyTaskForUser.mockReset();
  });

  it('classifies task and returns pillar/trait metadata', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });
    mockEnsureUserExists.mockResolvedValueOnce(undefined);
    mockClassifyTaskForUser.mockResolvedValueOnce({
      pillar_id: 1,
      trait_id: 4,
      pillar_code: 'BODY',
      pillar_name: 'Body',
      trait_code: 'HEALTH',
      trait_name: 'Health',
      rationale: 'Walking after dinner supports physical wellbeing.',
      confidence: 0.91,
    });

    const response = await request(app)
      .post(`/api/users/${userId}/tasks/classify`)
      .set('Authorization', 'Bearer token')
      .send({ title: 'Caminar 20 minutos después de cenar' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      classification: {
        pillar_id: 1,
        trait_id: 4,
        pillar_code: 'BODY',
        pillar_name: 'Body',
        trait_code: 'HEALTH',
        trait_name: 'Health',
        rationale: 'Walking after dinner supports physical wellbeing.',
        confidence: 0.91,
      },
    });
    expect(mockEnsureUserExists).toHaveBeenCalledWith(userId);
    expect(mockClassifyTaskForUser).toHaveBeenCalledWith({
      userId,
      title: 'Caminar 20 minutos después de cenar',
    });
  });

  it('returns 400 when title is missing', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: userId,
      clerkId: 'user_123',
      email: 'test@example.com',
      isNew: false,
    });

    const response = await request(app)
      .post(`/api/users/${userId}/tasks/classify`)
      .set('Authorization', 'Bearer token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
    expect(mockClassifyTaskForUser).not.toHaveBeenCalled();
  });
});
