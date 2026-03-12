import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockWithClient,
  mockResolveGameModeByCode,
  mockChangeUserGameMode,
} = vi.hoisted(() => ({
  mockWithClient: vi.fn(),
  mockResolveGameModeByCode: vi.fn(),
  mockChangeUserGameMode: vi.fn(),
}));

vi.mock('../middlewares/auth-middleware.js', () => ({
  authMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: '00000000-0000-4000-8000-000000000001' };
    next();
  },
}));

vi.mock('../db.js', () => ({
  withClient: (...args: unknown[]) => mockWithClient(...args),
}));

vi.mock('../services/userGameModeChangeService.js', () => ({
  resolveGameModeByCode: (...args: unknown[]) => mockResolveGameModeByCode(...args),
  changeUserGameMode: (...args: unknown[]) => mockChangeUserGameMode(...args),
}));

describe('game-mode routes', () => {
  let app: express.Express;

  beforeAll(async () => {
    const { default: router } = await import('./game-mode.js');
    app = express();
    app.use(express.json());
    app.use(router);
  });

  beforeEach(() => {
    mockWithClient.mockReset();
    mockResolveGameModeByCode.mockReset();
    mockChangeUserGameMode.mockReset();
    mockWithClient.mockImplementation(async (callback: (client: { query: () => Promise<unknown> }) => Promise<unknown>) => callback({ query: vi.fn() }));
    mockResolveGameModeByCode.mockResolvedValue({ game_mode_id: 13, code: 'FLOW' });
    mockChangeUserGameMode.mockResolvedValue({
      user_id: '00000000-0000-4000-8000-000000000001',
      game_mode_id: 13,
      image_url: '/FlowMood.jpg',
      avatar_url: '/FlowMood.jpg',
    });
  });

  it('changes current user game mode through shared service', async () => {
    const response = await request(app)
      .post('/game-mode/change')
      .send({ mode: 'flow' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(mockResolveGameModeByCode).toHaveBeenCalledWith(expect.anything(), 'FLOW');
    expect(mockChangeUserGameMode).toHaveBeenCalledWith(expect.anything(), {
      userId: '00000000-0000-4000-8000-000000000001',
      nextGameModeId: 13,
      nextModeCode: 'FLOW',
    });
  });

  it('validates required mode payload', async () => {
    const response = await request(app)
      .post('/game-mode/change')
      .send({});

    expect(response.status).toBe(400);
    expect(mockResolveGameModeByCode).not.toHaveBeenCalled();
    expect(mockChangeUserGameMode).not.toHaveBeenCalled();
  });
});
