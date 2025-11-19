import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTaskgenEvents, recordTaskgenEvent } from '../../services/taskgenTraceService.js';

type QueryRow = { is_admin: boolean | null };

const { mockQuery, authMiddlewareMock, mockTrigger, mockSendEmail } = vi.hoisted(() => ({
  mockQuery: vi.fn<(sql: string, params?: unknown[]) => Promise<{ rows: QueryRow[] }>>(),
  authMiddlewareMock: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & {
      user?: {
        id: string;
        clerkId: string;
        email: string;
        isNew: boolean;
      };
    }).user = {
      id: 'admin-user-id',
      clerkId: 'clerk-admin',
      email: 'admin@example.com',
      isNew: false,
    };
    next();
  },
  mockTrigger: vi.fn(() => 'corr-force'),
  mockSendEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
}));

vi.mock('../../middlewares/auth-middleware.js', () => ({
  authMiddleware: authMiddlewareMock,
}));

vi.mock('../../services/taskgenTriggerService.js', () => ({
  triggerTaskGenerationForUser: mockTrigger,
}));

vi.mock('../../services/email/index.js', () => ({
  getEmailProvider: () => ({
    sendEmail: mockSendEmail,
  }),
}));

import app from '../../app.js';

describe('Admin routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockTrigger.mockClear();
    mockSendEmail.mockClear();
    mockTrigger.mockReturnValue('corr-force');
    clearTaskgenEvents();
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT is_admin FROM users WHERE user_id = $1 LIMIT 1')) {
        return { rows: [{ is_admin: true }] };
      }

      if (sql.includes('UPDATE feedback_definitions')) {
        return {
          rows: [
            {
              feedback_definition_id: 'def-1',
              notification_key: 'scheduler_daily_reminder_email',
              label: 'Email recordatorio diario (updated)',
              type: 'daily_reminder',
              scope: ['email', 'daily_quest'],
              trigger: 'Cron /internal/cron/daily-reminders',
              channel: 'email',
              frequency: 'daily',
              status: 'active',
              priority: 50,
              copy: 'Hola {{user_name}}, tu Daily Quest está lista.',
              cta_label: 'Abrir Daily Quest',
              cta_href: 'https://example.com',
              preview_variables: { user_name: 'Majo' },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as never;
      }

      if (sql.includes('FROM feedback_definitions')) {
        return {
          rows: [
            {
              feedback_definition_id: 'def-1',
              notification_key: 'scheduler_daily_reminder_email',
              label: 'Email recordatorio diario',
              type: 'daily_reminder',
              scope: ['email', 'daily_quest'],
              trigger: 'Cron /internal/cron/daily-reminders',
              channel: 'email',
              frequency: 'daily',
              status: 'active',
              priority: 50,
              copy: 'Hola {{user_name}}, tu Daily Quest está lista.',
              cta_label: 'Abrir Daily Quest',
              cta_href: 'https://example.com',
              preview_variables: { user_name: 'Majo' },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as never;
      }

      if (sql.includes('MAX(last_sent_at) AS last_fired_at')) {
        return {
          rows: [
            {
              last_fired_at: new Date('2024-12-01T12:00:00Z').toISOString(),
              fires_7d: '5',
              fires_30d: '22',
            },
          ],
        } as never;
      }

      if (sql.includes('COUNT(*) AS count') && sql.includes('FROM users u')) {
        return { rows: [{ count: '1' }] };
      }

      if (sql.includes('FROM users u') && sql.includes('ORDER BY u.created_at DESC')) {
        return {
          rows: [
            {
              user_id: 'admin-user-id',
              email_primary: 'admin@example.com',
              full_name: 'Admin User',
              game_mode: 'FLOW',
              game_mode_code: 'FLOW',
              created_at: new Date().toISOString(),
            },
          ],
        };
      }

      if (sql.includes('FROM v_user_total_xp')) {
        return { rows: [{ total_xp: '0' }] };
      }

      if (sql.includes('FROM v_user_level')) {
        return { rows: [{ level: '0', xp_required: '0' }] };
      }

      if (sql.includes('FROM v_user_daily_xp')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_daily_reminders') && sql.includes('JOIN users u ON u.user_id = r.user_id')) {
        return {
          rows: [
            {
              user_daily_reminder_id: 'rem-1',
              user_id: '00000000-0000-4000-8000-000000000001',
              channel: 'email',
              status: 'active',
              timezone: 'UTC',
              local_time: '12:00:00',
              last_sent_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              email_primary: 'admin@example.com',
              email: null,
              first_name: 'Admin',
              full_name: 'Admin User',
              effective_timezone: 'UTC',
            },
          ],
        } as never;
      }

      const isPillarAggregateQuery =
        sql.includes('SUM(COALESCE(dl.quantity') && sql.includes('GROUP BY cp.code');

      if (isPillarAggregateQuery) {
        if (sql.includes('AS xp_total')) {
          return { rows: [{ pillar_code: 'BODY', pillar_name: 'Body', xp_total: '25' }] };
        }

        if (sql.includes('AS xp_week')) {
          return { rows: [{ pillar_code: 'BODY', pillar_name: 'Body', xp_week: '10' }] };
        }

        return { rows: [] };
      }

      if (sql.includes('FROM emotions_logs')) {
        return { rows: [] };
      }

      if (sql.includes('COUNT(*) AS count') && sql.includes('FROM daily_log')) {
        return { rows: [{ count: '1' }] };
      }

      if (sql.includes('FROM daily_log dl') && sql.includes('week_key')) {
        return {
          rows: [
            {
              date: '2024-11-01',
              week_key: '2024-W44',
              task_id: 'task-1',
              task: 'Tarea de prueba',
              quantity: 1,
              pillar_name: 'Body',
              pillar_code: 'BODY',
              trait_name: 'Energía',
              trait_code: 'ENERGIA',
              difficulty_name: 'Baja',
              difficulty_code: 'LOW',
              xp_value: 10,
            },
          ],
        };
      }

      return { rows: [] };
    });
  });

  it('returns a paginated list of users', async () => {
    const response = await request(app).get('/api/admin/users').set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: expect.any(Array),
      page: 1,
      pageSize: expect.any(Number),
      total: expect.any(Number),
    });
  });

  it('validates query parameters', async () => {
    const response = await request(app)
      .get('/api/admin/users/00000000-0000-4000-8000-000000000001/logs')
      .query({ page: 0 })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
  });

  it('exports CSV logs', async () => {
    const response = await request(app)
      .get('/api/admin/users/00000000-0000-4000-8000-000000000001/logs.csv')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/csv');
    expect(response.text.split('\n')[0]).toContain('date');
  });

  it('returns taskgen traces by user id', async () => {
    recordTaskgenEvent({
      level: 'info',
      event: 'TRIGGER_RECEIVED',
      correlationId: '00000000-0000-4000-8000-0000000000aa',
      userId: '00000000-0000-4000-8000-000000000001',
      origin: 'test',
    });

    const response = await request(app)
      .get('/api/admin/taskgen/trace')
      .query({ user_id: '00000000-0000-4000-8000-000000000001' })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(1);
  });

  it('returns taskgen traces by correlation id', async () => {
    recordTaskgenEvent({
      level: 'info',
      event: 'TRIGGER_RECEIVED',
      correlationId: '00000000-0000-4000-8000-0000000000bb',
      userId: '00000000-0000-4000-8000-000000000002',
      origin: 'test',
    });

    const response = await request(app)
      .get('/api/admin/taskgen/trace/by-correlation/00000000-0000-4000-8000-0000000000bb')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.events).toHaveLength(1);
  });

  it('returns global taskgen traces with limit', async () => {
    recordTaskgenEvent({
      level: 'info',
      event: 'TRIGGER_RECEIVED',
      correlationId: '00000000-0000-4000-8000-0000000000cc',
      userId: '00000000-0000-4000-8000-000000000003',
      origin: 'test',
    });

    const response = await request(app)
      .get('/api/admin/taskgen/trace/global')
      .query({ limit: 5 })
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.events.length).toBeGreaterThan(0);
  });

  it('forces a new task generation run', async () => {
    mockTrigger.mockReturnValue('corr-test');

    const response = await request(app)
      .post('/api/admin/taskgen/force-run')
      .set('Authorization', 'Bearer token')
      .send({ user_id: '00000000-0000-4000-8000-000000000001', mode: 'flow' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, correlation_id: 'corr-test' });
    expect(mockTrigger).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000001',
      mode: 'flow',
      origin: 'admin:force-run',
      metadata: { requestedMode: 'flow' },
    });
  });

  it('sends a one-off daily reminder email for testing', async () => {
    const response = await request(app)
      .post('/api/admin/users/00000000-0000-4000-8000-000000000001/daily-reminder/send')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      reminder_id: 'rem-1',
      recipient: 'admin@example.com',
    });
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@example.com' }));
  });

  it('returns feedback definitions with real metrics', async () => {
    const response = await request(app)
      .get('/api/admin/feedback/definitions')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      notificationKey: 'scheduler_daily_reminder_email',
      metrics: { fires7d: 5, fires30d: 22 },
    });
  });

  it('updates a feedback definition', async () => {
    const response = await request(app)
      .patch('/api/admin/feedback/definitions/def-1')
      .set('Authorization', 'Bearer token')
      .send({ label: 'Email recordatorio diario (updated)', scope: ['email'] });

    expect(response.status).toBe(200);
    expect(response.body.item.label).toBe('Email recordatorio diario (updated)');
  });
});
