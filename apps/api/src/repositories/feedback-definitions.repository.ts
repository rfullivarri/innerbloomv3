import { pool } from '../db.js';

export const DEFAULT_FEEDBACK_DEFINITIONS = [
  {
    notificationKey: 'scheduler_daily_reminder_email',
    label: 'Email recordatorio diario',
    type: 'daily_reminder',
    scope: ['email', 'daily_quest', 'scheduler'],
    trigger: 'Cron /internal/cron/daily-reminders con usuarios activos',
    channel: 'email',
    frequency: 'daily',
    status: 'active',
    priority: 50,
    copy: 'Hola {{user_name}}, tu Daily Quest de {{friendly_date}} ya está lista. Sumá XP registrando tu emoción del día y marcando tus hábitos completados.',
    ctaLabel: 'Abrir Daily Quest',
    ctaHref: 'https://innerbloomjourney.org/dashboard-v3?daily-quest=open',
    previewVariables: {
      user_name: 'Majo',
      friendly_date: 'lunes',
      cta_url: 'https://innerbloomjourney.org/dashboard-v3?daily-quest=open',
    },
    config: {},
  },
  {
    notificationKey: 'taskgen_ai_tasks_confirmation_email',
    label: 'Confirmación: tareas AI listas',
    type: 'taskgen_ai_confirmation',
    scope: ['email', 'taskgen', 'ai_tasks'],
    trigger: 'Cuando se generan tareas AI personalizadas para el usuario',
    channel: 'email',
    frequency: 'event_based',
    status: 'draft',
    priority: 45,
    copy: 'Hola {{user_name}}, generamos tareas personalizadas con AI para tu {{friendly_date}}. Revisá y confirmá para sumarlas a tu Daily Quest.',
    ctaLabel: 'Revisar tareas AI',
    ctaHref: 'https://innerbloomjourney.org/dashboard-v3?ai-tasks=open',
    previewVariables: {
      user_name: 'Majo',
      friendly_date: 'lunes',
      cta_url: 'https://innerbloomjourney.org/dashboard-v3?ai-tasks=open',
    },
    config: { origin: 'taskgen', mode: 'ai' },
  },
  {
    notificationKey: 'inapp_weekly_wrapped_preview',
    label: 'Weekly Wrapped (MVP)',
    type: 'WRAPPED_WEEKLY',
    scope: ['in_app', 'weekly', 'wrapped'],
    trigger: 'Lunes post Daily Quest (pendiente de automatizar)',
    channel: 'in_app_modal',
    frequency: 'weekly',
    status: 'draft',
    priority: 40,
    copy: 'Tus últimos 7 días en Innerbloom están listos. Respirá y recorré tus logros.',
    ctaLabel: 'Ver resumen',
    ctaHref: null,
    previewVariables: {
      user_name: 'Majo',
      week_range: 'últimos 7 días',
    },
    config: { mode: 'preview', dataSource: 'real' },
  },
] as const;

export const DEFAULT_FEEDBACK_DEFINITION = DEFAULT_FEEDBACK_DEFINITIONS[0];

let feedbackDefinitionsReady: Promise<void> | null = null;

async function bootstrapFeedbackDefinitionsSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback_definitions (
      feedback_definition_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      notification_key text NOT NULL UNIQUE,
      label text NOT NULL,
      type text NOT NULL,
      scope text[] NOT NULL DEFAULT ARRAY[]::text[],
      trigger text NOT NULL,
      channel text NOT NULL,
      frequency text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      priority integer NOT NULL DEFAULT 0,
      copy text NOT NULL,
      cta_label text,
      cta_href text,
      preview_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
      config jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE feedback_definitions
      ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS feedback_definitions_notification_key_idx
      ON feedback_definitions (notification_key);
  `);

  for (const seed of DEFAULT_FEEDBACK_DEFINITIONS) {
    await pool.query(
      `
        INSERT INTO feedback_definitions (
          notification_key,
          label,
          type,
          scope,
          trigger,
          channel,
          frequency,
          status,
          priority,
          copy,
          cta_label,
          cta_href,
          preview_variables,
          config
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::text[],
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13::jsonb,
          $14::jsonb
        )
        ON CONFLICT (notification_key) DO NOTHING;
      `,
      [
        seed.notificationKey,
        seed.label,
        seed.type,
        seed.scope,
        seed.trigger,
        seed.channel,
        seed.frequency,
        seed.status,
        seed.priority,
        seed.copy,
        seed.ctaLabel,
        seed.ctaHref,
        JSON.stringify(seed.previewVariables),
        JSON.stringify(seed.config ?? {}),
      ],
    );
  }
}

async function ensureFeedbackDefinitionsReady(): Promise<void> {
  if (!feedbackDefinitionsReady) {
    feedbackDefinitionsReady = bootstrapFeedbackDefinitionsSchema().catch((error) => {
      feedbackDefinitionsReady = null;
      throw error;
    });
  }

  await feedbackDefinitionsReady;
}

export type FeedbackDefinitionRow = {
  feedback_definition_id: string;
  notification_key: string;
  label: string;
  type: string;
  scope: string[];
  trigger: string;
  channel: string;
  frequency: string;
  status: string;
  priority: number;
  copy: string;
  cta_label: string | null;
  cta_href: string | null;
  preview_variables: Record<string, string>;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type FeedbackDefinitionUpdateDbInput = Partial<{
  label: string;
  copy: string;
  trigger: string;
  channel: string;
  frequency: string;
  status: string;
  priority: number;
  scope: string[];
  type: string;
  cta_label: string | null;
  cta_href: string | null;
  config: Record<string, unknown>;
}>;

export async function listFeedbackDefinitionRows(): Promise<FeedbackDefinitionRow[]> {
  await ensureFeedbackDefinitionsReady();
  const result = await pool.query<FeedbackDefinitionRow>(
    `SELECT * FROM feedback_definitions ORDER BY priority DESC, created_at DESC;`,
  );
  return result.rows;
}

export async function updateFeedbackDefinitionRow(
  id: string,
  patch: FeedbackDefinitionUpdateDbInput,
): Promise<FeedbackDefinitionRow | null> {
  await ensureFeedbackDefinitionsReady();
  const assignments: string[] = [];
  const values: unknown[] = [];

  const setColumn = (column: string, value: unknown, cast?: string) => {
    assignments.push(`${column} = $${values.length + 1}${cast ? `::${cast}` : ''}`);
    values.push(value);
  };

  if (typeof patch.label !== 'undefined') {
    setColumn('label', patch.label);
  }
  if (typeof patch.copy !== 'undefined') {
    setColumn('copy', patch.copy);
  }
  if (typeof patch.trigger !== 'undefined') {
    setColumn('trigger', patch.trigger);
  }
  if (typeof patch.channel !== 'undefined') {
    setColumn('channel', patch.channel);
  }
  if (typeof patch.frequency !== 'undefined') {
    setColumn('frequency', patch.frequency);
  }
  if (typeof patch.status !== 'undefined') {
    setColumn('status', patch.status);
  }
  if (typeof patch.priority !== 'undefined') {
    setColumn('priority', patch.priority);
  }
  if (typeof patch.scope !== 'undefined') {
    setColumn('scope', patch.scope, 'text[]');
  }
  if (typeof patch.type !== 'undefined') {
    setColumn('type', patch.type);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'cta_label')) {
    setColumn('cta_label', patch.cta_label);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'cta_href')) {
    setColumn('cta_href', patch.cta_href);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'config')) {
    setColumn('config', JSON.stringify(patch.config ?? {}), 'jsonb');
  }

  if (assignments.length === 0) {
    const lookup = await pool.query<FeedbackDefinitionRow>(
      `SELECT * FROM feedback_definitions WHERE feedback_definition_id = $1 LIMIT 1;`,
      [id],
    );
    return lookup.rows[0] ?? null;
  }

  assignments.push(`updated_at = now()`);

  const result = await pool.query<FeedbackDefinitionRow>(
    `
      UPDATE feedback_definitions
         SET ${assignments.join(', ')}
       WHERE feedback_definition_id = $${values.length + 1}
       RETURNING *;
    `,
    [...values, id],
  );

  return result.rows[0] ?? null;
}

export async function findFeedbackDefinitionByNotificationKey(
  notificationKey: string,
): Promise<FeedbackDefinitionRow | null> {
  await ensureFeedbackDefinitionsReady();
  const result = await pool.query<FeedbackDefinitionRow>(
    `SELECT * FROM feedback_definitions WHERE notification_key = $1 LIMIT 1;`,
    [notificationKey],
  );
  return result.rows[0] ?? null;
}

export async function listActiveInAppFeedbackDefinitions(): Promise<FeedbackDefinitionRow[]> {
  await ensureFeedbackDefinitionsReady();
  const result = await pool.query<FeedbackDefinitionRow>(
    `
      SELECT *
        FROM feedback_definitions
       WHERE channel = 'in_app_popup'
         AND status = 'active'
    ORDER BY priority DESC, created_at DESC;
    `,
  );
  return result.rows;
}
