import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockQuery, mockVerifyToken, mockLinkDailyToHuntMission } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockLinkDailyToHuntMission: vi.fn(),
}));

vi.mock('../db.js', () => ({
  pool: { query: mockQuery },
  dbReady: Promise.resolve(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

vi.mock('../services/missionsV2Service.js', () => ({
  getMissionBoard: vi.fn(),
  claimMissionReward: vi.fn(),
  linkDailyToHuntMission: mockLinkDailyToHuntMission,
  registerBossPhase2: vi.fn(),
  rerollMissionSlot: vi.fn(),
  runFortnightlyBossMaintenance: vi.fn(),
  runWeeklyAutoSelection: vi.fn(),
  selectMission: vi.fn(),
}));

import app from '../app.js';

describe('POST /api/missions/link-daily', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockVerifyToken.mockReset();
    mockLinkDailyToHuntMission.mockReset();
  });

  it('returns 200 when linking succeeds', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'user-1',
      clerkId: 'clerk-1',
      email: 'user@example.com',
      isNew: false,
    });

    const payload = {
      mission_id: 'mission-123',
      task_id: '11111111-2222-4333-8444-555555555555',
    };

    const serviceResponse = {
      board: { slots: [] },
      missionId: payload.mission_id,
      taskId: payload.task_id,
    };

    mockLinkDailyToHuntMission.mockResolvedValue(serviceResponse);

    const response = await request(app)
      .post('/api/missions/link-daily')
      .set('Authorization', 'Bearer token-123')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(serviceResponse);
    expect(mockVerifyToken).toHaveBeenCalledWith('Bearer token-123');
    expect(mockLinkDailyToHuntMission).toHaveBeenCalledWith(
      'user-1',
      payload.mission_id,
      payload.task_id,
    );
  });
});
