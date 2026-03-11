# Mode Upgrade Analysis Verification

## Executive summary

Status: **READY AS SOURCE OF TRUTH**.

Post-fix, mode-upgrade eligibility is now consistently derived from a single rolling 30-day analysis basis and exposed with explicit metadata/empty-state reasons suitable for Admin, backend CTA checks, and Month Wrap-Up consumers.

## Final verified business behavior

- Analysis basis is a rolling 30-day inclusive window: `analysis_start = today-29`, `analysis_end = today`, `analysis_basis = "rolling_30_days"`.
- For each active task, expected completions are period-aware and segmented by game mode history (`user_game_mode_history` + `cat_game_mode.weekly_target`) across the task-specific window.
- Task evaluation is aligned with aggregate eligibility:
  - `completion_rate = actual_count / expected_count`
  - `meets_goal = completion_rate >= 0.80`
  - `task_pass_rate = tasks_meeting_goal / tasks_total_evaluated`
  - `eligible_for_upgrade = task_pass_rate >= 0.80` and `next_mode != null`
- EVOLVE remains terminal: `next_mode = null`, `cta_enabled = false`.
- `tasks[]` rows and aggregate fields come from the same evaluation loop, preventing drift.

## Empty/no-analysis hardening

The payload now provides explicit analysis status fields and structured no-analysis reasons:

- `has_analysis`
- `analysis_window_days`
- `analysis_start`
- `analysis_end`
- `analysis_basis = "rolling_30_days"`
- `reason_if_empty` with values:
  - `no_active_tasks`
  - `no_mode_baseline`
  - `all_expected_zero`
- `missing_tasks` remains `null` whenever `has_analysis = false`.

## Consistency across consumers

- Admin endpoint delegates directly to `getRollingModeUpgradeAnalysis`.
- Public/backend upgrade-suggestion flow now also uses `getRollingModeUpgradeAnalysis` as its eligibility source of truth.
- Suggestion period key for rolling analyses is normalized as `rolling_<analysis_end>`.

## Test coverage added/updated

- Rolling 30-day and segmented expected-count correctness.
- Mid-period mode changes.
- EVOLVE terminal behavior.
- Empty/no-analysis reasons.
- `tasks[]` consistency with aggregate counters, including zero-completion tasks.
- Suggestion service alignment with rolling analysis source.

## Post-fix conclusion

Mode Upgrade analysis is now trustworthy for eligibility decisions and ready to back the real Accept Upgrade flow without changing task difficulty calibration, XP/GP/Level logic, or CTA UI implementation.
