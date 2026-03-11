import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTaskgenEvents, recordTaskgenEvent } from '../../services/taskgenTraceService.js';

type QueryRow = { is_admin: boolean | null };

const {
  mockQuery,
  authMiddlewareMock,
  mockTrigger,
  mockSendEmail,
  mockRunSubscriptionJob,
  mockRunModeUpgradeAggregation,
  mockRunMonthlyCalibrationForUser,
  mockResolveModeByCode,
  mockResolveModeById,
  mockChangeUserGameMode,
} = vi.hoisted(() => ({
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
  mockRunModeUpgradeAggregation: vi.fn(async () => ({
    periodKey: '2026-02',
    periodStart: '2026-02-01',
    nextPeriodStart: '2026-03-01',
    scope: 'all_users',
    processed: 3,
    persisted: 3,
  })),
  mockRunMonthlyCalibrationForUser: vi.fn(async () => ({
    evaluated: 3,
    adjusted: 1,
    skipped: 0,
    ignored: 0,
    actionBreakdown: { up: 1, keep: 1, down: 1 },
    errors: [],
  })),
  mockResolveModeByCode: vi.fn(async (_client: unknown, modeCode: string) => ({
    game_mode_id: modeCode === 'LOW' ? 1 : modeCode === 'CHILL' ? 2 : modeCode === 'FLOW' ? 3 : 4,
    code: modeCode,
  })),
  mockResolveModeById: vi.fn(async (_client: unknown, modeId: number) => ({
    game_mode_id: modeId,
    code: modeId === 1 ? 'LOW' : modeId === 2 ? 'CHILL' : modeId === 3 ? 'FLOW' : 'EVOLVE',
  })),
  mockChangeUserGameMode: vi.fn(async () => ({
    user_id: '00000000-0000-4000-8000-000000000001',
    game_mode_id: 4,
    image_url: '/Evolve-Mood.jpg',
    avatar_url: '/Evolve-Mood.jpg',
  })),
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

vi.mock('../../services/modeUpgradeMonthlyAggregationService.js', () => ({
  runUserMonthlyModeUpgradeAggregation: (...args: unknown[]) => mockRunModeUpgradeAggregation(...args),
}));

vi.mock('../../services/userGameModeChangeService.js', () => ({
  resolveGameModeByCode: (...args: unknown[]) => mockResolveModeByCode(...args),
  resolveGameModeById: (...args: unknown[]) => mockResolveModeById(...args),
  changeUserGameMode: (...args: unknown[]) => mockChangeUserGameMode(...args),
}));

vi.mock('../../services/taskDifficultyCalibrationService.js', () => ({
  runAdminTaskDifficultyCalibration: vi.fn(async () => ({
    evaluated: 0,
    adjusted: 0,
    skipped: 0,
    ignored: 0,
    actionBreakdown: { up: 0, keep: 0, down: 0 },
    errors: [],
  })),
  runMonthlyTaskDifficultyCalibrationForUser: (...args: unknown[]) => mockRunMonthlyCalibrationForUser(...args),
}));

import app from '../../app.js';

describe('Admin routes', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    mockTrigger.mockClear();
    mockSendEmail.mockClear();
    mockRunSubscriptionJob.mockClear();
    mockRunModeUpgradeAggregation.mockClear();
    mockRunMonthlyCalibrationForUser.mockClear();
    mockResolveModeByCode.mockClear();
    mockResolveModeById.mockClear();
    mockChangeUserGameMode.mockClear();
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



      if (sql.includes('SELECT user_id FROM users WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1')) {
        return { rows: [{ user_id: '00000000-0000-4000-8000-000000000001' }] } as never;
      }

      if (sql.includes('SELECT u.user_id, u.email_primary, u.full_name') && sql.includes('WHERE u.user_id = $1')) {
        return {
          rows: [
            {
              user_id: '00000000-0000-4000-8000-000000000001',
              email_primary: 'admin@example.com',
              full_name: 'Admin User',
            },
          ],
        } as never;
      }

      if (sql.includes('FROM user_subscriptions') && sql.includes('ORDER BY updated_at DESC')) {
        return {
          rows: [
            {
              user_subscription_id: 'sub-1',
              plan_code: 'MONTH',
              status: 'active',
              trial_ends_at: null,
              current_period_ends_at: new Date().toISOString(),
              grace_ends_at: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
          ],
        } as never;
      }

      if (sql.includes('FROM subscription_plans') && sql.includes('ORDER BY active DESC')) {
        return {
          rows: [
            { plan_code: 'FREE', name: 'Free', active: true },
            { plan_code: 'MONTH', name: 'Monthly', active: true },
            { plan_code: 'SUPERUSER', name: 'Superuser', active: true },
          ],
        } as never;
      }

      if (sql.includes('FROM subscription_plans') && sql.includes('WHERE plan_code = $1')) {
        return { rows: [{ plan_code: 'SUPERUSER', name: 'Superuser', active: true }] } as never;
      }

      if (sql.includes('INSERT INTO user_subscriptions')) {
        return {
          rows: [
            {
              user_subscription_id: 'sub-2',
              plan_code: 'SUPERUSER',
              status: 'active',
              trial_ends_at: null,
              current_period_ends_at: null,
              grace_ends_at: null,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
          ],
        } as never;
      }

      if (sql.includes('SELECT u.user_id,') && sql.includes('gm.code AS current_mode') && sql.includes('WHERE u.user_id = $1::uuid')) {
        return {
          rows: [
            {
              user_id: '00000000-0000-4000-8000-000000000001',
              game_mode_id: 3,
              current_mode: 'FLOW',
              current_weekly_target: 5,
            },
          ],
        } as never;
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

      if (sql.includes('FROM tasks t') && sql.includes('t.active = TRUE')) {
        return {
          rows: [
            { task_id: 'task-1', task_name: 'Dormir 8h', created_at: '2025-01-01T00:00:00.000Z' },
            { task_id: 'task-2', task_name: 'Minoxidil', created_at: '2025-01-01T00:00:00.000Z' },
          ],
        } as never;
      }

      if (sql.includes('COALESCE(SUM(dl.quantity), 0)::int AS actual_count') && sql.includes('GROUP BY dl.task_id')) {
        return {
          rows: [
            { task_id: 'task-1', actual_count: 22 },
            { task_id: 'task-2', actual_count: 8 },
          ],
        } as never;
      }

      if (sql.includes('FROM user_game_mode_history h') && sql.includes('gm.weekly_target')) {
        return {
          rows: [
            {
              game_mode_id: 2,
              effective_at: '2026-02-10T00:00:00.000Z',
              mode_code: 'CHILL',
              weekly_target: 4,
            },
            {
              game_mode_id: 3,
              effective_at: '2026-02-20T00:00:00.000Z',
              mode_code: 'FLOW',
              weekly_target: 7,
            },
          ],
        } as never;
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


  it('runs subscription notifications job from admin endpoint', async () => {
    const response = await request(app)
      .post('/api/admin/subscription-notifications/run')
      .set('Authorization', 'Bearer token')
      .send({ runAt: '2026-03-01T10:00:00Z' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, attempted: 2, sent: 2, skipped: 0, deduplicated: 0, errors: [] });
    expect(mockRunSubscriptionJob).toHaveBeenCalledTimes(1);
  });


  it('returns selected user subscription from admin endpoint', async () => {
    const response = await request(app)
      .get('/api/admin/users/00000000-0000-4000-8000-000000000001/subscription')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('admin@example.com');
    expect(response.body.subscription).toMatchObject({
      planCode: 'MONTH',
      status: 'active',
      isSuperuser: false,
    });
    expect(response.body.availablePlans.length).toBeGreaterThan(0);
  });

  it('updates selected user subscription from admin endpoint', async () => {
    const response = await request(app)
      .put('/api/admin/users/00000000-0000-4000-8000-000000000001/subscription')
      .set('Authorization', 'Bearer token')
      .send({ planCode: 'SUPERUSER', status: 'active' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.subscription).toMatchObject({
      planCode: 'SUPERUSER',
      status: 'active',
      isSuperuser: true,
      isBillingExempt: true,
    });
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


  it('returns mode upgrade analysis for an admin user', async () => {
    const response = await request(app)
      .get('/api/admin/user/00000000-0000-4000-8000-000000000001/mode-upgrade-analysis')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      has_analysis: true,
      analysis_window_days: 30,
      analysis_basis: 'rolling_30_days',
      current_mode: 'FLOW',
      next_mode: 'EVOLVE',
      tasks_total_evaluated: 2,
      tasks_meeting_goal: 1,
      threshold: 0.8,
      missing_tasks: 1,
      eligible_for_upgrade: false,
      cta_enabled: false,
    });
    expect(response.body.task_pass_rate).toBeCloseTo(0.5, 4);
    expect(response.body.tasks).toHaveLength(2);
    expect(response.body.tasks[0]).toMatchObject({
      task_id: 'task-1',
      actual_count: 22,
      meets_goal: true,
    });
  });

  it('manually changes user mode by targetModeKey', async () => {
    const response = await request(app)
      .post('/api/admin/user/00000000-0000-4000-8000-000000000001/game-mode')
      .set('Authorization', 'Bearer token')
      .send({ targetModeKey: 'EVOLVE', reason: 'admin_test' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      userId: '00000000-0000-4000-8000-000000000001',
      game_mode_code: 'EVOLVE',
      reason: 'admin_test',
    });
    expect(mockResolveModeByCode).toHaveBeenCalled();
    expect(mockChangeUserGameMode).toHaveBeenCalled();
  });

  it('runs rolling mode upgrade analysis from admin endpoint', async () => {
    const response = await request(app)
      .post('/api/admin/user/00000000-0000-4000-8000-000000000001/mode-upgrade-analysis/run')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      source: 'admin_manual_rolling_mode_upgrade_analysis',
      current_mode: 'FLOW',
      next_mode: 'EVOLVE',
      tasks_total_evaluated: 2,
    });
  });

  it('runs monthly review for a user from admin endpoint', async () => {
    mockRunModeUpgradeAggregation.mockResolvedValueOnce({
      periodKey: '2026-02',
      periodStart: '2026-02-01',
      nextPeriodStart: '2026-03-01',
      scope: 'single_user',
      processed: 1,
      persisted: 1,
    });

    const response = await request(app)
      .post('/api/admin/user/00000000-0000-4000-8000-000000000001/run-monthly-review')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      source: 'admin_manual_monthly_review',
      userId: '00000000-0000-4000-8000-000000000001',
      period_key: '2026-02',
      scope: 'single_user',
      processed: 1,
      persisted: 1,
    });
    expect(mockRunMonthlyCalibrationForUser).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000001',
      now: expect.any(Date),
    });
    expect(mockRunModeUpgradeAggregation).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000001',
      now: expect.any(Date),
    });
  });

  it('runs mode upgrade monthly aggregation for a custom period', async () => {
    mockRunModeUpgradeAggregation.mockResolvedValueOnce({
      periodKey: '2026-01',
      periodStart: '2026-01-01',
      nextPeriodStart: '2026-02-01',
      scope: 'single_user',
      processed: 1,
      persisted: 1,
    });

    const response = await request(app)
      .post('/api/admin/mode-upgrade-aggregation/run')
      .set('Authorization', 'Bearer token')
      .send({ userId: '00000000-0000-4000-8000-000000000001', period_key: '2026-01' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      source: 'monthly_mode_upgrade_aggregation',
      userId: '00000000-0000-4000-8000-000000000001',
      period_key: '2026-01',
      period_start: '2026-01-01',
      next_period_start: '2026-02-01',
      scope: 'single_user',
      processed: 1,
      persisted: 1,
    });
    expect(mockRunModeUpgradeAggregation).toHaveBeenCalledWith({
      userId: '00000000-0000-4000-8000-000000000001',
      periodKey: '2026-01',
    });
  });
});
