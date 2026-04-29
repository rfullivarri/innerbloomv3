# Rhythm + Avatar Decoupling — Frontend Drift Audit (Phase 2 Follow-up)

Date: 2026-04-13  
Scope: targeted audit for remaining frontend consumers that still read legacy visual fields directly or infer visuals from `game_mode`/mode constants instead of avatar resolver primitives.

Source-of-truth references used:
- `docs/rhythm-avatar-decoupling-feature-spec-v1.md`
- `docs/rhythm-avatar-decoupling-impact-audit-2026-04-13.md`

Assumptions honored:
- Phase 1 + Phase 2 + resolver scaffold + Change Avatar menu were already merged.

---

## A) Remaining files/components still using legacy visual fields directly

### Direct legacy field transport (frontend)
1. `apps/web/src/pages/MobileBrowserAuth.tsx`
   - Still forwards `image_url` in native callback query params from Clerk user image (`user.imageUrl`).
   - This is a direct legacy visual field path and can conflict with product avatar identity if downstream clients treat `image_url` as canonical avatar identity.

### API contract surfaces that still expose legacy visual fields
(These are type definitions, not direct rendering, but keep legacy field pathways alive.)
1. `apps/web/src/lib/api.ts`
   - `CurrentUserProfile` / related payload types include `image_url` and `avatar_url`.
2. `apps/web/src/lib/adminApi.ts`
   - admin-facing user payload types include `image_url` and `avatar_url`.

---

## B) Remaining files/components still inferring visuals directly from game mode

### Shared mode-visual metadata root
1. `apps/web/src/lib/gameModeMeta.ts`
   - Still co-locates rhythm text with visual tokens (`accentColor`, `avatarSrc`, `avatarAlt`), preserving mode=visual identity coupling at the metadata layer.

### Dashboard / post-login surfaces
1. `apps/web/src/components/dashboard-v3/DashboardMenu.tsx`
   - Game mode cards render left accent stripes and avatar images from `GAME_MODE_META`.
   - Avatar picker cards also derive preview visuals via `previewMode -> GAME_MODE_META`.
2. `apps/web/src/components/dashboard-v3/UpgradeRecommendationModal.tsx`
   - Upgrade modal uses mode metadata avatar images for current/next recommendation cards.
3. `apps/web/src/components/dashboard-v3/StreaksPanel.tsx`
   - Uses mode-keyed chip classes (`ib-streak-mode-chip--low/chill/flow/evolve`).
4. `apps/web/src/index.css`
   - Declares mode-specific chip theme classes consumed by StreaksPanel.
5. `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`
   - `MISSION_ART_BY_SLOT_AND_MODE` still hard-binds mission art by `(slot, mode)`.
6. `apps/web/src/components/dashboard-v3/MissionsV3Board.tsx`
   - Same mode-bound mission art mapping.

### Onboarding / quick-start flows
1. `apps/web/src/onboarding/steps/GameModeStep.tsx`
   - Rhythm selection cards still render mode accent + mode avatar media from `GAME_MODE_META`.
2. `apps/web/src/onboarding/IntegratedQuickStartFlow.tsx`
   - Uses mode accent map from `GAME_MODE_META` for soft tint visual logic.
3. `apps/web/src/pages/QuickStartPreview.tsx`
   - Uses mode accent map from `GAME_MODE_META`.
4. `apps/web/src/onboarding/steps/QuickStartSummaryStep.tsx`
   - Reads mode metadata copy/state directly.
5. `apps/web/src/onboarding/steps/SummaryStep.tsx`
   - Mode-branch rendering (`mode === LOW/CHILL/FLOW/EVOLVE`) for mode-specific visual blocks.

### Landing/demo/labs surfaces
1. `apps/web/src/pages/Landing.tsx`
   - `MODE_VISUALS` maps each mode to avatar image/video assets and expression copy.
   - Same `MODE_VISUALS` pattern with mode-bound avatar media.
3. `apps/web/src/config/labsGameModes.ts`
   - Lab mode configs pull `accentColor` from `GAME_MODE_META`.

