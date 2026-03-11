# Task Adjustment System Audit

## 1) Overview of the current automatic adjustment system

The repository already has a production-oriented **automatic task difficulty recalibration** system (also called auto-calibration/recalibration in code/docs).

At a high level:

1. It scans active tasks.
2. It computes each task's performance over an analysis period.
3. It compares **actual completions** vs an **expected target** derived from the user's game mode weekly target.
4. It adjusts task difficulty by one step up/down/keep based on completion-rate thresholds.
5. It stores an immutable recalibration record per run in a dedicated history table.

This is implemented as a shared engine used by:
- a monthly internal cron endpoint, and
- an admin manual run endpoint / backfill script.

---

## 2) Where it lives in the codebase (files and modules)

### Core service (main logic)
- `apps/api/src/services/taskDifficultyCalibrationService.ts`
  - Eligibility and period building (`isTaskEligibleForCalibration`, `buildAnalysisPeriod`)
  - Threshold decision (`decideDifficultyChange`)
  - Engine (`runTaskDifficultyCalibrationEngine`)
  - Public runners (`runMonthlyTaskDifficultyCalibration`, `runTaskDifficultyCalibrationBackfill`, `runAdminTaskDifficultyCalibration`)

### Cron entrypoint
- `apps/api/src/routes/internal.ts`
  - `POST /internal/cron/monthly-task-difficulty`
  - Optional `?backfill=1` path

### Admin entrypoint/tooling
- `apps/api/src/modules/admin/admin.routes.ts`
  - `POST /admin/task-difficulty-calibration/run`
- `apps/api/src/modules/admin/admin.handlers.ts`
  - `postAdminRunTaskDifficultyCalibration`
- `apps/api/src/modules/admin/admin.schemas.ts`
  - body schema: `userId?`, `window_days`, `mode`

### Script entrypoint
- `apps/api/scripts/task-difficulty-backfill.ts`
- `apps/api/package.json`
  - script: `backfill:task-difficulty`

### Persistence (DB migrations)
- `apps/api/src/db/migrations/202603090001_task_difficulty_recalibration.sql`
  - creates `user_game_mode_history`, trigger from `users.game_mode_id`, and `task_difficulty_recalibrations`
- `apps/api/src/db/migrations/202603090002_task_difficulty_recalibration_source.sql`
  - adds `source` field (`cron` | `admin_run`)

### Read APIs consuming history
- `apps/api/src/routes/tasks.ts`
  - `GET /tasks/:taskId/insights` (includes recalibration summary/history)
  - `GET /tasks/:taskId/recalibrations/latest`
  - `GET /tasks/:taskId/recalibrations?limit=...`

### Existing project documentation
- `docs/task-difficulty-auto-calibration.md`
  - operational notes for cron/admin/backfill and UI endpoints

---

## 3) Calculation logic

## 3.1 Eligibility rules

### Cron (`source = cron`)
A task is considered eligible only if:
- task is active,
- task has difficulty assigned (`difficulty_id != null`),
- task is at least 30 days old by end of previous month.

The helper logic computes:
- `eligibilityDate = created_at (date-only) + 30 days`
- `previousMonthEnd = UTC end of previous month`
- eligible when `eligibilityDate <= previousMonthEnd`.

### Admin run (`source = admin_run`)
Similar but slightly different:
- active task,
- difficulty assigned,
- age in days strictly `> 30` from `created_at` to `now`.

Admin run also supports optional same-day dedupe by task (`dedupeByDay`).

## 3.2 Analysis period

### Cron monthly period
For each task:
- `period_end = end of previous month`
- `period_start = max(eligibilityDate, last_period_end + 1 day)`

If resulting start > end, task is skipped.

This means cron is **incremental**, not fixed to "exactly one calendar month" for first run; first window can be partial from day-30 onward, then continues from last processed period.

### Admin period
- Rolling window ending today:
- `start = today - window_days + 1`
- `end = today`
- default `window_days = 90`

