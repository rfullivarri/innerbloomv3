import { listActiveInAppFeedbackDefinitions } from '../repositories/feedback-definitions.repository.js';

export type InAppFeedbackDefinition = {
  notificationKey: string;
  type: string;
  channel: string;
  priority: number;
  copy: string;
  cta: { label: string; href: string | null } | null;
  previewVariables: Record<string, string>;
  config: Record<string, unknown>;
};

export async function listInAppFeedbackDefinitions(): Promise<InAppFeedbackDefinition[]> {
  const rows = await listActiveInAppFeedbackDefinitions();
  return rows.map((row) => ({
    notificationKey: row.notification_key,
    type: row.type,
    channel: row.channel,
    priority: row.priority,
    copy: row.copy,
    cta: row.cta_label ? { label: row.cta_label, href: row.cta_href } : null,
    previewVariables: row.preview_variables ?? {},
    config: row.config ?? {},
  }));
}
