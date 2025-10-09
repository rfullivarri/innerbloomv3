import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';

describe('leaderboard routes', () => {
  it('returns defaults when no pagination is provided', async () => {
    const { default: router } = await import('./leaderboard.js');
    const app = express()
      .use(router)
      .use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof HttpError) {
          return res.status(error.status).json({ code: error.code, message: error.message });
        }

        if (error instanceof z.ZodError) {
          return res.status(400).json({ code: 'invalid_request', message: error.errors[0]?.message ?? 'invalid input' });
        }

        return res.status(500).json({ code: 'internal_error' });
      });

    const response = await request(app).get('/leaderboard');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ limit: 10, offset: 0, users: [] });
  });

  it('rejects requests with an excessive limit', async () => {
    const { default: router } = await import('./leaderboard.js');
    const app = express()
      .use(router)
      .use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof HttpError) {
          return res.status(error.status).json({ code: error.code, message: error.message });
        }

        if (error instanceof z.ZodError) {
          return res.status(400).json({ code: 'invalid_request', message: error.errors[0]?.message ?? 'invalid input' });
        }

        return res.status(500).json({ code: 'internal_error' });
      });

    const response = await request(app).get('/leaderboard').query({ limit: 100 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
    expect(response.body.message).toContain('50');
  });
});
