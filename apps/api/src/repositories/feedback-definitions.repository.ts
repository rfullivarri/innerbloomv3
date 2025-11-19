import { pool } from '../db.js';

const DEFAULT_FEEDBACK_DEFINITION = {
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
  ctaHref: 'https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open',
  previewVariables: {
    user_name: 'Majo',
    friendly_date: 'lunes',
    cta_url: 'https://web-dev-dfa2.up.railway.app/dashboard-v3?daily-quest=open',
  },
} as const;

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
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS feedback_definitions_notification_key_idx
      ON feedback_definitions (notification_key);
  `);

  const seed = DEFAULT_FEEDBACK_DEFINITION;

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
        preview_variables
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
        $13::jsonb
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
    ],
  );
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
