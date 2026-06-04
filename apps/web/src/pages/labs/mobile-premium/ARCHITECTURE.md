# Mobile Premium Labs Architecture

This folder is the isolated sandbox for the Innerbloom mobile premium UI.

The goal is to create premium variants inside Labs from existing production features without modifying the original components, production routes, backend, DB, endpoints, schemas, or global CSS that can affect production.

## Isolation Rules

- Keep all premium variants under `apps/web/src/pages/labs/mobile-premium`.
- Do not edit production components to satisfy a Labs visual direction.
- If a production component already works, create a Labs variant/copy and restyle that variant.
- Reuse existing hooks, API clients, types, pure helpers, assets, seals, and calculation semantics.
- Use local fallback/mock data only inside Labs and only for visual rendering when real session/data is unavailable.
- Do not use Labs mocks in production screens.

## Variant Structure

- `mobilePremiumTokens.ts`: Labs-only design tokens.
- `MobilePremiumPrimitives.tsx`: Labs-only primitives and shell pieces.
- `traitIconRegistry.tsx`: Labs-only trait/stat icon registry.
- `variants/premiumFeatureMap.ts`: source-of-truth map between production features and Labs premium variants.
- `variants/README.md`: implementation notes for future extraction of the inline Labs screens into named variant files.

The current Labs route remains in `../MobilePremiumLabPage.tsx`. The next architecture step is to extract the inline premium screen implementations into named files under `variants/` without changing behavior:

- `PremiumStreaksPanel` / `PremiumTasksScreen`
- `PremiumDailyQuest`
- `PremiumRewardsSection`
- `PremiumTaskDetail`
- `PremiumEmotionChart`
- `PremiumBalance`

## Feature Mapping

| Existing feature | Current production component | Current data/hook/API | Labs premium representation | Must not lose |
| --- | --- | --- | --- | --- |
| StreaksPanel / Tasks | `apps/web/src/components/dashboard-v3/StreaksPanel.tsx` | `useRequest`, `getUserStreakPanel`, `StreakPanelResponse`, `StreakPanelTask`, `gameMode`, `weeklyTarget` | `PremiumStreaksPanel` / `PremiumTasksScreen`: compact mobile task rows with trait icon, task name, difficulty, compact S1-S5 month weeks, compact weekly progress ring, streak, chevron | `weeklyDone/weeklyGoal`, `metrics.month.weeks`, `streakDays`, `difficultyLabel`, `latestRecalibrationAction`, `achievementSealVisible`, `lifecycleStatus`, pillar/range filtering semantics |
| Daily Quest | `apps/web/src/components/DailyQuestModal.tsx` | `getDailyQuestStatus`, `getDailyQuestDefinition`, `getModerationState`, `submitDailyQuest`, `updateModerationStatus`, `useRequest` | `PremiumDailyQuest`: retrospective of yesterday with emotion choice, moderation row, circular checklist controls, GP total, confirm/later actions | Emotion selection, task completion selection, moderation active state, GP calculation/action flow, submit/snooze semantics, no planner language |
| Rewards / Logros | `apps/web/src/components/dashboard-v3/RewardsSection.tsx` | `getRewardsHistory`, `getTaskInsights`, `decideTaskHabitAchievement`, `toggleTaskHabitAchievementMaintained`, `useCarouselSelection`, `HabitAchievementSeal` | `PremiumRewardsSection`: premium shelves/carousel using real seals, pending review row, automatic difficulty calibration, Weekly Wrapped, Monthly Wrapped, flip detail behavior | Real seals/assets, achieved vs locked state, pending review, shareable seals, automatic difficulty calibration summary, Weekly/Monthly Wrapped semantics, flip behavior |
| Task detail | `apps/web/src/components/dashboard-v3/StreakTaskInsightsModal.tsx` | `getTaskInsights`, `computeWeeklyHabitHealth`, `StreakPanelTask`, recalibration records, activity scopes | `PremiumTaskDetail`: diagnostic mobile view with task identity, trait, latest recalibration chip, Score, lifecycle status, active window, compact activity, difficulty adjustments | Score/health semantics, lifecycle status, active window/month history, weekly/month/quarter activity, recalibration history/action colors, no editor replacement |
| Emotion Chart | `apps/web/src/components/dashboard-v3/EmotionChartCard.tsx` | `getEmotions`, `EmotionSnapshot`, normalization helpers, emotion colors, period/timeline computation | `PremiumEmotionChart`: mobile-clean chart using real days as dots, emotion legend, analyzed period, most frequent emotion | One dot per real day/snapshot, no invented calendar grid, emotion names/colors, period calculation, most frequent emotion |
| Balance / Equilibrio | `apps/web/src/components/dashboard-v3/RadarChartCard.tsx` | `getUserXpByTrait`, `TraitXpEntry`, `computeRadarDataset`, `computePillarMetrics`, `computeBalanceStatus` | `PremiumBalance`: premium radar/circle balance view with Cuerpo/Mente/Alma distribution and short insight | GP/XP distribution by pillar, Cuerpo/Mente/Alma labels, dominant pillar, proportional radar shape, existing balance status semantics |

## Current Status

The Labs screens already reuse production APIs and types from `../../lib/api` and keep fallback data isolated in `mobilePremiumLabMockData.ts` or the Labs page. Some implementations are still inline in `MobilePremiumLabPage.tsx`; this is acceptable for the sandbox but should be extracted into named `variants/` files before migrating any pattern toward production.

## Migration Rule

No Labs variant should be promoted into production until:

- Its data source is mapped to an existing production feature.
- The old component semantics are preserved.
- The original component remains untouched during the experiment.
- Fallback/mock data is removed from the production path.
- The route migration is explicitly approved.
