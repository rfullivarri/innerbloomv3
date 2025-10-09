import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('legacy routes', () => {
  it('validates the tasks query parameters', async () => {
    const response = await request(app).get('/api/tasks');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'invalid_request',
      message: 'Invalid query parameters',
    });
  });

  it('returns an empty list for a valid task log query', async () => {
    const response = await request(app)
      .get('/api/task-logs')
      .query({ userId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('rejects invalid task log creation payloads', async () => {
    const response = await request(app).post('/api/task-logs').send({ userId: 'not-a-uuid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'invalid_request',
      message: 'Invalid request body',
    });
  });
});
