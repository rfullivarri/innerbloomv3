export type PremiumVariantStatus = 'extracted-lab-variant' | 'inline-lab-implementation' | 'planned-extraction';

export type PremiumFeatureMapEntry = {
  feature: string;
  productionComponent: string;
  productionDataSources: string[];
  premiumVariant: string;
  premiumRepresentation: string;
  mustPreserve: string[];
  status: PremiumVariantStatus;
  notes?: string;
};

export const premiumFeatureMap: PremiumFeatureMapEntry[] = [
  {
    feature: 'Dashboard',
    productionComponent: 'apps/web/src/pages/DashboardV3.tsx',
    productionDataSources: [
      'getUserStreakPanel',
      'getEmotions',
      'getUserDailyEnergy',
      'getUserLevel',
      'getUserXpByTrait',
    ],
    premiumVariant: 'PremiumDashboard',
    premiumRepresentation:
      'Ocean-of-one-centimeter mobile summary with DQuest hero, overview highlights, 15-day emotion summary, compact balance radar, daily energy, and links to expanded Labs screens.',
    mustPreserve: [
      'Dashboard as summary, not admin',
      'overview links to expanded vision',
      'emotion summary links to Emotion Chart',
      'balance summary links to Balance',
      'Daily Energy semantics',
      'real streak/emotion/energy/level/balance data when available',
    ],
    status: 'extracted-lab-variant',
    notes: 'Implemented as PremiumDashboard.tsx inside Labs. It keeps DashboardV3 untouched and maps every block to existing data sources or Labs fallback.',
  },
  {
    feature: 'StreaksPanel / Tasks',
    productionComponent: 'apps/web/src/components/dashboard-v3/StreaksPanel.tsx',
    productionDataSources: [
      'useRequest',
      'getUserStreakPanel',
      'StreakPanelResponse',
      'StreakPanelTask',
      'gameMode',
      'weeklyTarget',
    ],
    premiumVariant: 'PremiumStreaksPanel / PremiumTasksScreen',
    premiumRepresentation:
      'Compact mobile task rows with trait icon, task identity, difficulty, compact S1-S5 month weeks, weeklyDone/weeklyGoal progress ring, streak, and chevron.',
    mustPreserve: [
      'weeklyDone/weeklyGoal',
      'metrics.month.weeks',
      'streakDays',
      'difficultyLabel',
      'latestRecalibrationAction',
      'achievementSealVisible',
      'lifecycleStatus',
      'pillar/range semantics',
    ],
    status: 'extracted-lab-variant',
    notes: 'Implemented as PremiumTasksScreen.tsx inside Labs. It maps StreaksPanel weekly progress to a compact ring and month weeks to S1-S5 mini bars without modifying StreaksPanel.',
  },
  {
    feature: 'Daily Quest',
    productionComponent: 'apps/web/src/components/DailyQuestModal.tsx',
    productionDataSources: [
      'getDailyQuestStatus',
      'getDailyQuestDefinition',
      'getModerationState',
      'submitDailyQuest',
      'updateModerationStatus',
      'useRequest',
    ],
    premiumVariant: 'PremiumDailyQuest',
    premiumRepresentation:
      'Retrospective flow with emotion choice, moderation row, circular checklist controls, GP total, and confirm/later actions.',
    mustPreserve: [
      'emotion selection',
      'task completion selection',
      'moderation active state',
      'GP calculation and submit payload',
      'confirm/snooze flow',
      'retrospective language',
    ],
    status: 'extracted-lab-variant',
    notes: 'Implemented as PremiumDailyQuest.tsx inside Labs. It keeps DailyQuestModal data/actions and adjusts mobile proportions without modifying the original modal.',
  },
  {
    feature: 'Rewards / Logros',
    productionComponent: 'apps/web/src/components/dashboard-v3/RewardsSection.tsx',
    productionDataSources: [
      'getRewardsHistory',
      'getTaskInsights',
      'decideTaskHabitAchievement',
      'toggleTaskHabitAchievementMaintained',
      'useCarouselSelection',
      'HabitAchievementSeal',
    ],
    premiumVariant: 'PremiumRewardsSection',
    premiumRepresentation:
      'Premium achievements shelf/carousel using real seals, pending review, automatic difficulty calibration, Weekly Wrapped, Monthly Wrapped, and flip detail behavior.',
    mustPreserve: [
      'real seal assets',
      'achieved vs locked states',
      'pending review',
      'shareable seals',
      'Automatic difficulty calibration summary',
      'Weekly Wrapped semantics',
      'Monthly Wrapped semantics',
      'flip card behavior',
    ],
    status: 'extracted-lab-variant',
    notes: 'Implemented as PremiumRewardsSection.tsx inside Labs. It reuses getRewardsHistory and HabitAchievementSeal, preserves real unlocked/locked states, flip behavior, pending review, automatic difficulty calibration, Weekly Wrapped, and Monthly Wrapped without modifying RewardsSection.',
  },
  {
    feature: 'Task detail',
    productionComponent: 'apps/web/src/components/dashboard-v3/StreakTaskInsightsModal.tsx',
    productionDataSources: [
      'getTaskInsights',
      'computeWeeklyHabitHealth',
      'StreakPanelTask',
      'recalibration records',
      'activity scopes',
    ],
    premiumVariant: 'PremiumTaskDetail',
    premiumRepresentation:
      'Diagnostic mobile task view with task identity, latest recalibration chip, Score, lifecycle status, active window, compact activity, and difficulty adjustments.',
    mustPreserve: [
      'Score/health semantics',
      'lifecycle status',
      'active window/month history',
      'weekly/month/quarter activity',
      'difficulty adjustment history',
      'recalibration action color semantics',
      'no editor replacement',
    ],
    status: 'extracted-lab-variant',
    notes: 'Implemented as PremiumTaskDetail.tsx inside Labs. It selects a real StreakPanel task, reuses getTaskInsights for task detail/activity/recalibration data, and keeps the production TaskInsights modal unchanged.',
  },
  {
    feature: 'Emotion Chart',
    productionComponent: 'apps/web/src/components/dashboard-v3/EmotionChartCard.tsx',
    productionDataSources: [
      'getEmotions',
      'EmotionSnapshot',
      'emotion normalization helpers',
      'emotion colors',
      'period/timeline computation',
    ],
    premiumVariant: 'PremiumEmotionChart',
    premiumRepresentation:
      'Mobile-clean emotion chart using real days as dots, fixed emotion legend, analyzed period, and most frequent emotion.',
    mustPreserve: [
      'one dot per real day/snapshot',
      'no invented calendar grid',
      'emotion names and colors',
      'period calculation',
      'most frequent emotion',
    ],
    status: 'inline-lab-implementation',
    notes: 'Current Labs implementation uses getEmotions directly; extraction should preserve the production normalization semantics.',
  },
  {
    feature: 'Balance / Equilibrio',
    productionComponent: 'apps/web/src/components/dashboard-v3/RadarChartCard.tsx',
    productionDataSources: [
      'getUserXpByTrait',
      'TraitXpEntry',
      'computeRadarDataset',
      'computePillarMetrics',
      'computeBalanceStatus',
    ],
    premiumVariant: 'PremiumBalance',
    premiumRepresentation:
      'Premium radar/circle balance view with Cuerpo/Mente/Alma GP or XP distribution, dominant pillar, proportional inner shape, and short insight.',
    mustPreserve: [
      'pillar distribution',
      'Cuerpo/Mente/Alma labels',
      'dominant pillar',
      'proportional radar shape',
      'existing balance status semantics',
    ],
    status: 'inline-lab-implementation',
    notes: 'Current Labs implementation uses StreakPanel month XP as an interim data source; preferred extraction should reuse RadarChartCard data semantics.',
  },
];
