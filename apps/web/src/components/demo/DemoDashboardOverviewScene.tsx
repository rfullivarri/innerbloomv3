import { useMemo } from 'react';
import { DashboardOverview } from '../../pages/DashboardV3';
import { getDashboardSectionConfig } from '../../pages/dashboardSections';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import type { DailyQuestReadiness } from '../../hooks/useDailyQuestReadiness';
import type { GameMode } from '../../lib/gameMode';

export const DEMO_USER_ID = 'demo-public-user';

export const DEMO_DAILY_QUEST_READINESS: DailyQuestReadiness = {
  hasTasks: true,
  firstTasksConfirmed: true,
  completedFirstDailyQuest: true,
  canOpenDailyQuest: true,
  canShowDailyQuestPopup: true,
  canAutoOpenDailyQuestPopup: false,
  showOnboardingGuidance: false,
  showJourneyPreparing: false,
  tasksStatus: 'success',
  journeyStatus: 'success',
  journey: {
    first_date_log: null,
    days_of_journey: 0,
    quantity_daily_logs: 0,
    first_programmed: true,
    first_tasks_confirmed: true,
    completed_first_daily_quest: true,
  },
  reload: () => undefined,
};

interface DemoDashboardOverviewSceneProps {
  gameMode?: GameMode | string | null;
  onOpenDailyQuest?: () => void;
}

export function DemoDashboardOverviewScene({
  gameMode = 'flow',
  onOpenDailyQuest,
}: DemoDashboardOverviewSceneProps) {
  const { language } = usePostLoginLanguage();
  const overviewSection = useMemo(
    () => getDashboardSectionConfig('dashboard', '/dashboard', language),
    [language],
  );

  return (
    <DashboardOverview
      userId={DEMO_USER_ID}
      gameMode={gameMode}
      avatarProfile={null}
      weeklyTarget={3}
      isJourneyGenerating={false}
      dailyQuestReadiness={DEMO_DAILY_QUEST_READINESS}
      showOnboardingGuidance={false}
      section={overviewSection}
      onOpenReminderScheduler={() => undefined}
      onOpenModerationEdit={() => undefined}
      shouldShowFirstDailyQuestCta={false}
      onOpenDailyQuest={onOpenDailyQuest ?? (() => undefined)}
      showOnboardingCompletionBanner={false}
      onUpgradeAccepted={() => undefined}
    />
  );
}
