import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPoolQuery, mockVerify, VerificationError, createdSecrets } = vi.hoisted(() => ({
  mockPoolQuery: vi.fn(),
  mockVerify: vi.fn(),
  VerificationError: class VerificationError extends Error {},
  createdSecrets: [] as string[],
}));

vi.mock('../db.js', () => ({
  pool: {
    query: mockPoolQuery,
  },
}));

vi.mock('svix', () => ({
  Webhook: class {
    readonly secret: string;

    constructor(secret: string) {
      this.secret = secret;
      createdSecrets.push(secret);
    }

    verify(payload: string, headers: unknown) {
      return mockVerify(payload, headers);
    }
  },
  WebhookVerificationError: VerificationError,
}));

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.resetModules();
    mockPoolQuery.mockReset();
    mockVerify.mockReset();
    createdSecrets.length = 0;
    process.env.CLERK_WEBHOOK_SECRET = 'whsec_test_secret';
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('returns 400 when the Svix signature is invalid', async () => {
    mockVerify.mockImplementation(() => {
      throw new VerificationError('bad signature');
    });

    const app = await createApp();
    const payload = JSON.stringify({ type: 'user.updated', data: { id: 'user_bad' } });

    const response = await request(app)
      .post('/api/webhooks/clerk')
      .set('content-type', 'application/json')
      .set('svix-id', 'test-id')
      .set('svix-timestamp', '12345')
      .set('svix-signature', 'v1,test')
      .send(payload);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'invalid_signature' });
    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it('upserts the user profile on user.created events', async () => {
    const event = {
      type: 'user.created',
      data: {
        id: 'user_123',
        email_addresses: [{ email_address: 'example@example.org' }],
        first_name: ' Example ',
        last_name: null,
        image_url: 'https://img.clerk.com/avatar.png',
        profile_image_url: 'https://fallback.example.com/avatar.png',
      },
    };

    mockVerify.mockReturnValue(event);

    const app = await createApp();
    const payload = JSON.stringify(event);

    const response = await request(app)
      .post('/api/webhooks/clerk')
      .set('content-type', 'application/json')
      .set('svix-id', 'evt-id')
      .set('svix-timestamp', '1111')
      .set('svix-signature', 'v1,sig')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(createdSecrets).toEqual(['whsec_test_secret']);
    expect(mockVerify).toHaveBeenCalledWith(payload, {
      'svix-id': 'evt-id',
      'svix-timestamp': '1111',
      'svix-signature': 'v1,sig',
    });

    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
    expect(mockPoolQuery.mock.calls[0][0]).toContain('ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE');
    expect(mockPoolQuery.mock.calls[1][0]).toContain('INSERT INTO users (clerk_user_id, email, first_name, last_name, avatar_url, deleted_at)');
    expect(mockPoolQuery.mock.calls[1][1]).toEqual([
      'user_123',
      'example@example.org',
      'Example',
      '',
      'https://img.clerk.com/avatar.png',
    ]);
    expect(mockPoolQuery.mock.calls[2][0]).toContain('UPDATE users');
    expect(mockPoolQuery.mock.calls[2][1]).toEqual([
      'user_123',
      'example@example.org',
      'Example',
      'https://img.clerk.com/avatar.png',
    ]);
  });

  it('upserts the user profile on user.updated events', async () => {
    const event = {
      type: 'user.updated',
      data: {
        id: 'user_456',
        email_addresses: [{ email_address: 'updated@example.org' }],
        first_name: null,
        last_name: '  Doe ',
        image_url: null,
        profile_image_url: 'https://cdn.example.com/avatar.png',
      },
    };

    mockVerify.mockReturnValue(event);

    const app = await createApp();
    const payload = JSON.stringify(event);

    const response = await request(app)
      .post('/api/webhooks/clerk')
      .set('content-type', 'application/json')
      .set('svix-id', 'evt-2')
      .set('svix-timestamp', '2222')
      .set('svix-signature', 'v1,sig-2')
      .send(payload);

    expect(response.status).toBe(200);
    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
    expect(mockPoolQuery.mock.calls[1][1]).toEqual([
      'user_456',
      'updated@example.org',
      '',
      'Doe',
      'https://cdn.example.com/avatar.png',
    ]);
    expect(mockPoolQuery.mock.calls[2][1]).toEqual([
      'user_456',
      'updated@example.org',
      'Doe',
      'https://cdn.example.com/avatar.png',
    ]);
  });

  it('soft deletes the user on user.deleted events', async () => {
    const event = {
      type: 'user.deleted',
      data: {
        id: 'user_789',
      },
    };

    mockVerify.mockReturnValue(event);

    const app = await createApp();

    const response = await request(app)
      .post('/api/webhooks/clerk')
      .set('content-type', 'application/json')
      .set('svix-id', 'evt-3')
      .set('svix-timestamp', '3333')
      .set('svix-signature', 'v1,sig-3')
      .send(JSON.stringify(event));

    expect(response.status).toBe(200);
    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
    expect(mockPoolQuery.mock.calls[1][0]).toContain('UPDATE users');
    expect(mockPoolQuery.mock.calls[1][1]).toEqual(['user_789']);
  });
});

async function createApp() {
  const { default: clerkRouter } = await import('./clerk.js');
  const app = express();
  app.use(clerkRouter);
  app.use(express.json());
  return app;
}
