# Rhythm + Avatar Decoupling Impact Audit (2026-04-13)

## Scope and framing
- Objective audited: keep `game_mode` as internal intensity/math source-of-truth while introducing an independent `avatar` concept for user-facing visuals.
- Repo areas reviewed: API write/read contracts, onboarding, dashboard/post-login UI, landing/demo pages, and missions visual systems.
- Guiding constraint preserved: no destructive rename of existing backend `game_mode` schema/contracts in V1.

---

## A) SAFE TO KEEP AS-IS

These files are intensity/math oriented and can remain as-is in V1 (except potential naming copy in responses, if desired):

1. **Intensity + weekly target math (no avatar coupling)**
   - `apps/api/src/routes/users/daily-energy.ts`
     - Uses `profile.modeCode` and `profile.weeklyTarget` only for decay/targets (`computeHalfLife`, `computeDailyTargets`).
   - `apps/api/src/services/taskDifficultyCalibrationService.ts`
     - Resolves historical/current mode context from `user_game_mode_history` + `cat_game_mode.weekly_target` for recalibration decisions.
   - `apps/api/src/services/modeUpgradeAnalysisService.ts`
     - Builds period segments by mode history and computes expected task counts/upgrade eligibility.
   - `apps/api/src/services/modeUpgradeMonthlyAggregationService.ts`
     - Aggregates by `game_mode_id` and target for upgrade reporting.
   - `apps/api/src/services/previewAchievementService.ts`
     - Resolves weekly target using historical mode where available.

2. **Task generation intensity context (no visual identity logic)**
   - `apps/api/src/lib/taskgen/runner.ts`
     - Resolves game mode catalog context (`code`, `weekly_target`) for generation prompts and logic, not for theming.

3. **Mode history plumbing (critical to preserve untouched)**
   - `apps/api/src/db/migrations/202603090001_task_difficulty_recalibration.sql`
     - Trigger `trg_users_game_mode_history` auto-persists changes to `users.game_mode_id`.

**Conclusion:** keep these unchanged functionally in V1; they align with “`game_mode` = behavioral intensity + calculations”.

---

## B) MUST DECOUPLE

These currently mix rhythm/intensity with visual identity (avatar, color, media):

1. **Central mode metadata currently bundles intensity + visuals in one object**
   - `apps/web/src/lib/gameModeMeta.ts`
     - `frequency` (intensity label) and `accentColor`/`avatarSrc`/`avatarAlt` (visual identity) are co-located per mode.

2. **Dashboard profile avatar video is mode-bound (1 avatar per mode assumption)**
   - `apps/web/src/components/dashboard-v3/ProfileCard.tsx`
     - `MODE_VIDEO_BY_GAME_MODE` maps each game mode directly to one avatar video.

3. **Dashboard “change game mode” selector doubles as visual/identity selector**
   - `apps/web/src/components/dashboard-v3/DashboardMenu.tsx`
     - Mode cards render `accentColor` stripe + `avatarSrc` image from mode metadata.

4. **Streaks visual chip theme bound to mode palette**
   - `apps/web/src/components/dashboard-v3/StreaksPanel.tsx`
     - `MODE_CHIP_STYLES` and class variants (`--low/chill/flow/evolve`) tie color/glow directly to mode.

5. **Missions board art skins are mode-bound (1 media skin per mode)**
   - `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`
   - `apps/web/src/components/dashboard-v3/MissionsV3Board.tsx`
     - `MISSION_ART_BY_SLOT_AND_MODE` selects assets by `(slot, gameMode)`.

6. **Onboarding quick-start and preview cards color logic tied to mode accent**
   - `apps/web/src/onboarding/quickStart.ts`
   - `apps/web/src/onboarding/IntegratedQuickStartFlow.tsx`
   - `apps/web/src/pages/QuickStartPreview.tsx`
     - Soft styles/gradients/glows derive from mode accent colors.

7. **Onboarding mode selection cards are visual identity selector today**
   - `apps/web/src/onboarding/steps/GameModeStep.tsx`
     - Uses `GAME_MODE_META` accent + avatar image in mode cards.

8. **Landing/demo visuals assume mode = avatar identity**
   - `apps/web/src/pages/Landing.tsx`
     - `MODE_VISUALS` binds each mode to video/image/thumbnail and expression copy.

---

## C) BACKEND / DATA CHANGES NEEDED (minimum additive V1)

### C1. Data model (additive, no destructive renames)
1. **Add `avatar_id` to `users` (nullable first, then backfill + not-null later if desired).**
   - Current `users` schema has `avatar_url`/`image_url` and `game_mode_id`, but no independent avatar identifier.
   - File baseline: `apps/api/src/db/schema/users.ts`.

