# Game Mode Upgrade Impact Audit

## 1. Executive summary

This audit confirms that **current game mode source-of-truth is `users.game_mode_id`**, with catalog metadata (`code`, `weekly_target`) resolved via `cat_game_mode`. Mode history is persisted by a DB trigger into `user_game_mode_history` whenever `users.game_mode_id` changes, so any valid upgrade path should update `users.game_mode_id` and rely on that trigger for historical continuity.

A user mode change currently has broad downstream impact:

- **Backend computations**: daily energy propagation parameters, weekly targets, mode-upgrade analyses, and monthly upgrade aggregation output.
- **UI**: game-mode chips, avatar/video selection, streak thresholds display, missions art skins, and upgrade CTA visibility.
- **Historical analytics**: some subsystems are period-aware (mode history aware), while others still use the latest/current mode and can rewrite interpretation of older periods.

Most critical risk if implemented naively: changing current mode without aligning all reads to historical mode where needed (especially recalibration + streak-related insights), plus missing avatar/image synchronization on accept (onboarding currently remaps image/avatar but accept path does not).

---

## 2. Current source of truth for game mode

### Confirmed

1. **Primary persisted value** is `users.game_mode_id`.
   - `GET /users/me` joins `users` → `cat_game_mode` and returns `game_mode` + `weekly_target` from that relation.
   - File/function: `apps/api/src/controllers/users/get-user-me.ts` (`SELECT_USER_SQL`, `getCurrentUser`).

2. **System-level profile reads** consistently derive mode from `users.game_mode_id`:
   - `getUserProfile` (used by user-state/daily-energy trend) resolves `mode_code` + `weekly_target` from `users` join `cat_game_mode`.
   - File/function: `apps/api/src/controllers/users/user-state-service.ts` (`getUserProfile`).

3. **Mode update paths** currently identified:
   - Onboarding intro (`UPDATE users SET game_mode_id = ... , image_url = ..., avatar_url = ...`).
   - Upgrade accept (`UPDATE users SET game_mode_id = ... WHERE user_id = ... AND game_mode_id = ...`).
   - Files/functions:
     - `apps/api/src/services/onboardingIntroService.ts` (`UPDATE_USER_GAME_MODE_SQL`, `submitOnboardingIntro`).
     - `apps/api/src/services/gameModeUpgradeSuggestionService.ts` (`acceptGameModeUpgradeSuggestion`).

### Inferred

- For mode upgrade acceptance, updating only `users.game_mode_id` is sufficient for history write due to DB trigger (section 4), but **not sufficient for visual avatar URL parity** with onboarding behavior unless handled explicitly.

---

## 3. Existing mode change flows in the repo

### A) Onboarding flow (mode set during intro)

- Endpoint flow persists onboarding session/answers/foundations and then updates `users.game_mode_id` and avatar/image URL.
- File/function: `apps/api/src/services/onboardingIntroService.ts` (`submitOnboardingIntro`, `UPDATE_USER_GAME_MODE_SQL`, `resolveModeImageUrl`).
- Side effects also include free trial upsert + journey generation pending trigger.

### B) Upgrade suggestion accept flow (already present in API)

- Endpoint: `POST /game-mode/upgrade-suggestion/accept`.
- Router file: `apps/api/src/routes/game-mode.ts`.
- Service behavior:
  - Reads latest eligible suggestion state.
  - Validates staleness/current mode consistency.
  - Updates `users.game_mode_id` in a transaction.
  - Marks suggestion `accepted_at`.
- File/function: `apps/api/src/services/gameModeUpgradeSuggestionService.ts` (`acceptGameModeUpgradeSuggestion`).

### C) No other direct game_mode writes found in API code

- Code search indicates only onboarding + accept path update `users.game_mode_id` directly.
- This reduces hidden mutation paths, but also means admin flows currently do not appear to force mode changes directly.

---

## 4. Mode history audit

### Confirmed writes

1. **History table exists** via migration:
   - `user_game_mode_history(user_id, game_mode_id, effective_at, source, ...)`.
   - File: `apps/api/src/db/migrations/202603090001_task_difficulty_recalibration.sql`.

2. **Backfill baseline** inserted from current users.

3. **Automatic sync trigger**:
   - Function `sync_user_game_mode_history()` inserts a row when `NEW.game_mode_id IS DISTINCT FROM OLD.game_mode_id`.
   - Trigger `trg_users_game_mode_history` on `users` AFTER UPDATE OF `game_mode_id`.

### Confirmed reads

- `modeUpgradeAnalysisService` reads history up to analysis end and builds period segments per task (`buildModeSegments`).
- `taskDifficultyCalibrationService` currently reads **latest history row overall** (not period-end constrained) as primary weekly-target source.

### Services relying on historical mode