## 3.3 Expected target and actual completions

For each evaluated task:

1. Resolve user's game mode weekly target:
   - Primary: latest row in `user_game_mode_history` joined with `cat_game_mode.weekly_target`.
   - Fallback: `users.game_mode_id -> cat_game_mode.weekly_target`.

2. Count actual completions:
   - `completions = SUM(daily_log.quantity)` for `(task_id, user_id)` between `period_start` and `period_end`.

3. Compute days and expected:
   - `days_in_period = floor((end - start)/1day) + 1`
   - `expected_target = weekly_target * days_in_period / 7`

4. Compute performance ratio:
   - `completion_rate = completions / expected_target` (or `0` if expected is not positive).

## 3.4 Thresholds and action mapping

`decideDifficultyChange` uses these thresholds:

- `completion_rate > 0.8` ⇒ suggested action `down`
- `completion_rate < 0.5` ⇒ suggested action `up`
- otherwise ⇒ `keep`

Difficulty ordering comes from `cat_difficulty` sorted by:
- `xp_base ASC NULLS LAST`, then
- `difficulty_id ASC`.

Actual movement is clamped by boundaries:
- `up` moves +1 index (harder)
- `down` moves -1 index (easier)
- if already at extreme, final action becomes `keep`.

When difficulty changes, task row is updated:
- `tasks.difficulty_id = new`
- `tasks.xp_base = cat_difficulty.xp_base(new)` (fallback keep current)
- `tasks.updated_at = NOW()`

Regardless of adjustment, recalibration history row is inserted.

## 3.5 Frequency/window type

- **Cron path:** monthly cadence endpoint, period ends at previous month end, with incremental carry-forward from last period.
- **Admin path:** rolling window (`window_days`, default 90).

Game mode / weekly target is explicitly used in expected target calculation.

---

## 4) Data models involved

## 4.1 Primary table: `task_difficulty_recalibrations`

Stores recalibration history per task run with these key fields:
- `task_difficulty_recalibration_id`
- `task_id`
- `user_id`
- `period_start`, `period_end`
- `game_mode_id`
- `expected_target`
- `completions_done`
- `completion_rate`
- `previous_difficulty_id`
- `new_difficulty_id`
- `action` (`up|keep|down`)
- `source` (`cron|admin_run`)
- `analyzed_at`, `created_at`

## 4.2 Supporting table: `user_game_mode_history`

Used to resolve weekly target context historically/currently:
- `user_game_mode_history_id`
- `user_id`
- `game_mode_id`
- `effective_at`
- `source`
- `created_at`

Auto-populated initially from `users` and kept in sync by trigger on `users.game_mode_id` updates.

## 4.3 Other required tables (read/update dependencies)

- `tasks`
  - reads: `task_id`, `user_id`, `difficulty_id`, `created_at`, `active`
  - updates: `difficulty_id`, `xp_base`, `updated_at`
- `daily_log`
  - aggregation source for completions (`SUM(quantity)` by date range)
- `users`
  - fallback source for current `game_mode_id`
- `cat_game_mode`
  - source of `weekly_target`
- `cat_difficulty`
  - difficulty ordering and `xp_base` mapping

---

## 5) Execution flow

## 5.1 When it runs

### Automatic path
- Exposed as `POST /internal/cron/monthly-task-difficulty`.
- Requires `x-cron-secret` and is rate-limited by internal cron middleware.
- Actual schedule frequency is external (platform scheduler/cron), not hardcoded in app runtime.

### Manual/admin path
- `POST /admin/task-difficulty-calibration/run` for targeted or global runs.
- Optional backfill path:
  - `POST /internal/cron/monthly-task-difficulty?backfill=1`
  - or script `npm -w @innerbloom/api run backfill:task-difficulty`.

## 5.2 Per-user vs global

- Cron endpoint runs over all active tasks globally.
- Admin endpoint can run:
  - for all users (no `userId`), or
  - scoped to a single user (`userId` provided).