2. **Add avatar catalog table (`cat_avatar`)**
   - Suggested fields: `avatar_id`, `code`, `name`, `theme_tokens jsonb`, `active`, timestamps.

3. **(Optional but recommended) Add avatar assets table (`cat_avatar_asset`)**
   - Keyed by `(avatar_id, rhythm_code)` for expression variants:
   - fields: `video_url`, `image_url`, `thumb_url`, `expression_key`, `version`.

### C2. API contracts
1. **Expand `/users/me` to return independent avatar identity.**
   - Current contract returns `image_url`, `game_mode`, `weekly_target` only.
   - File: `apps/api/src/controllers/users/get-user-me.ts` and frontend type mirror `apps/web/src/lib/api.ts`.
   - Add fields: `avatar_id` (required once migrated), and optionally `avatar_code`, `avatar_theme`, `avatar_assets` (or a separate endpoint).

2. **Keep `game_mode` and `weekly_target` untouched for math behavior.**
   - Required for all current calculations and analytics continuity.

3. **Add avatar write endpoint (new, additive):**
   - e.g., `PUT /users/me/avatar` or `/avatar/select`.
   - Must not mutate `game_mode_id`.

### C3. Game mode write path changes
1. **Stop mode changes from mutating visual identity fields in V1 decoupled state.**
   - Current writer `changeUserGameMode(...)` updates `game_mode_id` **and** `image_url`/`avatar_url`.
   - File: `apps/api/src/services/userGameModeChangeService.ts`.

2. **Decouple onboarding side-effects.**
   - `submitOnboardingIntro(...)` calls mode change writer; today this also remaps avatar/image by mode.
   - File: `apps/api/src/services/onboardingIntroService.ts`.

3. **Preserve mode-history trigger behavior.**
   - Keep `users.game_mode_id` updates as canonical source for `user_game_mode_history`.

### C4. Onboarding progress event model
- Add optional progress step/timestamp for avatar selection, e.g. `avatar_selected_at`.
- Baseline file with current steps: `apps/api/src/db/migrations/202603130003_user_onboarding_progress.sql` and frontend type `apps/web/src/lib/api.ts`.

---

## D) FRONTEND RENDERING CHANGES NEEDED

### D1. Introduce avatar-render model
1. Add frontend `AvatarProfile` model (from API) with:
   - `avatarId/code`
   - `theme` tokens (accent/chip/glow/gradient)
   - per-rhythm expression media map (`LOW|CHILL|FLOW|EVOLVE`).

2. Add helpers:
   - `resolveAvatarTheme(avatar, rhythm)`
   - `resolveAvatarMedia(avatar, rhythm, surface)`

### D2. Components to switch from mode-based visuals to avatar-based visuals
1. `apps/web/src/components/dashboard-v3/ProfileCard.tsx`
   - Replace `MODE_VIDEO_BY_GAME_MODE` with avatar media lookup by `(avatar, rhythm)`.

2. `apps/web/src/components/dashboard-v3/DashboardMenu.tsx`
   - Mode picker should show rhythm/intensity info only.
   - Add separate avatar picker UI (or separate settings surface).

3. `apps/web/src/components/dashboard-v3/StreaksPanel.tsx`
   - Keep weekly goal logic driven by rhythm.
   - Move chip color/glow classes to avatar theme tokens.

4. `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`
   - `MISSION_ART_BY_SLOT_AND_MODE` should become avatar-theme driven with rhythm expression variant.

5. `apps/web/src/components/dashboard-v3/MissionsV3Board.tsx`
   - Same as V2 board.

6. `apps/web/src/onboarding/steps/GameModeStep.tsx`
   - Keep rhythm selection labels/frequency/objective logic.
   - Remove implicit “this also chooses your avatar identity” assumption; either hide avatar or show neutral rhythm cards.

7. `apps/web/src/onboarding/IntegratedQuickStartFlow.tsx`
8. `apps/web/src/pages/QuickStartPreview.tsx`
9. `apps/web/src/onboarding/quickStart.ts`
   - Move soft-tint/border/glow from mode accent to avatar theme.

   - Keep rhythm explainer but decouple demo media from mode-only identity; represent avatar + expression-by-rhythm.

### D3. Global CSS tokens currently mode-specific
- `apps/web/src/index.css` includes mode chip classes (`ib-streak-mode-chip--low/chill/flow/evolve` etc.).
- Replace with avatar/theme tokenized classes or CSS variables fed by avatar.

---

## E) COPY / UX CHANGES NEEDED