- **History-aware**:
  - `apps/api/src/services/modeUpgradeAnalysisService.ts` (rolling 30-day per-task expected_count segmented by mode-at-time).
- **Partially history-aware / currently weak**:
  - `apps/api/src/services/taskDifficultyCalibrationService.ts` uses history table, but selects latest record (`ORDER BY effective_at DESC LIMIT 1`) regardless of analyzed period.

### Recommendation for accept-reuse

- Continue using current pattern: update `users.game_mode_id` once; let trigger create history row.
- Preserve transactional integrity already present in accept flow to avoid split-brain between users + suggestion state.

---

## 5. Streaks panel impact audit

## High-priority findings

### Backend streak panel endpoint behavior

- Endpoint: `GET /users/:id/streaks/panel`.
- File/function: `apps/api/src/routes/users/streak-panel.ts` (`getUserStreakPanel`).

#### Critical behavior

1. **Mode used is request query param (`mode`), not DB current mode**.
   - `mode` is parsed from query, normalized, defaulting to Flow when absent/invalid.
   - Tier (`MODE_TIERS`) is derived from that mode for hit thresholds.

2. **No `user_game_mode_history` usage**.
   - Weekly/monthly/quarter computations are done from `daily_log` counts and request tier.
   - This means streak interpretation is tied to the caller-supplied current tier, not mode-at-period.

3. **Weeks logic**:
   - Monthly week segments built by `weeksOfMonth` and `sumCountsInRange`.
   - Quarter uses 3 month blocks and scales hit count to a value tied to tier.

4. **Task habit status labels (fragile/building/strong) are computed on frontend from completion percentage**.
   - In web UI `getHabitHealth`: >=80 strong, >=50 medium/building, else weak/fragile.
   - File: `apps/web/src/lib/habitHealth.ts`.

### Frontend streak panel behavior

- File: `apps/web/src/components/dashboard-v3/StreaksPanel.tsx`.

1. Sends `mode: normalizedMode` to backend streak endpoint.
2. Uses `weeklyTarget` prop (from profile `/users/me`) if available; otherwise falls back to mode tier constant.
3. Renders mode chip label (`MODE · X/WEEK`) and computes UI progress/quarter hit threshold from that tier.
4. Task insights modal uses `weeklyGoal` + `mode` query values when fetching `/tasks/:taskId/insights`.

### Task insights endpoint behavior (streak-adjacent)

- File: `apps/api/src/routes/tasks.ts` (`/tasks/:taskId/insights`).
- Weekly goal is also request-driven (`weeklyGoal` query or tier from `mode` query).
- Week hits (`hit: count >= weeklyGoal`) and derived streaks use that runtime goal.
- Recalibration records shown in modal come from historical table `task_difficulty_recalibrations` (read-only display).

### Impact when user upgrades mode

- If UI re-fetches with new profile mode/weekly target, streak thresholds and displayed “OK/not OK” states can change immediately for same historical logs.
- Because streak computations are not period-aware, historical streak judgments may appear rewritten after upgrade.

### What must change (future implementation guidance)

- Decide explicit product rule:
  - either “streak panel is always current-mode interpreted” (simple, non-historical), or
  - “streak panel should be period-aware” (requires mode-at-week resolution).
- If historical correctness is required, backend streak and task-insights week-hit logic should resolve mode per period, not query-supplied current mode only.

---

## 6. Daily Energy impact audit

## High-priority findings

### Confirmed: Daily Energy depends on game mode

1. API endpoint `GET /users/:id/daily-energy` reads `v_user_daily_energy` and computes trend via user-state service.
   - File: `apps/api/src/routes/users/daily-energy.ts`.

2. Trend computation explicitly depends on mode code:
   - `getUserProfile` provides `modeCode` and `weeklyTarget`.
   - `computeHalfLife(modeCode)` uses mode-specific half-life map (`LOW/CHILL/FLOW/EVOLVE`).
   - `computeDailyTargets(..., weeklyTarget)` makes expected daily targets mode-dependent.
   - Files:
     - `apps/api/src/controllers/users/user-state-service.ts`
     - `apps/api/src/controllers/users/user-state-utils.ts`

3. DB snapshot view definition for `v_user_daily_energy` also encodes mode-dependent multipliers/half-lives using `users.game_mode_id -> cat_game_mode.code`.
   - File: `apps/api/db-snapshot.json` (`view_name: v_user_daily_energy`).

### Implication on mode change

- After upgrade accept, daily energy expectations and propagation math change for future calculations.
- No explicit recompute job appears required because values are queried/derived live.

### Cache/recompute nuance

- `getUserState` endpoint has an in-memory 5-minute TTL cache (`SimpleTtlCache`), so mode-dependent state responses may remain stale briefly unless cache invalidation is added.
- File: `apps/api/src/controllers/users/get-user-state.ts`.

