import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('POST /api/tasks/complete', () => {
  it('returns 400 when the body is invalid', async () => {
    const response = await request(app).post('/api/tasks/complete').send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'invalid_request',
      message: 'Invalid request body',
    });
  });

  it('responds with not implemented for valid payloads', async () => {
    const response = await request(app)
      .post('/api/tasks/complete')
      .send({
        userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        taskId: '11111111-2222-3333-4444-555555555555',
      });

    expect(response.status).toBe(501);
    expect(response.body).toEqual({
      code: 'not_implemented',
      message: 'Task completion tracking is not yet implemented for the reset database.',
    });
  });
});
