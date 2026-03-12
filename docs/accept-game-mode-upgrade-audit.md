# Accept Game Mode Upgrade Flow Audit

## 1) Executive summary

### Confirmed
- **Current mode source of truth is `users.game_mode_id`** (with mode metadata from `cat_game_mode`). Reads across `/users/me`, user-state, streak/pillars logic, and upgrade suggestion logic resolve from this relation.
- **History is persisted automatically by DB trigger**: when `users.game_mode_id` changes, trigger `trg_users_game_mode_history` inserts a row in `user_game_mode_history` with `effective_at = NOW()`.
- There are currently **two write paths that change mode**:
  1) onboarding intro service (`submitOnboardingIntro`) updates `users.game_mode_id` **and** `image_url`/`avatar_url`.
  2) upgrade-accept service (`acceptGameModeUpgradeSuggestion`) updates only `users.game_mode_id` (plus `updated_at`) and marks suggestion `accepted_at`.
- **Upgrade accept already preserves history** (via trigger), but currently **does not synchronize avatar/image URL fields** as onboarding does.
- **XP/GP/Level are unchanged on accept** in current code (accept path only updates mode + suggestion state). Onboarding is different and can insert onboarding XP bonuses.
- **Task difficulty is unchanged on accept** in current code (no task updates in accept path).

### High-risk gap to solve before implementation hardening
- If "Accept Upgrade" is implemented/extended outside the canonical mode writer, you risk divergence between:
  - `users.game_mode_id`
  - `user_game_mode_history`
  - `users.image_url/avatar_url`
  - dashboard surfaces that read `game_mode`/`weekly_target`

---

## 2) Current source of truth

### Canonical persisted value
- `users.game_mode_id` is the persisted current mode.
- Mode code and weekly target are derived by joining `cat_game_mode`.

### Primary read paths (current mode)
- `/users/me` (`getCurrentUser`) returns `game_mode` + `weekly_target` via `users -> cat_game_mode` join.
- `getUserProfile` (used by `/users/:id/state` and daily-energy trend calculation) returns `mode_code`, `mode_name`, `weekly_target` via the same join.
- Upgrade suggestion service (`getUserCurrentMode`) resolves `current_mode` from `users.game_mode_id`.

### Canonical write path today
- There is no single centralized "setUserGameMode" service yet.
- Current writers are explicit SQL updates in:
  - onboarding intro service
  - mode-upgrade-accept service

---

## 3) Existing onboarding mode-set flow

### Entry point
- Route: `POST /onboarding/intro`
- Service: `submitOnboardingIntro(clerkUserId, payload)`

### Transaction flow (confirmed)
Within one DB transaction (`BEGIN ... COMMIT`), onboarding:
1. Resolves authenticated user (`users.user_id`).
2. Resolves requested mode (`cat_game_mode` by code).
3. Resolves mode image URL via `resolveModeImageUrl` (mode -> static image path + optional `WEB_PUBLIC_BASE_URL`).
4. Upserts onboarding data:
   - `onboarding_session`
   - `onboarding_answers`
   - `onboarding_foundations`
5. Inserts onboarding XP bonuses (idempotent by pillar+source) into `xp_bonus`.
6. **Updates user mode + imagery in one write**:
   - `UPDATE users SET game_mode_id = $2, image_url = $3, avatar_url = $3 WHERE user_id = $1`
7. Upserts free trial subscription if no active/trialing one.
8. Marks journey generation state as `pending`.
9. Commits and asynchronously triggers task generation.

### Side effects to note
- Because onboarding updates `users.game_mode_id`, DB trigger appends `user_game_mode_history`.
- Onboarding modifies much more than mode: onboarding tables, XP bonus, subscription/journey state, task generation trigger.

### Implication for Accept Upgrade
- Reusing onboarding wholesale is **not safe** (it would drag unrelated onboarding side effects).
- But the **mode+avatar write shape** used by onboarding is the visual-consistency baseline.

---

## 4) Mode history audit

### Storage and guarantees
- History table: `user_game_mode_history(user_id, game_mode_id, effective_at, source, created_at, ...)`.
- Baseline migration backfills one history row per user from `users`.
- Trigger function `sync_user_game_mode_history()` inserts on `AFTER UPDATE OF game_mode_id` when value changed and non-null.

### How history is written today
- Not explicitly inserted by onboarding or accept service.
- History append is **implicit via DB trigger**, provided writes go through `users.game_mode_id` update.

### Historical correctness guarantee (current)
- If every mode change goes through `UPDATE users SET game_mode_id = ...`, history append is guaranteed.

### Accept Upgrade safe reuse rule
- Keep mode changes through `users.game_mode_id` updates (ideally via one shared service) to preserve automatic history.
- Avoid any direct edits to `user_game_mode_history` from app code unless introducing audited backfill/repair tooling.

---

## 5) Streaks impact audit (high priority)

## What drives weekly target in streak UI
- `StreaksPanel` derives `tier` as:
  - first choice: `weeklyTarget` prop from `/users/me` (`profile.weekly_target`)
  - fallback: static mode tiers (`Low=1, Chill=2, Flow=3, Evolve=4`)