---

## 7. Progress/dashboard impact audit

## High-priority findings

### Current mode surfaces in UI

1. Dashboard mode source:
   - `useBackendUser()` pulls `/users/me` profile (`game_mode`, `weekly_target`).
   - File: `apps/web/src/hooks/useBackendUser.ts`, `apps/web/src/lib/api.ts`.

2. Components affected by `gameMode` prop:
   - `MetricHeader` mode chip styling/label (`GameModeChip`).
   - `ProfileCard` avatar video path by mode.
   - `StreaksPanel` mode chip + thresholds.
   - `MissionsV2Board` / `MissionsV3Board` mission art variants by mode.
   - Files:
     - `apps/web/src/components/dashboard-v3/MetricHeader.tsx`
     - `apps/web/src/components/common/GameModeChip.tsx`
     - `apps/web/src/components/dashboard-v3/ProfileCard.tsx`
     - `apps/web/src/components/dashboard-v3/StreaksPanel.tsx`
     - `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`
     - `apps/web/src/components/dashboard-v3/MissionsV3Board.tsx`

3. Mode upgrade CTA already wired:
   - `ModeUpgradeSuggestionCTA` calls accept API and triggers `onUpgradeAccepted` (dashboard passes `reload` from `useBackendUser`), so profile-based mode reads refresh.
   - Files:
     - `apps/web/src/components/dashboard-v3/ModeUpgradeSuggestionCTA.tsx`
     - `apps/web/src/pages/DashboardV3.tsx`

### Avatar/chip consistency risk

- Onboarding path updates `users.image_url`/`avatar_url` with mode image.
- Accept path currently updates only `game_mode_id`; no avatar URL/image remap in service.
- If product expects avatar image URL to track mode, accept flow currently diverges from onboarding behavior.

### XP/GP/level stability

- No logic in accept flow updates XP totals/levels.
- XP and level endpoints are independent (`/xp/total`, `/level`) and should remain unchanged by mode update unless other jobs react later.

---

## 8. Task performance / expected target audit

## Critical mapping by subsystem

### A) Difficulty calibration (monthly/cron + admin run)

- File: `apps/api/src/services/taskDifficultyCalibrationService.ts`.
- Expected target formula: `expectedTarget = (weeklyTarget * daysInPeriod) / 7`.
- Weekly target source priority:
  1. latest row in `user_game_mode_history` (joined to `cat_game_mode`),
  2. fallback to current `users.game_mode_id -> cat_game_mode.weekly_target`.

#### Important correctness issue

- Current query picks latest history row overall (no `effective_at <= period_end` filter).
- Therefore historical periods may be evaluated against a newer mode after upgrade.

### B) Rolling mode upgrade analysis

- File: `apps/api/src/services/modeUpgradeAnalysisService.ts`.
- This subsystem is **period-aware**:
  - reads history up to analysis end,
  - builds per-task mode segments,
  - computes expected counts per segment and sums them.
- This is the most historically correct implementation currently present.

### C) Monthly mode-upgrade aggregation

- File: `apps/api/src/services/modeUpgradeMonthlyAggregationService.ts`.
- Aggregates from `task_difficulty_recalibrations` grouped by `(user_id, game_mode_id)` for period.
- Therefore correctness depends on what calibration wrote as `game_mode_id` at analysis time.

### D) Task insights / habit strength UI

- Backend `/tasks/:taskId/insights` uses request weeklyGoal/mode for timeline hit logic.
- Frontend habit-health labels computed from completion percentage thresholds (80/50) in `habitHealth.ts`.
- Net: not historical mode-aware; view can shift with current selected mode goal.

### E) Debug/admin views

- Admin mode upgrade analysis and monthly aggregation execution routes exist.
- File: `apps/api/src/modules/admin/admin.routes.ts`.
- Debug taskgen service reads user game mode from users/onboarding, but this is informational for generation context.

---

## 9. Rewards / wrapped impact audit

### Confirmed

1. Monthly wrapped payload includes mode fields:
   - `current_mode`, `mode_weekly_target`, `eligible_for_upgrade`, `suggested_next_mode`, etc.
   - File: `apps/api/src/services/monthlyWrappedService.ts`.

2. Monthly wrapped is generated during monthly mode-upgrade aggregation.
   - File: `apps/api/src/services/modeUpgradeMonthlyAggregationService.ts`.

3. Rewards history endpoint currently returns monthly wrapups only.
   - File: `apps/api/src/controllers/users/rewards-history.ts`.

### Implications

- Future monthly wrapped correctness is downstream of calibration correctness and mode aggregation snapshots for each period.
- Past persisted wrapped payloads are stored JSON snapshots; mode changes later should not mutate already persisted periods unless regeneration is explicitly run.

