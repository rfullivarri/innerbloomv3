import type { NotificationPopupTask } from '../components/feedback/NotificationPopup';

export type NotificationDefinitionLike = {
  notificationKey: string;
  copy: string;
  config: Record<string, unknown>;
  previewVariables?: Record<string, string>;
};

export type LevelNotificationPayload = {
  level: number;
  previousLevel: number;
};

export type StreakNotificationPayload = {
  threshold: number;
  tasks: NotificationPopupTask[];
};

export type FormattedNotification = {
  title: string;
  message: string;
  emoji: string;
  emojiAnimation?: 'bounce' | 'pulse';
  tasks?: NotificationPopupTask[];
};

export function formatLevelNotification(
  definition: NotificationDefinitionLike,
  payload: LevelNotificationPayload,
): FormattedNotification {
  const config = (definition.config ?? {}) as Record<string, unknown>;
  const title = normalizeString(config.title) || definition.copy || '¡Subiste de nivel!';
  const template = normalizeString(config.messageTemplate) || definition.copy || 'Llegaste al nivel {{level}}.';
  const emoji = normalizeString(config.emoji) || '🏆';
  const message = renderTemplate(template, {
    level: String(payload.level),
    previous_level: String(payload.previousLevel),
  });
  return {
    title,
    message,
    emoji,
    emojiAnimation: 'bounce',
  };
}

export function formatStreakNotification(
  definition: NotificationDefinitionLike,
  payload: StreakNotificationPayload,
): FormattedNotification {
  const config = (definition.config ?? {}) as Record<string, unknown>;
  const title = normalizeString(config.title) || 'Racha encendida';
  const singleTemplate = normalizeString(config.singleTemplate) || '🔥 {{taskName}} lleva {{streakDays}} días.';
  const aggregateTemplate =
    normalizeString(config.aggregateTemplate) || '🔥 Tenés {{count}} tareas arriba de {{threshold}} días.';
  const emoji = normalizeString(config.emoji) || '🔥';
  const listMode = normalizeString(config.listMode)?.toLowerCase() as 'single' | 'aggregate' | 'auto' | undefined;
  const shouldGroup = listMode === 'aggregate' || (listMode !== 'single' && payload.tasks.length > 1);
  const template = shouldGroup ? aggregateTemplate : singleTemplate;
  const firstTask = payload.tasks[0];
  const message = renderTemplate(template, {
    taskName: firstTask?.name ?? '',
    streakDays: String(firstTask?.streakDays ?? payload.threshold),
    count: String(payload.tasks.length),
    threshold: String(payload.threshold),
  });
  return {
    title,
    message,
    emoji,
    emojiAnimation: 'pulse',
    tasks: shouldGroup ? payload.tasks : undefined,
  };
}

export function buildPreviewLevelPayload(
  definition: NotificationDefinitionLike,
  overrides: Partial<LevelNotificationPayload> = {},
): LevelNotificationPayload {
  const preview = definition.previewVariables ?? {};
  const level = Math.max(1, overrides.level ?? coerceInteger(preview.level) ?? coerceInteger(preview.current_level) ?? 5);
  const previousCandidate = overrides.previousLevel ?? coerceInteger(preview.previous_level);
  const previousLevel = Math.max(0, Math.min(previousCandidate ?? level - 1, level - 1));
  return { level, previousLevel };
}

export function buildPreviewStreakPayload(
  definition: NotificationDefinitionLike,
  overrides: Partial<StreakNotificationPayload> = {},
): StreakNotificationPayload {
  const preview = definition.previewVariables ?? {};
  const config = definition.config ?? {};
  const threshold = Math.max(
    1,
    overrides.threshold ?? coerceInteger(preview.threshold) ?? coerceInteger(config.threshold) ?? 3,
  );
  const previewTasks = overrides.tasks ?? parsePreviewTasks(preview, threshold);
  const tasks = previewTasks.length > 0 ? previewTasks : buildDefaultPreviewTasks(threshold);
  return { threshold, tasks };
}

export function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/{{(.*?)}}/g, (_, rawKey) => {
    const key = String(rawKey).trim();
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] ?? '' : '';
  });
}

function coerceInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.round(parsed);
    }
  }
  return null;
}

function parsePreviewTasks(
  preview: Record<string, string>,
  fallbackStreak: number,
): NotificationPopupTask[] {
  const jsonKeys = ['tasks_json', 'tasksJson', 'tasks'];
  for (const key of jsonKeys) {
    const raw = preview[key as keyof typeof preview];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item, index) => buildTaskFromPreview(item, index, fallbackStreak))
            .filter((task): task is NotificationPopupTask => Boolean(task));
        }
      } catch {
        // ignore JSON parse errors and try other keys
      }
    }
  }

  const singleName = preview.task_name ?? preview.taskName;
  if (typeof singleName === 'string' && singleName.trim().length > 0) {
    return [
      {
        id: 'preview-task-1',
        name: singleName.trim(),
        streakDays: fallbackStreak,
      },
    ];
  }

  return [];
}

function buildTaskFromPreview(
  item: unknown,
  index: number,
  fallbackStreak: number,
): NotificationPopupTask | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  const rawName = record.name ?? record.task_name ?? record.taskName;
  const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : `Tarea ${index + 1}`;
  const rawId = record.id ?? record.task_id ?? record.taskId ?? `preview-task-${index + 1}`;
  const id = typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : `preview-task-${index + 1}`;
  const streakCandidate = record.streakDays ?? record.streak_days;
  const streakDays = Math.max(1, coerceInteger(streakCandidate) ?? fallbackStreak);
  return { id, name, streakDays };
}

function buildDefaultPreviewTasks(threshold: number): NotificationPopupTask[] {
  return [
    {
      id: 'preview-default-1',
      name: 'Meditación Focus',
      streakDays: threshold,
    },
    {
      id: 'preview-default-2',
      name: 'Respirar 5 minutos',
      streakDays: threshold + 1,
    },
  ];
}