- The component passes `mode` to `/users/:id/streaks/panel`, but backend currently uses that mode only to convert to a numeric tier; it does **not** read historical mode by date.

### Where "OK this week / not OK" is computed
- In streak list items, status color is computed client-side from `weeklyDone / weeklyGoal`:
  - high: `done >= goal`
  - mid: `done/goal >= 0.5`
  - low otherwise.
- Task insights weekly timeline marks `hit` when `count >= weeklyGoal`.

### Fragile / building / strong
- No explicit fragile/building/strong labels found in current streak panel backend/frontend logic.
- There is a generic `habitHealth.ts` utility (`strong/medium/weak`), but it is not wired into current streak panel flow audited here.

### Mode dependence
- Current streak panel calculations are **current-mode-dependent**, not period-aware mode history dependent.
- Quarter/month decorations use current tier heuristics.

### What must update after mode change
- `weeklyTarget` used by StreaksPanel must refresh (from `/users/me`).
- `mode` passed into streak endpoints/insights must refresh (already tied to dashboard `gameMode` state).
- No DB recompute is required for streak panel itself; it is live-derived from logs + provided tier.

---

## 6) Progress / dashboard / avatar impact audit (high priority)

### Dashboard mode chips
- `MetricHeader` uses `buildGameModeChip(gameMode)` from dashboard `gameMode` prop.
- Dashboard `gameMode` derives primarily from profile `/users/me` (`profile.game_mode`), with fallback to `/users/:id/state` only when profile mode missing.
- Therefore, after accept, **reloading profile is sufficient** to update chip text/style.

### Avatar rendering
- `ProfileCard` selects local video asset by normalized mode (`Low/Chill/Flow/Evolve`) and does not read `users.image_url`.
- So dashboard avatar video updates automatically when `gameMode` prop changes.

### Profile visuals using image/avatar URLs
- Onboarding writes `users.image_url` + `users.avatar_url` for mode-specific still image URL.
- Accept flow currently does **not** update these fields.
- If any surfaces outside `ProfileCard` depend on DB `image_url`/`avatar_url`, they can drift after accept.

### Mode Upgrade CTA lifecycle
- CTA accept calls `/game-mode/upgrade-suggestion/accept` then invokes `onUpgradeAccepted`.
- In dashboard, `onUpgradeAccepted` triggers `reload()` from `useBackendUser`, causing `/users/me` refetch and mode/weekly target refresh.

---

## 7) Daily Energy impact audit (high priority)

### Does Daily Energy depend on current mode?
**Yes.**
- Daily energy trend computation uses `getUserProfile(userId)` -> `modeCode`, then `computeHalfLife(modeCode)`.
- Daily targets also depend on `weeklyTarget`, also sourced from current mode (`cat_game_mode.weekly_target` through user profile).

### Display dependencies
- `EnergyCard` fetches `/users/:id/daily-energy`; no explicit mode prop usage in rendering logic.
- Backend route computes trend live using current profile mode.

### Cache/derived values
- `/users/:id/daily-energy` itself does not use the `SimpleTtlCache` present in `/users/:id/state`; it queries `v_user_daily_energy` and recomputes trend each request.
- `v_user_daily_energy` definition was not located in migrations audited here, so any DB-level materialization/caching behavior is **unknown**.

### Accept Upgrade effect
- After mode change, trend computation should immediately use new half-life and weekly target on subsequent fetches.
- If UI does not refetch, card can appear stale until natural rerender/reload.

---

## 8) Future task calculation impact audit

### Systems immediately affected by new current mode
1. **Streaks panel / task insights UI goal thresholds** (client-driven weekly goal from current mode/weekly target).
2. **Daily Energy trend parameters** (`computeHalfLife`, `computeDailyTargets`).
3. **Any `/users/me` consumers showing mode chips / weekly target.**
4. **Pillars progress API** (`/users/:id/pillars`) computes progress % vs current `gm.weekly_target`.

### Calibration / upgrade analytics and historical mode
- Rolling upgrade analysis (`getRollingModeUpgradeAnalysis`) is period-aware using `user_game_mode_history` segments and should naturally include new mode only from its `effective_at` onward.
- Monthly upgrade aggregation uses `task_difficulty_recalibrations` grouped by recorded `game_mode_id` for each recalibration period; historical periods remain tied to stored mode ids.

### Task difficulty
- Accept path does not alter task difficulty or trigger recalibration jobs.
- Future scheduled/admin recalibrations will use latest history row logic currently implemented in calibration service.

---

## 9) Historical correctness requirements

### Must remain historical (do not reinterpret past with new current mode)
- `user_game_mode_history` must be append-only across changes.
- Rolling mode-upgrade analysis windows should continue segmenting by `effective_at` across change boundaries.
- `task_difficulty_recalibrations` historical rows already store `game_mode_id` used at run time.
- Monthly wrapped/upgrade stats are persisted per period and should not be retroactively rewritten by a later accept.

### Known risk area
- Task difficulty calibration engine currently selects **latest history row overall** (`ORDER BY effective_at DESC LIMIT 1`) without constraining to analysis `period_end`; this can mis-attribute long retrospective admin runs if mode changed after analyzed period.
  - This is an existing risk, not introduced by accept itself.