## 5.3 Persisted vs on-demand

- Recalibration results are **persisted** in `task_difficulty_recalibrations`.
- Insights endpoints read persisted history on demand.
- No precomputed monthly aggregate table exists for "all tasks per month" user rollups.

---

## 6) What parts can be reused for monthly performance analysis

## Reusable as-is

1. **Per-task expected-vs-actual framework**
   - Already computes expected target from game mode and period length.

2. **Per-task completion ratio thresholds**
   - Existing `completion_rate` can directly answer "task met >=80%" via `completion_rate >= 0.8`.

3. **Historical persistence**
   - `task_difficulty_recalibrations` gives auditable records for period-based performance.

4. **Operational execution channels**
   - Reusable cron/admin entrypoints and security/rate-limit patterns.

5. **Task-level API exposure**
   - Existing task recalibration endpoints can feed UI or reporting for single-task history.

---

## 7) What parts would require new implementation

For requested upcoming features (Monthly Wrap-Up + Mode Upgrade), these gaps remain:

1. **Aggregate monthly performance across all tasks for a user**
   - Current system stores per-task rows only.
   - No built-in user-month aggregate (e.g., total tasks evaluated, tasks hitting >=80%).

2. **Eligibility rule ">=80% of tasks meet goal"**
   - Must add aggregation logic over recalibration rows (or over raw logs + expected) for a user/month.

3. **Mode Upgrade decisioning workflow**
   - No existing logic upgrades mode based on aggregate task performance.
   - `user_game_mode_history` tracks mode changes but does not contain promotion rules.

4. **Explicit monthly analytics API/report object**
   - Existing `tasks/:taskId/insights` is task-specific and weekly-centric for timeline; not a full monthly user summary endpoint.

5. **Potential historical correctness by period mode changes**
   - Current recalibration fetches latest game mode history row overall (not explicitly constrained to `effective_at <= period_end` in SQL), which may not fully model intra-period mode changes for precise historical monthly analysis.

---

## 8) Potential risks or conflicts

1. **Semantic mismatch (difficulty action labels)**
   - High completion (`>0.8`) maps to action `down` (moves to easier difficulty).
   - Low completion (`<0.5`) maps to `up` (moves to harder).
   - This is intentional in current code naming/index order but can be counterintuitive when reused for business reporting.

2. **Period model differences between cron/admin**
   - Cron is incremental to previous month-end windows.
   - Admin is rolling `window_days` and not equivalent to calendar month.
   - Reuse must avoid mixing these datasets without clear segmentation by `source` and period bounds.

3. **No explicit scheduler source of truth in repo for monthly endpoint cadence**
   - Endpoint exists, but actual cron expression/deployment schedule may live outside repository infra config.

4. **Duplicate-run behavior differences**
   - `admin_run` has same-day dedupe option.
   - `cron` path does not use same dedupe mechanism and instead relies on period progression to avoid reruns.

5. **Task eligibility and maturity rule hardcoded to 30 days**
   - Monthly Wrap-Up/Mode Upgrade may require including younger tasks; current engine intentionally excludes them.

6. **No explicit "status" field in recalibration records**
   - Consumers infer status from `action` and rates; if product needs richer states, schema extension is required.

---

## Quick answers to the 5 reuse questions

1. **Monthly task performance analysis?**
   - **Partially yes.** Per-task monthly-like metrics exist; user-level monthly rollup is missing.

2. **Determine if task met >=80% expected target?**
   - **Yes.** Use `completion_rate >= 0.8` from recalibration rows.

3. **Aggregate performance across all user tasks?**
   - **Not directly today.** Requires new aggregation query/service.

4. **Determine if >=80% of tasks meet goal?**
   - **Not directly today.** Needs user-level aggregate computation and eligibility rules.

5. **Support Mode Upgrade eligibility feature?**
   - **Foundation exists** (metrics + mode history), but **decision logic, aggregate computation, and mode transition workflow are new work**.
