import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTaskgenEvents, recordTaskgenEvent } from '../../services/taskgenTraceService.js';

type QueryRow = { is_admin: boolean | null };

const { mockQuery, authMiddlewareMock, mockTrigger, mockSendEmail, mockRunSubscriptionJob } = vi.hoisted(() => ({
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
  mockRunSubscriptionJob: vi.fn(async () => ({ attempted: 2, sent: 2, skipped: 0, deduplicated: 0, errors: [] })),
}));

vi.mock('../../db.js', () => ({
  pool: { query: mockQuery },
  runWithDbContext: (_context: string, callback: () => unknown) => callback(),
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

vi.mock('../../services/subscriptionNotificationsJob.js', () => ({
  runSubscriptionNotificationsJob: (...args: unknown[]) => mockRunSubscriptionJob(...args),
}));

import app from '../../app.js';

describe('Admin routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockTrigger.mockClear();
    mockSendEmail.mockClear();
    mockRunSubscriptionJob.mockClear();
    mockTrigger.mockReturnValue('corr-force');
    clearTaskgenEvents();
    mockQuery.mockImplementation(async (sql: string) => {
      const now = new Date();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const shownAt = new Date(now.getTime() - oneDayMs).toISOString();
      const clickedAt = new Date(now.getTime() - 2 * oneDayMs).toISOString();
      const dismissedAt = new Date(now.getTime() - 40 * oneDayMs).toISOString();

      if (sql.includes('CREATE TABLE IF NOT EXISTS feedback_events')) {
        return { rows: [] } as never;
      }

      if (sql.includes('CREATE INDEX IF NOT EXISTS feedback_events_user_id_idx')) {
        return { rows: [] } as never;
      }

      if (sql.includes('CREATE INDEX IF NOT EXISTS feedback_events_created_at_idx')) {
        return { rows: [] } as never;
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS feedback_user_notification_states')) {
        return { rows: [] } as never;
      }

      if (sql.includes('CREATE INDEX IF NOT EXISTS feedback_user_notification_states_user_idx')) {
        return { rows: [] } as never;
      }

      if (sql.includes('SELECT is_admin FROM users WHERE user_id = $1 LIMIT 1')) {
        return { rows: [{ is_admin: true }] };
      }

      if (sql.includes('SELECT 1 FROM users WHERE user_id = $1 LIMIT 1')) {
        return { rowCount: 1, rows: [{ '?column?': 1 }] } as never;
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
            {
              feedback_definition_id: 'def-2',
              notification_key: 'inapp_weekly_wrapped_preview',
              label: 'Weekly Wrapped (MVP)',
              type: 'WRAPPED_WEEKLY',
              scope: ['in_app', 'weekly'],
              trigger: 'Lunes post Daily Quest (pendiente de automatizar)',
              channel: 'in_app_modal',
              frequency: 'weekly',
              status: 'draft',
              priority: 40,
              copy: 'Tus últimos 7 días en Innerbloom están listos. Respirá y recorré tus logros.',
              cta_label: 'Ver resumen',
              cta_href: null,
              preview_variables: { user_name: 'Majo', week_range: 'últimos 7 días' },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              config: { mode: 'preview', dataSource: 'real' },
            },
          ],
        } as never;
      }

      if (sql.includes('FROM feedback_user_notification_states WHERE user_id')) {
        return { rows: [] } as never;
      }

      if (sql.includes('FROM users u') && sql.includes('LEFT JOIN cat_game_mode gm')) {
        return {
          rows: [
            {
              user_id: '00000000-0000-4000-8000-000000000001',
              email_primary: 'admin@example.com',
              full_name: 'Admin User',
              game_mode_code: 'FLOW',
              level: '1',
              last_seen_at: new Date().toISOString(),
            },
          ],
        } as never;
      }

      if (sql.includes('DISTINCT ON (notification_key)') && sql.includes('FROM feedback_events')) {
        return {
          rows: [
            {
              notification_key: 'scheduler_daily_reminder_email',
              action: 'clicked',
              created_at: clickedAt,
            },
            {
              notification_key: 'inapp_weekly_wrapped_preview',
              action: 'dismissed',
              created_at: dismissedAt,
            },
          ],
        } as never;
      }

      if (
        sql.includes('SELECT notification_key, MAX(created_at) AS last_shown_at') &&
        sql.includes('FROM feedback_events')
      ) {
        return {
          rows: [
            {
              notification_key: 'scheduler_daily_reminder_email',
              last_shown_at: shownAt,
            },
          ],
        } as never;
      }

      if (sql.includes('FROM feedback_events') && sql.includes('ORDER BY created_at DESC')) {
        return {
          rows: [
            {
              event_id: 'evt-3',
              user_id: '00000000-0000-4000-8000-000000000001',
              notification_key: 'scheduler_daily_reminder_email',
              action: 'shown',
              is_critical_moment: false,
              critical_tag: null,
              created_at: shownAt,
            },
            {
              event_id: 'evt-2',
              user_id: '00000000-0000-4000-8000-000000000001',
              notification_key: 'scheduler_daily_reminder_email',
              action: 'clicked',
              is_critical_moment: true,
              critical_tag: 'daily_quest',
              created_at: clickedAt,
            },
            {
              event_id: 'evt-1',
              user_id: '00000000-0000-4000-8000-000000000001',
              notification_key: 'inapp_weekly_wrapped_preview',
              action: 'dismissed',
              is_critical_moment: false,
              critical_tag: null,
              created_at: dismissedAt,
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


  it('allows admin to assign and remove superuser access', async () => {
    const enableResponse = await request(app)
      .patch('/api/admin/users/00000000-0000-4000-8000-000000000001/superuser')
      .set('Authorization', 'Bearer token')
      .send({ enabled: true });

    expect(enableResponse.status).toBe(200);
    expect(enableResponse.body).toEqual({
      ok: true,
      userId: '00000000-0000-4000-8000-000000000001',
      subscription: { planCode: 'SUPERUSER', status: 'superuser' },
    });

    const disableResponse = await request(app)
      .patch('/api/admin/users/00000000-0000-4000-8000-000000000001/superuser')
      .set('Authorization', 'Bearer token')
      .send({ enabled: false });

    expect(disableResponse.status).toBe(200);
    expect(disableResponse.body).toEqual({
      ok: true,
      userId: '00000000-0000-4000-8000-000000000001',
      subscription: { planCode: 'FREE', status: 'active' },
    });
  });

  it('runs subscription notifications job from admin endpoint', async () => {
    const response = await request(app)
      .post('/api/admin/subscription-notifications/run')
      .set('Authorization', 'Bearer token')
      .send({ runAt: '2026-03-01T10:00:00Z' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, attempted: 2, sent: 2, skipped: 0, deduplicated: 0, errors: [] });
    expect(mockRunSubscriptionJob).toHaveBeenCalledTimes(1);
  });

  it('returns feedback definitions with real metrics', async () => {
    const response = await request(app)
      .get('/api/admin/feedback/definitions')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    expect(response.body.items[0]).toMatchObject({
      notificationKey: 'scheduler_daily_reminder_email',
      metrics: { fires7d: 5, fires30d: 22 },
    });
    expect(
      response.body.items.some((item: { type: string }) => item.type === 'WRAPPED_WEEKLY')
    ).toBe(true);
  });

  it('returns feedback history with summary', async () => {
    const response = await request(app)
      .get('/api/admin/feedback/users/00000000-0000-4000-8000-000000000001/history')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual({
      notifsShownLast7d: 1,
      notifsClickedLast7d: 1,
      notifsCriticalLast30d: 1,
      clickRateLast30d: 1,
    });
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0]).toMatchObject({
      notificationKey: 'scheduler_daily_reminder_email',
      action: 'shown',
    });
    expect(response.body.items[1]).toMatchObject({
      notificationKey: 'scheduler_daily_reminder_email',
      action: 'clicked',
      isCriticalMoment: true,
      criticalTag: 'daily_quest',
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
