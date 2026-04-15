# Onboarding rhythm visual decoupling (2026-04-15)

## Scope

This update applies to the shared onboarding segment before `path-select`, so it impacts both:

- traditional onboarding
- quick start onboarding

No downstream behavior logic was changed for `game_mode`, calibration, generation, summary, missions, or behavior engines.

## Changes implemented

### 1) Unified rhythm visual identity in onboarding

- Removed per-rhythm color coding from onboarding rhythm selection visuals.
- `LOW`, `CHILL`, `FLOW`, and `EVOLVE` now share the same premium soft-violet selection glow/tint.
- Kept all existing mode-specific content (title, state, objective, frequency) unchanged.

## 2) HUD rhythm badge cleanup

- Removed the colored status dot from the selected rhythm chip.
- The badge now shows text only (`LOW MOOD`, `CHILL MOOD`, `FLOW MOOD`, `EVOLVE MOOD`) with a neutral/violet-soft treatment.

## 3) Traditional question titles cleanup

- Removed colored dots from mode-prefixed question titles.
- `ModeQuestionTitle` still supports parsing `LOW · ...`, `CHILL · ...`, etc.
- When parsed, it renders only the post-prefix question text.
- Titles that do not match the mode-prefix pattern continue to render unchanged.

## 4) Progress gradient refresh

Applied CTA gradient across onboarding progress UI:

- `from-[#a770ef] via-[#cf8bf3] to-[#fdb99b]`

Updated in:

- top progress bar
- HUD mini bars (`Body`, `Mind`, `Soul`)

## 5) Rhythm auto-advance

In `mode-select`:

- selecting a rhythm now persists onboarding state as before
- onboarding auto-advances immediately to `avatar-select`

## 6) Avatar auto-advance with safe persistence order

In `avatar-select` click flow:

1. set local avatar selection
2. persist avatar via existing `changeCurrentUserAvatar`
3. mark progress via existing `markOnboardingProgress('avatar_selected')`
4. only then advance to the next step

Error handling remains in place; advance does **not** happen on failure.

## 7) CTA removal for rhythm + avatar steps

Because selection now auto-advances:

- removed redundant confirm CTA from rhythm step
- removed redundant confirm CTA from avatar step
- kept back navigation on both steps

## UX outcome

- click rhythm → advances automatically
- click avatar → saves + marks progress + advances automatically
- onboarding visuals are no longer rhythm-color-coded before path split
- both onboarding branches inherit this behavior because changes occur before `path-select`
