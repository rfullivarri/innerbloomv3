# Mode Upgrade Analysis Fix Plan

## 1) Current incorrect behavior

Before this fix, admin mode-upgrade analysis depended on monthly aggregate/suggestion data and then fetched per-task rows from `task_difficulty_recalibrations` filtered by the user's **current mode now**. That had two core issues:

- It was not based on a rolling last-30-days analysis window.
- It could miscompute expected targets if the user changed mode during the window, because it ignored mode history by period segment.

It also mixed monthly wrap-up derived fields (`missing_tasks_to_upgrade`) into the admin analysis payload, which made it harder to reason about CTA readiness for rolling analysis.

## 2) Corrected business logic

Mode Upgrade analysis now uses a strict rolling 30-day basis:

- Window = `[today-29 days, today]` (UTC date boundaries).
- For each active task:
  1. `actual_count` = sum of completions in `daily_log` within window.
  2. `expected_count` = sum over mode-history sub-periods in the same window:
     - resolve mode at each date range from `user_game_mode_history` + `cat_game_mode.weekly_target`
     - split when mode changes inside the window
     - expected per segment = `weekly_target * days / 7`
  3. `completion_rate = actual_count / expected_count`
  4. `meets_goal = completion_rate >= 0.80`

At user level:

- `tasks_total_evaluated` = evaluable active tasks with `expected_count > 0`
- `tasks_meeting_goal` = tasks where `meets_goal=true`
- `task_pass_rate = tasks_meeting_goal / tasks_total_evaluated`
- `eligible_for_upgrade = task_pass_rate >= 0.80` and `next_mode != null`
- if `current_mode = EVOLVE`, `next_mode = null` and CTA stays disabled

## 3) Files/functions changed

- `apps/api/src/services/modeUpgradeAnalysisService.ts`
  - New rolling 30-day analysis service
  - Period-aware mode segmentation logic
  - Task-level and aggregate output generation
- `apps/api/src/modules/admin/admin.service.ts`
  - `getUserModeUpgradeAnalysis` now delegates to `getRollingModeUpgradeAnalysis`
  - Admin response type updated to explicit analysis status fields
- `apps/api/src/modules/admin/admin.routes.test.ts`
  - Updated mocks and response assertions for new payload shape
- `apps/api/src/services/__tests__/modeUpgradeAnalysisService.test.ts`
  - Added tests for mode-history segmented expectation and no-analysis behavior

## 4) Period-aware mode resolution details

Resolution algorithm:

1. Query `user_game_mode_history` up to analysis end date.
2. For each task, set task-specific period start as `max(task.created_at_date, analysis_start)`.
3. Build mode anchors:
   - latest history row at/before period start (or fallback to current user mode)
   - all history rows strictly inside window
4. Convert anchors to contiguous date segments.
5. Compute segment expected counts and sum.

Debug transparency:

- `tasks[].mode_segments_used` includes each segment (`start`, `end`, `mode_code`, `weekly_target`, `days`, `expected_count`).

## 5) Admin manual run compatibility / source handling

Current admin “Run Monthly Analysis” endpoint still runs:

1. `runMonthlyTaskDifficultyCalibrationForUser({ source: 'cron' })`
2. `runUserMonthlyModeUpgradeAggregation(...)`

This remains unchanged for compatibility with existing monthly reporting pipeline.

Clarification:

- Recalibration is a **data preparation and monthly wrap-up pipeline step**, not the business-logic basis for rolling CTA analysis.
- Rolling mode-upgrade analysis now reads live task completions and mode history directly.
- `source='cron'` remains used in monthly aggregation internals; this does not alter rolling analysis output.

## 6) Acceptance path audit (mode change write path)

Current real mode-change behavior in repo:

- User current mode write:
  - `users.game_mode_id` is updated directly (e.g., onboarding path and upgrade acceptance path).
- Game mode history write:
  - DB trigger `trg_users_game_mode_history` on `users` inserts into `user_game_mode_history` when `game_mode_id` changes.
  - This ensures mode history is automatically captured for future period-aware analyses.
- Downstream avatar/UI-derived state:
  - On onboarding mode set (`submitOnboardingIntro`), `users.image_url` and `users.avatar_url` are updated using mode image mapping.
  - Upgrade acceptance currently updates `users.game_mode_id` but does not yet apply onboarding avatar image remap logic; this should be addressed in future acceptance UX scope.

## 7) What remains for CTA/acceptance implementation later

Not implemented in this fix (intentionally):

- Visual CTA surfaces (top bar/hamburger/persistent detail).
- Upgrade modal UX.
- Enhanced acceptance side-effects alignment (e.g., avatar refresh policy) beyond existing mode write path.

Backend is now prepared with explicit fields:

- `has_analysis`, `analysis_window_days`, `analysis_start`, `analysis_end`, `analysis_basis`
- `eligible_for_upgrade`, `current_mode`, `next_mode`, `cta_enabled`
- `tasks_total_evaluated`, `tasks_meeting_goal`, `task_pass_rate`, `threshold`, `missing_tasks`
- `tasks[]` with `actual_count`, `expected_count`, `completion_rate`, `meets_goal`, `mode_segments_used`
