# Mode Upgrade Analysis Verification

## 1) Executive summary

Status: **READY WITH FIXES**.

The current implementation in `getRollingModeUpgradeAnalysis` is largely aligned with the intended business rules:

- It uses a **true rolling 30-day window** (not calendar-month based).
- It computes per-task **actual vs expected** over that window.
- It applies the **two-level 80% rule correctly** (task-level pass, then user-level pass-by-tasks).
- It handles **EVOLVE as terminal** (`next_mode = null`, no upgrade CTA).
- Admin backend endpoint uses the **same analysis service** as the base logic.

However, there is a confirmed inconsistency that should be fixed before Accept Upgrade work:

1. **Admin frontend type/field contract mismatch** (UI expects old field names and percent formatting) vs backend payload from rolling analysis.

Additionally, there is one important quality gap to address:

2. `debug_reason` currently returns only `no_evaluable_tasks`; it does not distinguish *why* no analysis was possible (e.g., no active tasks vs no mode baseline/history).

---

## 2) Current files/functions involved

### Core analysis logic
- `apps/api/src/services/modeUpgradeAnalysisService.ts`
  - `getRollingModeUpgradeAnalysis(userId, now?)`
  - `buildModeSegments(...)`
  - `resolveNextModeCode(...)`

### Admin backend wiring
- `apps/api/src/modules/admin/admin.service.ts`
  - `getUserModeUpgradeAnalysis(userId)` delegates directly to `getRollingModeUpgradeAnalysis(userId)`.

### Admin route coverage
- `apps/api/src/modules/admin/admin.routes.test.ts`
  - Verifies `/api/admin/user/:id/mode-upgrade-analysis` response shape in rolling-analysis fields.

### Service tests
- `apps/api/src/services/__tests__/modeUpgradeAnalysisService.test.ts`
  - Verifies segmented expected-count calculation and EVOLVE/no-analysis behavior.

### Admin frontend consumer (inconsistency area)
- `apps/web/src/lib/types.ts`
  - `AdminModeUpgradeAnalysis` type currently reflects old field names (`tasks_evaluated`, `eligible`, etc.).
- `apps/web/src/components/admin/AdminLayout.tsx`
  - UI reads old fields and renders `%` on values that now arrive as ratios (`0..1`) from backend.

---

## 3) Verification against each business rule

## Rule 1 — Rolling 30-day window

**Required:** true rolling last 30 days, not previous calendar month.

### Confirmed behavior
- `analysisEndDate` is `dateOnlyUtc(now)`.
- `analysisStartDate = analysisEndDate - 29 days`.
- SQL filters completions by `dl.date >= analysisStart` and `<= analysisEnd`.
- `analysis_basis` is explicitly `rolling_30_days`.

✅ **Confirmed correct**: this is a rolling day window, not calendar-month logic.

---

## Rule 2 — Per-task actual/expected/completion/pass

### 2.1 actual_count

**Required:** count task completions in same rolling 30-day window.

### Confirmed behavior
- `actual_count` comes from `daily_log` grouped by `task_id` and summed as `SUM(dl.quantity)` for the window.
- Mapped by task id into evaluable active tasks.

✅ **Confirmed source and computation path**:
- source table: `daily_log`
- grouping key: `task_id`
- metric: sum of `quantity`

**Note:** this treats `quantity` as completion units. If product semantics require “distinct completion events” instead of quantity units, that would be a future business decision, not a coding bug in current implementation.

### 2.2 expected_count

**Required:** expected count over same 30-day period, based on active game mode during each part of period.

### Confirmed behavior
- History source: `user_game_mode_history` + `cat_game_mode.weekly_target`.
- Segmentation logic in `buildModeSegments`:
  - anchor at period start from latest history <= start (or fallback to current user mode);
  - add anchors for changes inside window;
  - each segment expected = `(weekly_target * days) / 7`.
- For each task, analysis period starts at `max(task.created_at, analysis_start)`.

✅ **Confirmed mode-history segmented expected count**.

✅ **Confirmed mid-period mode changes are handled** by split segments.

### 2.3 completion_rate and task_meets_goal

**Required:** `completion_rate = actual_count / expected_count`; task passes at `>= 0.80`.

### Confirmed behavior
- `completionRate = actualCount / expectedCount`
- `meets_goal: completionRate >= GOAL_THRESHOLD` where threshold is `0.8`.

✅ **Confirmed correct**.

---

## Rule 3 — User aggregate pass logic

**Required:**
- `tasks_total_evaluated`
- `tasks_meeting_goal`
- `task_pass_rate = meeting / total`
- `eligible_for_upgrade = task_pass_rate >= 0.80`
- (not average of percentages)