### Resolver scaffold residual coupling (fallback behavior)
1. `apps/web/src/lib/avatarProfile.ts`
   - `resolveAvatarProfile` falls back to `profile.game_mode` when `avatar_id` is missing (`isLegacyFallback`).
   - This is expected as a phase-safe fallback, but still a mode-derived visual inference path.

---

## C) High-risk surfaces to migrate next

High risk = user-facing drift likely, broad blast radius, or inconsistent identity after independent avatar changes.

1. **`DashboardMenu.tsx`**
   - High-traffic control surface for both rhythm and avatar changes; still renders mode-derived visuals in both modals.
2. **`StreaksPanel.tsx` + `index.css` mode chip classes**
   - Chips are explicitly required by spec to be rhythm content + avatar styling; currently opposite styling driver.
3. **`MissionsV2Board.tsx` + `MissionsV3Board.tsx`**
   - Heavy visual surface, currently locked to mode art maps; high chance of mixed identity if profile/menu migrate faster than missions.
4. **`GameModeStep.tsx` + `IntegratedQuickStartFlow.tsx` + `QuickStartPreview.tsx`**
   - Onboarding visual framing can reintroduce mode=avatar mental model for new users.
5. **`MobileBrowserAuth.tsx` legacy `image_url` forwarding**
   - Cross-platform identity drift risk if native side continues consuming this as avatar.

---

## D) Surfaces that can safely wait (lower-risk / post-core)

1. **Marketing/demo pages**
   - Important for consistency, but not core authenticated product behavior.
2. **`QuickStartSummaryStep.tsx` + `SummaryStep.tsx`**
   - Secondary onboarding summary polish compared with primary selection and dashboard surfaces.
3. **Type-only legacy fields in `lib/api.ts` and `lib/adminApi.ts`**
   - Can remain during compatibility window if writers/readers no longer treat them as canonical.

---

## E) Recommended next migration order (targeted)

1. **Unify visual read model in menu + chips first**
   - `DashboardMenu.tsx`, `StreaksPanel.tsx`, `index.css`.
   - Replace `GAME_MODE_META` visuals + mode chip classes with avatar-theme tokens/resolver output.

2. **Migrate missions art resolver next**
   - `MissionsV2Board.tsx`, `MissionsV3Board.tsx`.
   - Replace `MISSION_ART_BY_SLOT_AND_MODE` with avatar-first resolver (`avatar, rhythm, slot`).

3. **Fix onboarding identity framing**
   - `GameModeStep.tsx`, `IntegratedQuickStartFlow.tsx`, `QuickStartPreview.tsx`.
   - Keep rhythm cards textual/intensity-led; move visual accents/media to avatar resolver (or neutral placeholders when avatar not selected).

4. **Harden cross-platform identity contracts**
   - `MobileBrowserAuth.tsx` callback payload usage.
   - Stop sending/consuming legacy `image_url` as product avatar identity where possible.

5. **Clean shared legacy metadata and deferred surfaces**
   - Refactor `gameModeMeta.ts` to rhythm-only semantics (no avatar media/colors).
   - Then migrate `UpgradeRecommendationModal.tsx`, landing/demo, labs config, and summary screens.

6. **Finalize fallback retirement**
   - In `avatarProfile.ts`, keep mode fallback only until `avatar_id` coverage is guaranteed; then remove mode-derived fallback paths.

---

## Quick conclusion

Decoupling foundation exists, but **mode-derived visual assumptions remain widespread in frontend render paths**. The next safest sequence is dashboard controls/chips → missions → onboarding primary flows → cross-platform callback identity → metadata/demo cleanup.


## Update 2026-04-14 (resolved in this phase)

- ✅ `UpgradeRecommendationModal.tsx` no longer uses avatar-driven accents/chips for rhythm upgrade visuals.
- ✅ `DashboardMenu.tsx` and banner CTA now open the same rhythm-only modal contract and share the same neutral placeholder model for current/next rhythm visuals.
- ✅ Forced CTA rule was hardened: admin override controls CTA visibility and only allows the next sequential valid rhythm from the user's real current mode (LOW→CHILL, CHILL→FLOW, FLOW→EVOLVE, EVOLVE→none).
- ✅ Accept path now validates against the user's real current mode to avoid stale/invalid forced combinations and prevent 409 conflicts caused by fake forced current state.