1. **Dashboard menu and upgrade copy still references “Game Mode” heavily**
   - `apps/web/src/i18n/post-login/dashboard.ts`.

2. **Info tips mention “game mode” in streak explanation**
   - `apps/web/src/content/infoTips.ts`.

3. **Onboarding generating screen still says “Activating your game mode”**
   - `apps/web/src/onboarding/screens/JourneyGeneratingScreen.tsx`.

4. **Fallback dashboard card subtitle still says “Foto y game mode”**
   - `apps/web/src/pages/DashboardV3.tsx`.

5. **Demo and labs mode selectors still use game mode naming**
   - `apps/web/src/pages/LabsDemoModeSelect.tsx` and landing selectors.

### Partial support already present (good news)
- Onboarding copy already frames selection as rhythm/intensity:
  - `apps/web/src/onboarding/steps/GameModeStep.tsx` (“Choose your rhythm”, “intensidad semanal”).
- Marketing content already uses “weekly rhythm” framing:
  - `apps/web/src/content/officialLandingContent.ts`.

---

## F) HIGH-RISK GAPS

1. **Core architectural trap: shared writer updates both intensity + identity**
   - `changeUserGameMode` currently mutates `image_url` and `avatar_url` alongside `game_mode_id`.
   - If left unchanged, any rhythm update silently overwrites avatar identity.

2. **Hidden contract coupling in `/users/me`**
   - Frontend currently only gets `image_url`, `game_mode`, `weekly_target`; many components infer visuals from `game_mode` fallback.
   - Without adding `avatar_id` and adoption plan, UI drift/inconsistency is likely.

3. **Missions and profile surfaces could diverge visually**
   - Profile avatar video, mission art, streak chip colors currently each compute from mode in separate files; partial migration can produce mixed identity.

4. **Historical logic correctness risk if someone repurposes `game_mode` semantics**
   - Services depending on `user_game_mode_history` (calibration/upgrade analytics/preview achievement) will break conceptually if `game_mode` gets polluted with visual concerns.

5. **Task insights endpoint uses request query mode for weekly-goal hit timeline**
   - `apps/api/src/routes/tasks.ts` takes `mode`/`weeklyGoal` query rather than historical mode context.
   - After decoupling, frontend must ensure it passes rhythm correctly and does not conflate avatar state.

6. **Onboarding progress telemetry lacks avatar milestone**
   - Cannot reliably debug adoption funnel if avatar is independent but not tracked.

7. **Native/mobile callback identity field (`image_url`) may remain stale**
   - `apps/web/src/pages/MobileBrowserAuth.tsx` forwards Clerk `image_url`; can conflict with product avatar identity if both are shown in UX.

---

## G) RECOMMENDED V1 IMPLEMENTATION ORDER (low-risk incremental)

1. **Data-first additive phase**
   - Add `avatar_id` (+ avatar catalogs) and extend `/users/me` response with avatar fields.
   - Keep old fields untouched for compatibility.

2. **Read-path introduction (no behavior changes yet)**
   - Add frontend avatar model/types in `apps/web/src/lib/api.ts` and consume in `useBackendUser`.
   - Do not remove `game_mode` usage yet.

3. **Split visual resolver layer**
   - Implement central `avatarVisualResolver` and theme token helpers.
   - Migrate `ProfileCard`, `StreaksPanel`, and missions boards to resolver.

4. **Decouple write-path safely**
   - Refactor `changeUserGameMode` so mode updates no longer overwrite avatar/image identity.
   - Introduce explicit avatar update endpoint + service.

5. **Onboarding sequence split**
   - Keep rhythm step as-is (intensity).
   - Add avatar choice step (or default avatar assignment) with `avatar_selected_at` tracking.

6. **Copy/label sweep**
   - Replace “game mode” in user-facing strings with “rhythm”/“weekly intensity” where appropriate.
   - Preserve internal/backend naming.

7. **Compatibility cleanup**
   - Keep temporary fallback: if no `avatar_id`, map legacy mode -> default avatar once.
   - Add one-time migration/backfill to avoid null rendering edge cases.

8. **Regression suite focus**
   - Verify: mode change affects only weekly target/behavior; avatar change affects only visuals.
   - Validate onboarding, upgrade acceptance, missions skins, streak chips, profile card, and landing demos.

---

## Explicit “mode = avatar” assumptions found

- `game mode -> avatar media` direct maps in:
- `game mode -> color theme` direct maps in:
  - `gameModeMeta`, `StreaksPanel`, quick-start style maps.
- `game mode change -> avatar/image persistence mutation` in:
  - `userGameModeChangeService` (called by onboarding, in-app change, upgrade accept, admin override).

These are the highest-priority decoupling points.
