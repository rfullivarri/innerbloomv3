import { pool } from '../db.js';

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
  const result = await pool.query<FeedbackDefinitionRow>(
    `SELECT * FROM feedback_definitions ORDER BY priority DESC, created_at DESC;`,
  );
  return result.rows;
}

export async function updateFeedbackDefinitionRow(
  id: string,
  patch: FeedbackDefinitionUpdateDbInput,
): Promise<FeedbackDefinitionRow | null> {
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
