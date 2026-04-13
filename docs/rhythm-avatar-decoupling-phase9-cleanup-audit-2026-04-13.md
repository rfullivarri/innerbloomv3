# Rhythm + Avatar Decoupling — Phase 9 Cleanup Audit (Focused)

Date: 2026-04-13  
Scope: shared metadata (`gameModeMeta.ts`), resolver fallback paths, and residual mode-derived visual assumptions.  
Constraints honored: missions explicitly excluded from this audit and cleanup order.

---

## A) Exact files still depending on visual fields from `gameModeMeta`

### Direct consumers of visual fields from `GAME_MODE_META`
1. `apps/web/src/onboarding/IntegratedQuickStartFlow.tsx`
   - Uses `GAME_MODE_META.<Mode>.accentColor` to derive `MODE_ACCENT` and `MODE_SOFT_STYLES` for onboarding visuals.
2. `apps/web/src/pages/QuickStartPreview.tsx`
   - Uses `GAME_MODE_META.<Mode>.accentColor` to derive `MODE_ACCENT` and `MODE_SOFT_STYLES` for preview visuals.
3. `apps/web/src/config/labsGameModes.ts`
   - Uses `GAME_MODE_META.<Mode>.accentColor` to populate per-mode labs card accents.

### Source metadata that still carries visual coupling
4. `apps/web/src/lib/gameModeMeta.ts`
   - Still defines visual fields (`accentColor`, `avatarSrc`, `avatarAlt`) inside shared mode metadata.

### Important current-state note
- No current runtime consumer was found for `GAME_MODE_META.*.avatarSrc` or `GAME_MODE_META.*.avatarAlt`; only `accentColor` is still read externally.

---

## B) `gameModeMeta` fields: survive vs remove/deprecate

### Should survive (rhythm semantics)
- `frequency`
- `state`
- `objective`
- `title` (optional to keep; may be renamed later for rhythm-copy clarity, but not a visual identity field)
- `GAME_MODE_ORDER` export

### Should be removed/deprecated from `gameModeMeta`
- `accentColor` (move to avatar/theme resolver path)
- `avatarSrc` (remove from mode metadata; avatar/media resolver should own this)
- `avatarAlt` (remove from mode metadata; avatar/media resolver should own this)

### Recommended deprecation mechanics
1. Mark visual fields as deprecated immediately in comments/types.
2. Remove remaining `accentColor` consumers (A-list files).
3. Convert `GameModeMeta` to rhythm-only type.
4. Delete deprecated fields and any dead assets/constants after callsites are migrated.

---

## C) Resolver fallback paths still depending on mode-derived identity

### Primary fallback resolver (`avatarProfile.ts`)
1. `resolveAvatarProfile(profile)`
   - Uses `profile.game_mode` (`normalizeRhythm(profile.game_mode)`) to choose legacy fallback identity (`avatarCode`, `avatarName`, `theme`) when avatar fields are missing.
2. `resolveAvatarMedia(profile, options)`
   - Uses rhythm-keyed `LEGACY_MEDIA_BY_RHYTHM` as base media.
   - Even when `avatar_id` exists, media is still rhythm-fallback placeholder keyed by mode/rhythm.
3. `resolveLegacyAvatarFallback(gameMode)`
   - Explicit mode -> legacy identity mapping path.

### Secondary fallback selector (`avatarCatalog.ts`)
4. `resolveAvatarOption(avatarProfile, currentMode)`
   - If `avatarId`/`avatarCode` cannot resolve, falls back to `AVATAR_FALLBACK_BY_MODE[currentMode ?? 'Chill']`.

### UI path that still triggers mode-based fallback selection
5. `DashboardMenu.tsx`
   - `resolveMenuAvatarSelection(...)` passes `currentMode` to `resolveAvatarOption(...)`, enabling mode-derived fallback identity when avatar payload is incomplete.

---

## D) Safest cleanup order (post upgrade/recommendation fixes, missions excluded)

1. **Lock and observe fallback usage first (no behavior change)**
   - Add explicit telemetry/log counters around:
     - `resolveAvatarProfile(...).isLegacyFallback`
     - `resolveAvatarOption(...)` mode fallback branch
   - Goal: verify real traffic still hitting mode-derived identity fallback.

2. **Remove remaining `GAME_MODE_META.accentColor` consumers**
   - Migrate:
     - `IntegratedQuickStartFlow.tsx`
     - `QuickStartPreview.tsx`
     - `labsGameModes.ts`
   - Use avatar theme tokens or neutral rhythm-safe tokens depending on surface intent.

3. **Split `gameModeMeta` to rhythm-only contract**
   - Keep only rhythm text/frequency/objective semantics.
   - Introduce type-level compile break for `accentColor`/`avatarSrc`/`avatarAlt` usage.

4. **Retire mode-derived identity fallback in resolver layer**
   - Update `resolveAvatarProfile` to prefer explicit default avatar identity (non-mode-derived) when avatar payload missing.
   - Update `resolveAvatarOption` fallback to default-avatar policy (not `currentMode`).

5. **Finalize media fallback policy**
   - Keep rhythm as expression selector only when avatar identity already resolved.
   - Ensure missing-avatar fallback does not infer avatar identity from rhythm/mode.

6. **Delete deprecated mode-visual fields**
   - Remove `accentColor`, `avatarSrc`, `avatarAlt` from `gameModeMeta.ts`.
   - Remove dead constants/assets and adjust affected tests.

---

## E) Recommended Prompt 9

> Read these docs first and treat them as source of truth:
> - `docs/rhythm-avatar-decoupling-feature-spec-v1.md`
> - `docs/rhythm-avatar-decoupling-impact-audit-2026-04-13.md`
> - `docs/rhythm-avatar-decoupling-frontend-drift-audit-2026-04-13-phase2-followup.md`
> - `docs/rhythm-avatar-decoupling-scope-freeze-2026-04-13.md`
> - `docs/rhythm-avatar-decoupling-phase9-cleanup-audit-2026-04-13.md`
>
> Assume dashboard/onboarding/rhythm-avatar split work is already merged.
>
> TASK
> Implement Phase 9 cleanup for shared metadata + fallback only:
> 1) remove remaining `GAME_MODE_META.accentColor` usage from:
>    - `apps/web/src/onboarding/IntegratedQuickStartFlow.tsx`
>    - `apps/web/src/pages/QuickStartPreview.tsx`
>    - `apps/web/src/config/labsGameModes.ts`
> 2) convert `apps/web/src/lib/gameModeMeta.ts` to rhythm-only fields (no visual fields).
> 3) remove mode-derived identity fallback from:
>    - `apps/web/src/lib/avatarProfile.ts`
>    - `apps/web/src/lib/avatarCatalog.ts`
>    while keeping safe defaults for missing avatar payloads.
>
> STRICT RULES
> - Do NOT touch missions.
> - Do NOT change rhythm math/weekly target/upgrade eligibility behavior.
> - Keep rhythm content and labels intact.
>
> DONE WHEN
> - no consumer reads `GAME_MODE_META.*.accentColor|avatarSrc|avatarAlt`
> - no avatar identity fallback depends on `game_mode` / `currentMode`
> - TypeScript/tests updated and passing.
>
> OUTPUT REQUIRED
> - file-by-file change summary
> - explicit list of removed fallbacks
> - risk notes + rollback plan

