# Rhythm + Avatar Decoupling — Phase 7 Onboarding Split Audit (Rhythm First, Avatar Second)

Date: 2026-04-13  
Scope: **primary onboarding + quick-start** only (no missions)  
Goal: identify exact files, blockers, reuse opportunities, and safest migration order for Prompt 7.

---

## Constraints honored
- Missions are explicitly out of scope for this wave.
- No downstream behavior changes to rhythm (`game_mode`) math, calibration, or upgrade logic.
- Focus is limited to onboarding + quick-start primary flows.

---

## A) Exact onboarding files involved

### Frontend — primary onboarding and quick-start flow surfaces
1. `apps/web/src/onboarding/steps/GameModeStep.tsx`
   - Current Step 1 rhythm selector still renders mode-bound visual identity (`accentColor`, `avatarSrc`) from `GAME_MODE_META`.
2. `apps/web/src/onboarding/IntegratedQuickStartFlow.tsx`
   - Quick-start orchestration and game-mode gate; still imports `GAME_MODE_META` and references rhythm visuals through mode metadata.
3. `apps/web/src/pages/QuickStartPreview.tsx`
   - Preview flow mirrors integrated quick-start logic and still reads mode metadata for visual treatment.
4. `apps/web/src/onboarding/quickStart.ts`
   - Shared quick-start flow/config logic currently tied to game-mode metadata usage patterns.
5. `apps/web/src/onboarding/steps/QuickStartSummaryStep.tsx`
   - Summary uses `GAME_MODE_META` state text and chip driven by selected game mode.
6. `apps/web/src/onboarding/steps/SummaryStep.tsx`
   - Main onboarding summary uses `MODE_CARD_CONTENT` from game-mode step and mode-branch rendering.
7. `apps/web/src/onboarding/screens/JourneyGeneratingScreen.tsx`
   - Final generating screen already rhythm-first copy, but still takes a `gameMode` argument as the displayed behavioral label.

### Frontend — shared models used by onboarding/quick-start
8. `apps/web/src/lib/gameModeMeta.ts`
   - Single strongest coupling point: rhythm labels and identity visuals are co-located.
9. `apps/web/src/lib/avatarProfile.ts`
   - Resolver scaffold exists; still has mode-derived fallback when avatar is absent.
10. `apps/web/src/lib/api.ts`
    - Frontend profile contract carries both rhythm and avatar fields; used by onboarding-adjacent reads.

### Backend — onboarding write path + profile read contract
11. `apps/api/src/services/onboardingIntroService.ts`
    - `submitOnboardingIntro` drives onboarding persistence and marks progress; currently records `game_mode_selected` only.
12. `apps/api/src/services/userGameModeChangeService.ts`
    - Rhythm write service used during onboarding completion; currently safe for rhythm-only mutation.
13. `apps/api/src/controllers/users/get-user-me.ts`
    - `/users/me` read path already returns `avatar_id/code/name/theme_tokens` with legacy fallback.

---

## B) What can be reused as-is

1. **Rhythm behavioral engine contracts**
   - Keep `game_mode` as behavioral source-of-truth and continue calling existing mode update path from onboarding submit.
2. **Existing game-mode onboarding progression semantics**
   - Keep `game_mode_selected` progress checkpoint for Phase 7; add avatar milestone additively.
3. **Journey generating step behavior and copy pattern**
   - `JourneyGeneratingScreen` already frames activation as rhythm, so no structural split needed there.
4. **Avatar resolver foundation**
   - Reuse `resolveAvatarProfile`, `resolveAvatarTheme`, `resolveAvatarMedia` as read abstraction instead of introducing new ad-hoc onboarding mappings.
5. **`/users/me` avatar payload**
   - Existing response already includes avatar identity fields and fallback mapping; enough to wire avatar step without backend schema redesign in Prompt 7.

---

## C) What must be separated for Phase 7

1. **Rhythm step UI content vs visual identity content**
   - In `GameModeStep.tsx`, keep rhythm/frequency/objective/state as-is, but remove mode-bound avatar image + accent as identity source.
2. **Quick-start gate sequencing**
   - In `IntegratedQuickStartFlow.tsx` and `QuickStartPreview.tsx`, split step order to:
     - Step 1: rhythm selection
     - Step 2: avatar selection
     - then existing quick-start body/mind/soul flow.
3. **Summary composition**
   - In `QuickStartSummaryStep.tsx` and `SummaryStep.tsx`, show rhythm data from rhythm selection and avatar visuals/theme from avatar resolver independently.
4. **Shared metadata responsibilities**
   - In `gameModeMeta.ts`, separate rhythm descriptors from identity media/tokens (or stop consuming visual fields from onboarding path first as a safe intermediate).
5. **Onboarding progress telemetry**
   - In `onboardingIntroService.ts` and onboarding progress model, add an additive avatar milestone (e.g., `avatar_selected`) so split funnel is observable.

---

## D) Biggest blockers / risks

1. **Single-object metadata coupling (`gameModeMeta`)**
   - Most onboarding surfaces inherit mode=avatar assumption from one import; partial migration risks inconsistent visuals.
2. **Flow duplication risk between integrated and preview quick-start**
   - `IntegratedQuickStartFlow.tsx` and `QuickStartPreview.tsx` are parallel implementations; changing one without the other causes user-facing drift.
3. **Legacy fallback masking errors**
   - `avatarProfile` fallback to rhythm can hide missing avatar step wiring in QA unless explicitly asserted.
4. **Progress tracking gap for split funnel**
   - Without avatar checkpoint, analytics cannot distinguish “picked rhythm but dropped before avatar”.
5. **Accidental downstream logic changes**
   - If engineers conflate split work with mode writer changes, they can unintentionally impact `game_mode` behavior path; Prompt 7 should explicitly forbid behavior-layer changes.

---

## E) Safest implementation order for Prompt 7

1. **Introduce step contract first (no UI mutation yet)**
   - Define local onboarding step state for `selectedRhythm` and `selectedAvatar` in quick-start flows.
2. **Add avatar selection step UI reusing resolver primitives**
   - Insert between rhythm gate and first pillar screen in both `IntegratedQuickStartFlow.tsx` and `QuickStartPreview.tsx`.
3. **Refactor rhythm step to be intensity-only**
   - Update `GameModeStep.tsx` usage so rhythm cards do not serve as avatar selector.
4. **Update summaries to dual-source rendering**
   - `QuickStartSummaryStep.tsx` + `SummaryStep.tsx`: rhythm chip/content from rhythm, styling/media from selected avatar profile.
5. **Add telemetry checkpoint (additive)**
   - Mark avatar step completion in onboarding progress (without changing existing `game_mode_selected` semantics).
6. **Compatibility guardrails**
   - If avatar missing, fall back to resolver legacy avatar, but log/flag missing explicit avatar selection for QA.
7. **Regression pass on primary flows only**
   - Verify: rhythm change does not mutate avatar; avatar change does not mutate rhythm; onboarding submit still drives existing downstream journey generation unchanged.

---

## Prompt 7 implementation guardrail text (recommended)

Use this exact guardrail language in Prompt 7:

- “Do not touch missions files or mission resolvers.”
- “Keep all downstream rhythm (`game_mode`) behavior unchanged.”
- “Split onboarding/quick-start primary flow into rhythm-first then avatar-second steps.”
- “Use existing avatar resolver/profile contracts; avoid introducing parallel identity mapping logic.”
- “Additive telemetry only: keep existing `game_mode_selected` and add `avatar_selected`.”
