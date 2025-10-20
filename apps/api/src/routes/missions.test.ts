import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRegisterMissionHeartbeat, mockVerifyToken } = vi.hoisted(() => ({
  mockRegisterMissionHeartbeat: vi.fn(),
  mockVerifyToken: vi.fn(),
}));

vi.mock('../services/missionsV2Service.js', () => ({
  getMissionBoard: vi.fn(),
  claimMissionReward: vi.fn(),
  linkDailyToHuntMission: vi.fn(),
  registerBossPhase2: vi.fn(),
  registerMissionHeartbeat: mockRegisterMissionHeartbeat,
  rerollMissionSlot: vi.fn(),
  runFortnightlyBossMaintenance: vi.fn(),
  runWeeklyAutoSelection: vi.fn(),
  selectMission: vi.fn(),
}));

vi.mock('../services/auth-service.js', () => ({
  getAuthService: () => ({
    verifyToken: mockVerifyToken,
  }),
  createAuthRepository: vi.fn(),
  createAuthService: vi.fn(),
  resetAuthServiceCache: vi.fn(),
}));

import app from '../app.js';

describe('POST /api/missions/heartbeat', () => {
  beforeEach(() => {
    mockRegisterMissionHeartbeat.mockReset();
    mockVerifyToken.mockReset();
    mockVerifyToken.mockResolvedValue({
      id: 'user-1',
      clerkId: 'clerk-1',
      email: 'user@example.com',
      isNew: false,
    });
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/missions/heartbeat');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      code: 'unauthorized',
      message: 'Authentication required',
    });
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockRegisterMissionHeartbeat).not.toHaveBeenCalled();
  });

  it('validates the request body', async () => {
    const response = await request(app)
      .post('/api/missions/heartbeat')
      .set('Authorization', 'Bearer token')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: 'invalid_request',
      message: 'Invalid heartbeat payload',
    });
    expect(mockRegisterMissionHeartbeat).not.toHaveBeenCalled();
  });

  it('registers a mission heartbeat using missionId', async () => {
    const payload = {
      status: 'ok' as const,
      mission_id: 'mission-123',
      petals_remaining: 3,
      heartbeat_date: '2024-03-25',
    };

    mockRegisterMissionHeartbeat.mockResolvedValue(payload);

    const response = await request(app)
      .post('/api/missions/heartbeat')
      .set('Authorization', 'Bearer token')
      .send({ missionId: 'mission-123' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(mockRegisterMissionHeartbeat).toHaveBeenCalledWith('user-1', 'mission-123');
  });

  it('accepts mission_id payloads for compatibility', async () => {
    const payload = {
      status: 'ok' as const,
      mission_id: 'mission-456',
      petals_remaining: 5,
      heartbeat_date: '2024-03-26',
    };

    mockRegisterMissionHeartbeat.mockResolvedValue(payload);

    const response = await request(app)
      .post('/api/missions/heartbeat')
      .set('Authorization', 'Bearer token')
      .send({ mission_id: 'mission-456' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(payload);
    expect(mockRegisterMissionHeartbeat).toHaveBeenCalledWith('user-1', 'mission-456');
  });

  it('maps service errors to invalid_request responses', async () => {
    mockRegisterMissionHeartbeat.mockRejectedValue(new Error('boom'));

    const response = await request(app)
      .post('/api/missions/heartbeat')
      .set('Authorization', 'Bearer token')
      .send({ missionId: 'mission-789' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'invalid_request',
      message: 'Unable to register mission heartbeat',
    });
  });
});