---

## 10. Database tables and fields involved

## Confirmed tables/fields directly involved

1. **`users`**
   - `game_mode_id` (current mode source)
   - `image_url`, `avatar_url` (onboarding updates these together with mode)

2. **`cat_game_mode`**
   - `game_mode_id`, `code`, `weekly_target`

3. **`user_game_mode_history`**
   - change history with `effective_at`, `source`
   - trigger-populated from `users.game_mode_id` updates

4. **`task_difficulty_recalibrations`**
   - stores analyzed period, `game_mode_id`, `expected_target`, `completion_rate`, action

5. **`user_monthly_mode_upgrade_stats`**
   - period-level upgrade eligibility stats by user + mode

6. **`user_game_mode_upgrade_suggestions`**
   - suggestion state with accepted/dismissed timestamps per period/current_mode

7. **`monthly_wrapped`**
   - payload and summary include mode and upgrade-related data

8. **`v_user_daily_energy`** (view)
   - mode-dependent computation per user

## Schema source caveat

- `apps/api/db-snapshot.json` includes `users`, `cat_game_mode`, and `v_user_daily_energy`, but does **not** include newer upgrade/calibration tables, indicating snapshot staleness versus current migrations.

---

## 11. Recalculation / cache implications

### Live-derived (likely no explicit recompute needed)

- `/users/me` and most dashboard mode chips/avatar/video/art update on next profile fetch.
- Daily energy endpoint computes on read.

### Cached/stored outputs requiring attention

1. **`getUserState` in-memory cache (5 min TTL)** may return stale mode/target-derived state immediately after mode change.
2. **`user_monthly_mode_upgrade_stats` and `monthly_wrapped`** are persisted outputs from scheduled/admin aggregation runs; they won’t auto-refresh on accept.
3. **Task recalibration history** already written for past periods won’t change unless backfilled/re-run.

### Practical implication

- Accept flow should at minimum refresh frontend profile/suggestion state (already wired).
- Decide whether to add server-side cache invalidation for user-state, and whether any near-real-time aggregate recompute is desired (likely not mandatory for accept itself).

---

## 12. Historical mode correctness requirements

To avoid rewriting history after a mode upgrade:

1. **Period analytics must use mode-at-period**, not latest mode.
   - Already true in `modeUpgradeAnalysisService`.
   - Not fully true in `taskDifficultyCalibrationService` currently.

2. **Streak/insights interpretation needs explicit rule**:
   - If historical accuracy is required, weekly hit thresholds must be resolved per week-period from history.
   - Current implementation uses runtime mode/weeklyGoal query values.

3. **Wrapped/monthly summaries should stay immutable per period** unless explicitly regenerated with a migration/backfill policy.

---

## 13. Recommended implementation strategy for "Accept Upgrade"

1. **Keep users table update as the single source mutation** (`users.game_mode_id`) and rely on DB trigger for history row.
2. **Retain transaction boundaries** around mode update + suggestion acceptance state.
3. **Align avatar/image policy**:
   - Decide if accept should mirror onboarding behavior and update `image_url`/`avatar_url` to new mode image.
4. **Ensure UI refresh contract**:
   - Re-fetch `/users/me`, suggestion payload, and any mode-sensitive panels after accept (dashboard already reloads profile).
5. **Protect historical analytics**:
   - Fix calibration history selection to resolve mode as-of analyzed period end.
6. **Document streak interpretation rule** (current-mode vs period-aware) before shipping, since this is currently ambiguous and user-visible.
7. **Optional**: invalidate `getUserState` cache entry after accept to avoid temporary stale state responses.

---

## 14. Open questions / unknowns / risks

### Open questions

1. Should accepting upgrade also remap `users.image_url` / `avatar_url` exactly like onboarding?
2. For streak panel and task insights, do product requirements demand historical threshold correctness or “today’s mode lens” behavior?
3. Should mode upgrade acceptance trigger any immediate recalibration job, or remain passive until monthly cron/admin runs?

### Confirmed/likely risks

1. **History drift risk**: if mode changes without trigger (e.g., manual DB writes bypassing trigger), period analyses break.
2. **Historical reinterpretation risk**: streak/insights currently can reinterpret older periods using new mode tier.
3. **Calibration mismatch risk**: latest-history-row selection can apply wrong weekly target to past analysis period.
4. **UI consistency risk**: chip/mode text may update while avatar URL stays old if accept path doesn’t update image fields.
5. **Cache staleness risk**: `/users/:id/state` may lag up to 5 minutes after mode change due to TTL cache.
6. **Aggregate divergence risk**: admin/debug/summary outputs (`user_monthly_mode_upgrade_stats`, `monthly_wrapped`) can diverge from real-time UI until next aggregation cycle.
