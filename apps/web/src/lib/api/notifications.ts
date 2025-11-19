import { apiAuthorizedGet } from '../api';

export type InAppNotificationDefinition = {
  notificationKey: string;
  type: string;
  channel: string;
  priority: number;
  copy: string;
  cta: { label: string; href: string | null } | null;
  previewVariables: Record<string, string>;
  config: Record<string, unknown>;
};

export async function fetchInAppNotifications() {
  return apiAuthorizedGet<{ items: InAppNotificationDefinition[] }>('/feedback/in-app');
}
