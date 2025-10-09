import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../lib/http-error.js';

describe('tasks routes', () => {
  it('validates the complete task payload', async () => {
    const { default: router } = await import('./tasks.js');
    const app = express()
      .use(express.json())
      .use(router)
      .use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof HttpError) {
          return res.status(error.status).json({ code: error.code, message: error.message });
        }

        return res.status(500).json({ code: 'internal_error' });
      });

    const invalid = await request(app).post('/tasks/complete').send({ userId: 'bad' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('invalid_request');

    const response = await request(app)
      .post('/tasks/complete')
      .send({
        userId: '4d219c4a-88ed-4b1a-8a0a-5f742b0c2f3d',
        taskId: '8cf3d3f5-4f94-47de-96d2-20bfed5e7d12',
      });

    expect(response.status).toBe(501);
    expect(response.body).toEqual({
      code: 'not_implemented',
      message: 'Task completion tracking is not yet implemented for the reset database.',
    });
  });
});
