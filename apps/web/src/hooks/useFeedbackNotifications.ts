import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubmitDailyQuestResponse, SubmitDailyQuestFeedbackEvent } from '../lib/api';
import { fetchInAppNotifications, type InAppNotificationDefinition } from '../lib/api/notifications';
import type { NotificationPopupTask } from '../components/feedback/NotificationPopup';
import { formatLevelNotification, formatStreakNotification } from '../lib/notifications';
import { emitFeedbackNotificationEvent } from '../lib/telemetry';

const STREAK_MILESTONES = [3, 5, 7];

type PopupDescriptor = {
  id: number;
  title: string;
  message: string;
  emoji: string;
  cta: { label: string; href: string | null } | null;
  tasks?: NotificationPopupTask[];
  emojiAnimation?: 'bounce' | 'pulse';
  telemetry?: { event: 'notification_level_up_shown' | 'notification_streak_shown'; payload: Record<string, unknown> };
};

export function useFeedbackNotifications({
  userId,
  enabled,
}: {
  userId?: string | null;
  enabled: boolean;
}) {
  const [definitions, setDefinitions] = useState<InAppNotificationDefinition[]>([]);
  const [pendingEvents, setPendingEvents] = useState<SubmitDailyQuestFeedbackEvent[]>([]);
  const [queue, setQueue] = useState<PopupDescriptor[]>([]);
  const loggedTelemetryRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) {
      setDefinitions([]);
      return;
    }
    let cancelled = false;
    fetchInAppNotifications()
      .then((response) => {
        if (!cancelled) {
          setDefinitions(response.items ?? []);
        }
      })
      .catch((error) => {
        console.warn('[feedback] failed to load in-app notifications', error);
        if (!cancelled) {
          setDefinitions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const definitionMap = useMemo(() => {
    return new Map(definitions.map((definition) => [definition.notificationKey, definition]));
  }, [definitions]);

  useEffect(() => {
    if (!definitionMap.size || pendingEvents.length === 0) {
      return;
    }
    setQueue((current) => [...current, ...buildPopups(pendingEvents, definitionMap)]);
    setPendingEvents([]);
  }, [definitionMap, pendingEvents]);

  const handleDailyQuestResult = useCallback((response: SubmitDailyQuestResponse | null | undefined) => {
    if (!response?.feedback_events || response.feedback_events.length === 0) {
      return;
    }
    setPendingEvents((current) => [...current, ...response.feedback_events!]);
  }, []);

  const activePopup = queue[0] ?? null;

  const dismissActivePopup = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  useEffect(() => {
    if (!activePopup || !activePopup.telemetry) {
      return;
    }
    if (loggedTelemetryRef.current.has(activePopup.id)) {
      return;
    }
    emitFeedbackNotificationEvent(activePopup.telemetry.event, {
      userId: userId ?? undefined,
      ...activePopup.telemetry.payload,
    });
    loggedTelemetryRef.current.add(activePopup.id);
  }, [activePopup, userId]);

  return {
    activePopup,
    dismissActivePopup,
    handleDailyQuestResult,
  };
}

function buildPopups(
  events: SubmitDailyQuestFeedbackEvent[],
  definitionMap: Map<string, InAppNotificationDefinition>,
): PopupDescriptor[] {
  return events
    .map((event) => {
      const definition =
        definitionMap.get(event.notificationKey) ?? createFallbackDefinition(event.notificationKey, event.type);
      if (event.type === 'level_up') {
        return buildLevelPopup(definition, event);
      }
      if (event.type === 'streak_milestone') {
        if (!STREAK_MILESTONES.includes(event.payload.threshold)) {
          return null;
        }
        return buildStreakPopup(definition, event);
      }
      return null;
    })
    .filter((descriptor): descriptor is PopupDescriptor => Boolean(descriptor));
}

function buildLevelPopup(
  definition: InAppNotificationDefinition,
  event: Extract<SubmitDailyQuestFeedbackEvent, { type: 'level_up' }>,
): PopupDescriptor {
  const formatted = formatLevelNotification(definition, event.payload);
  return {
    ...createBaseDescriptor(definition, formatted),
    telemetry: {
      event: 'notification_level_up_shown',
      payload: {
        notificationKey: definition.notificationKey,
        level: event.payload.level,
        previousLevel: event.payload.previousLevel,
      },
    },
  };
}

function buildStreakPopup(
  definition: InAppNotificationDefinition,
  event: Extract<SubmitDailyQuestFeedbackEvent, { type: 'streak_milestone' }>,
): PopupDescriptor {
  const formatted = formatStreakNotification(definition, {
    threshold: event.payload.threshold,
    tasks: event.payload.tasks,
  });
  return {
    ...createBaseDescriptor(definition, formatted),
    telemetry: {
      event: 'notification_streak_shown',
      payload: {
        notificationKey: definition.notificationKey,
        tasksCount: event.payload.tasks.length,
        threshold: event.payload.threshold,
      },
    },
  };
}

function createBaseDescriptor(
  definition: InAppNotificationDefinition,
  formatted: ReturnType<typeof formatLevelNotification>,
): PopupDescriptor {
  return {
    id: Date.now() + Math.random(),
    title: formatted.title,
    message: formatted.message,
    emoji: formatted.emoji,
    emojiAnimation: formatted.emojiAnimation,
    cta: definition.cta ?? null,
    tasks: formatted.tasks,
  };
}

function createFallbackDefinition(notificationKey: string, type: SubmitDailyQuestFeedbackEvent['type']): InAppNotificationDefinition {
  return {
    notificationKey,
    type,
    channel: 'in_app',
    priority: 1,
    copy: '',
    cta: null,
    previewVariables: {},
    config: {},
  };
}