---

## 10) Cache / recompute requirements

### Confirmed caches/state layers
- Backend `/users/:id/state`: in-process TTL cache (5 min) keyed by user id.
- Backend `/users/:id/state/timeseries`: in-process TTL cache (5 min) keyed by user+range.
- Dashboard profile (`/users/me`) is fetched by hook and can be manually reloaded.

### After accept, minimum refresh actions needed
- **Frontend**: refetch `/users/me` (already done in current CTA path via `onUpgradeAccepted -> reload()`).
- **Optional but recommended**: refresh any currently-mounted widgets that depend on mode-sensitive derived data (state/energy/streak endpoints) if they do not auto-refetch from changed dependencies.

### Recompute jobs
- No mandatory background recompute job is required for correctness of current live-derived surfaces.
- No immediate recalibration job is triggered by accept in current architecture.

---

## 11) Risks of naive implementation

1. **Mode changed but avatar/image fields not synchronized**
   - Current accept updates only `users.game_mode_id`; onboarding updates `image_url/avatar_url` too.
2. **Duplicate write paths drift**
   - Separate logic for onboarding vs accept can diverge (field set, transaction boundaries, guards).
3. **History not appended if bypassing `users.game_mode_id` update**
   - Trigger-based history relies on that exact update path.
4. **UI stale after accept**
   - Without profile/data refresh, chips/weekly target/streak goal/energy visuals may lag.
5. **Historical reinterpretation bug**
   - Any future analytics using only current mode (instead of history by date) can rewrite past interpretation.
6. **Unintended onboarding side effects if onboarding service is reused directly**
   - Could insert XP bonus, mutate onboarding session, set journey generation pending, trigger taskgen, etc.
7. **XP/GP/Level accidental mutation**
   - If accept path incorrectly reuses onboarding XP logic.
8. **Task difficulty accidental mutation**
   - If accept path starts invoking recalibration without clear product requirement.

---

## 12) Recommended implementation plan (safest)

1. **Create one dedicated shared backend service for mode mutation**
   - Input: `userId`, `targetGameModeId` (and optionally expected/current mode id for optimistic concurrency), `source`.
   - Behavior: single transaction, update `users.game_mode_id`, and any required synchronized profile media fields.
   - Both onboarding and accept should call this shared service (with flow-specific wrappers).

2. **Keep history trigger as canonical history writer**
   - Do not manually insert history in app flows.
   - Ensure all mode changes go through `users.game_mode_id` update.

3. **Explicitly decide avatar/image policy for accept**
   - If product expects mode identity parity with onboarding, accept path must update `image_url/avatar_url` consistently (same resolver mapping).

4. **Keep accept side effects minimal**
   - Preserve current scope: mode update + suggestion acceptance mark.
   - Do not alter XP/GP/Level/task difficulty unless explicitly required.

5. **Refresh strategy after accept**
   - Maintain `/users/me` refetch.
   - Optionally trigger soft refresh of streak/energy/state widgets to avoid transient stale cards.

6. **Protect historical analytics**
   - Ensure all period-based analyses keep using history/recorded period mode, not current mode snapshots.
   - Track follow-up to harden calibration query (`effective_at <= period_end`) where needed.

---

## 13) Open questions / unknowns

1. **`v_user_daily_energy` definition** was not located in audited migrations; unknown whether DB-side view/materialization introduces additional staleness concerns.
2. **`users.image_url/avatar_url` runtime consumers** in authenticated app are limited in this audit; confirm whether other clients (mobile, emails, admin, public profile) rely on these fields post-upgrade.
3. **Desired UX refresh depth** after accept:
   - Is `/users/me` reload enough, or should we also force-refresh streak/energy cards instantly?
4. **Calibration historical precision follow-up**:
   - Existing service selects latest history row overall; confirm whether this should be corrected in separate scope.

---

## 13) Final implementation notes

Implemented in this change:

- Added a shared service at `apps/api/src/services/userGameModeChangeService.ts` with:
  - `resolveGameModeByCode(...)`
  - `resolveGameModeImageUrl(...)`
  - `changeUserGameMode(...)`
- The shared writer now updates `users.game_mode_id`, `users.image_url`, and `users.avatar_url` in one statement and intentionally relies on the existing DB trigger to persist `user_game_mode_history`.
- `submitOnboardingIntro(...)` now uses the shared service for game mode mutation (instead of direct `UPDATE users ...`), preserving onboarding behavior while centralizing mode mutation logic.
- `acceptGameModeUpgradeSuggestion(...)` now uses the same shared service, including optimistic concurrency via `expectedCurrentGameModeId`, while still enforcing eligibility/staleness validations and writing `accepted_at`.
- Accept-upgrade route now returns a refreshed suggestion payload (`suggestion`) plus `accepted_suggestion` for immediate frontend state refresh after mode change.

Guardrails preserved:

- XP/GP/Level are not mutated in the shared mode-change path.
- Task difficulty is not changed by this flow.
- Historical periods remain intact because history continues to be appended through the existing trigger on `users.game_mode_id` updates.
