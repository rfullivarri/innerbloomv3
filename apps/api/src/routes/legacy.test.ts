import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { HttpError } from '../lib/http-error.js';

describe('legacy routes', () => {
  it('validates query params for tasks and task logs', async () => {
    const { default: router } = await import('./legacy.js');
    const app = express()
      .use(express.json())
      .use(router)
      .use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof HttpError) {
          return res.status(error.status).json({ code: error.code, message: error.message });
        }

        return res.status(500).json({ code: 'internal_error' });
      });

    const invalidTasks = await request(app).get('/tasks').query({ userId: 'bad' });
    expect(invalidTasks.status).toBe(400);
    expect(invalidTasks.body.code).toBe('invalid_request');

    const validTasks = await request(app)
      .get('/tasks')
      .query({ userId: '4d219c4a-88ed-4b1a-8a0a-5f742b0c2f3d' });
    expect(validTasks.status).toBe(200);
    expect(validTasks.body).toEqual([]);

    const invalidLogs = await request(app).get('/task-logs').query({ userId: 'nope' });
    expect(invalidLogs.status).toBe(400);

    const validLogs = await request(app)
      .get('/task-logs')
      .query({ userId: '4d219c4a-88ed-4b1a-8a0a-5f742b0c2f3d' });
    expect(validLogs.status).toBe(200);
    expect(validLogs.body).toEqual([]);
  });

  it('validates the body when creating task logs', async () => {
    const { default: router } = await import('./legacy.js');
    const app = express()
      .use(express.json())
      .use(router)
      .use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
        if (error instanceof HttpError) {
          return res.status(error.status).json({ code: error.code, message: error.message });
        }

        return res.status(500).json({ code: 'internal_error' });
      });

    const invalid = await request(app).post('/task-logs').send({ userId: 'bad' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('invalid_request');

    const response = await request(app)
      .post('/task-logs')
      .send({
        userId: '4d219c4a-88ed-4b1a-8a0a-5f742b0c2f3d',
        taskId: '8cf3d3f5-4f94-47de-96d2-20bfed5e7d12',
        doneAt: '2024-05-10T10:00:00Z',
      });

    expect(response.status).toBe(501);
    expect(response.body).toEqual({
      code: 'not_implemented',
      message: 'Legacy task logging is not available for the reset database.',
    });
  });
});