### Confirmed behavior
- `tasksTotalEvaluated = tasks.length`
- `tasksMeetingGoal = count(meets_goal)`
- `taskPassRate = tasksMeetingGoal / tasksTotalEvaluated` (or `0` when no tasks)
- `eligibleForUpgrade = Boolean(nextMode) && taskPassRate >= 0.8 && tasksTotalEvaluated > 0`

✅ **Confirmed the two-stage pass/fail model is implemented correctly** (task pass then user pass-by-task-count), not average completion rates.

---

## Rule 4 — EVOLVE terminal mode

**Required:** no next mode, no upgrade CTA when current mode is EVOLVE.

### Confirmed behavior
- `resolveNextModeCode('EVOLVE') => null`.
- `eligible_for_upgrade` requires `Boolean(nextMode)`.
- `cta_enabled` requires `nextMode != null`.

✅ **Confirmed correct**.

---

## 4) Confirmed correct behavior

1. Rolling 30-day window (inclusive) with explicit window metadata.
2. Expected-count segmentation by mode history over the task-specific in-window lifespan.
3. Correct per-task threshold and user aggregate threshold mechanics.
4. Clear distinction between:
   - `has_analysis = false` (no evaluable tasks), and
   - `has_analysis = true` with `tasks_meeting_goal = 0` (analysis exists, zero passes).
5. Admin backend endpoint reuses the exact same service logic.

---

## 5) Confirmed bugs / inconsistencies

## Bug A — Admin frontend contract mismatch (confirmed)

### What is wrong
The admin backend returns rolling-analysis fields such as:
- `tasks_total_evaluated`
- `eligible_for_upgrade`
- `analysis_window_days`
- ratio values for `task_pass_rate` and `threshold` in `0..1`

But admin frontend type/UI still expects old fields:
- `tasks_evaluated`
- `eligible`
- `evaluation_period_days`
- and renders `task_pass_rate`/`threshold` as if they were already percent values.

### Impact
- Admin view can display incorrect/empty values despite backend logic being correct.
- This undermines trust when validating upgrade readiness from admin screens.

### Files
- `apps/web/src/lib/types.ts`
- `apps/web/src/components/admin/AdminLayout.tsx`

---

## 6) Edge cases reviewed

1. **New tasks created inside window**
   - Expected count starts at task creation date (`max(created_at, window_start)`).
   - ✅ handled.

2. **Archived/inactive tasks**
   - Only `tasks.active = TRUE` are evaluated.
   - ✅ handled (assuming business intends only active tasks).

3. **Tasks with no completions**
   - Included with `actual_count = 0`; can fail goal if expected > 0.
   - ✅ handled.

4. **No evaluable tasks**
   - Returns `has_analysis = false`, `debug_reason = no_evaluable_tasks`.
   - ✅ handled, but reason taxonomy is coarse.

5. **No mode history present**
   - Falls back to user current mode/weekly target.
   - ✅ handled if current mode exists.

6. **Terminal mode EVOLVE**
   - `next_mode = null`; CTA disabled regardless of pass rate.
   - ✅ handled.

7. **Data anomaly risk (inferred, not confirmed bug)**
   - `actual_count` query is window-wide; task-level filtering by creation date is not applied to logs.
   - In normal data, logs before task creation should not exist; if they do, actual could be inflated for new tasks.
   - ⚠️ inferred risk, not a confirmed defect from current evidence.

---

## 7) What must be fixed before implementing Accept Upgrade

1. **Fix Admin frontend contract alignment**
   - Update `AdminModeUpgradeAnalysis` type and UI field usage to match backend rolling-analysis payload.
   - Render ratios (`task_pass_rate`, `threshold`) correctly (either as raw ratios or multiplied/formatted percent consistently).

2. **Improve empty-analysis diagnostics (recommended)**
   - Keep `has_analysis`, `analysis_start`, `analysis_end`, `analysis_basis` (already present and good).
   - Extend/normalize reason field (`reason_if_empty`) beyond only `no_evaluable_tasks`, e.g.:
     - `no_active_tasks`
     - `no_mode_baseline`
     - `all_expected_zero`

3. **Optional hardening for anomaly safety**
   - If needed, cap task actuals to `taskStartDate..analysisEndDate` to avoid pre-creation log anomalies affecting score.

---

## 8) Clear conclusion

**Conclusion: READY WITH FIXES**

Backend mode-upgrade analysis logic is fundamentally correct and aligned with intended business rules, including rolling-window segmentation and two-level threshold evaluation. The main blocker for trust/operability before Accept Upgrade is admin-facing contract/display consistency, plus recommended response-quality diagnostics for empty analyses.
