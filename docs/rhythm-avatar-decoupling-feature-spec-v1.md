# Rhythm + Avatar Decoupling — Feature Spec V1

Last updated: 2026-04-13
Status: Draft working spec
Owner: Product / Engineering
Related audit: `docs/rhythm-avatar-decoupling-impact-audit-2026-04-13.md`

---

## 1. Objective

Decouple **Rhythm** from **Avatar** in Innerbloom without breaking the current math, onboarding logic, task generation, calibration engines, or historical mode-based analytics.

This change must preserve the current backend and database concept of `game_mode` as the internal source of truth for intensity logic, while introducing a new independent concept, `avatar`, for user-facing visual identity.

The product goal is to make Innerbloom feel more adaptive and more personal:
- **Rhythm** communicates what the user can sustainably hold this week.
- **Avatar** communicates the user’s chosen visual identity.
- **Rhythm must keep driving logic.**
- **Avatar must keep driving visuals.**

This is not a pure copy update. It is a controlled product/domain refactor.

---

## 2. Final product rules (locked)

These rules are fixed for V1.

### 2.1 Rhythm
`Rhythm` is the public UX term.

Internal implementation remains `game_mode` for now.

Rhythm defines:
- Low / Chill / Flow / Evolve
- 1x / 2x / 3x / 4x per week
- onboarding path logic
- weekly target
- task generation
- growth calibration
- upgrade suggestion / acceptance
- all current mode-based calculations
- historical analytics tied to `user_game_mode_history`

### 2.2 Avatar
`Avatar` is a new independent user-facing visual identity.

Avatar defines:
- selected character
- personal color theme / glow / accent / gradients
- dashboard/profile visual media
- future expression variants by rhythm

Avatar does **not** define:
- weekly target
- onboarding behavior logic
- task generation
- growth calibration
- upgrade eligibility
- any math or scoring logic

### 2.3 Core rule
**Rhythm drives behavior. Avatar drives appearance.**

### 2.4 Chip rule
Any chip that displays rhythm must follow this rule:
- text/content = rhythm
- visual styling = avatar theme

Example:
- selected avatar = red cat
- selected rhythm = Flow
- chip content = `FLOW · 3x/WEEK`
- chip glow / gradient / accent = red, because avatar is the cat

### 2.5 Change independence rule
- Changing rhythm must **not** change avatar.
- Changing avatar must **not** change rhythm.

### 2.6 Language rule
User-facing naming:
- Spanish: **Ritmo**
- English: **Rhythm**

Internal/backend naming can remain `game_mode` in V1.

### 2.7 Asset rule for V1
V1 must not depend on having all final rhythm/identity assets ready.

Where current UI depends on mode-linked imagery, V1 can temporarily replace image-heavy surfaces with strong typographic blocks showing rhythm identity, for example:
- `1x/week · Low`
- `2x/week · Chill`
- `3x/week · Flow`
- `4x/week · Evolve`

Final rhythm-specific imagery and the full 16-combination avatar/rhythm asset matrix can be connected later.

---

## 3. Current state summary

Current repo behavior mixes intensity and identity too heavily.

Documented high-priority couplings already identified in the impact audit:
- `gameModeMeta.ts` bundles frequency + accent color + avatar media in one object
- `ProfileCard.tsx` selects avatar video directly from `gameMode`
- `DashboardMenu.tsx` uses mode cards as both intensity selector and visual identity selector
- `StreaksPanel.tsx` binds chip theme directly to mode palette
- `userGameModeChangeService.ts` updates `game_mode_id` and also mutates `image_url` / `avatar_url`
- onboarding mode selection and related flows still inherit visual identity from mode metadata

This means the system still assumes:
- mode = avatar
- mode = color
- mode = media

That assumption must be broken deliberately and in order.

---

## 4. Product model after refactor

### 4.1 Public mental model
The user should understand Innerbloom like this:

1. I choose the **rhythm** I can sustain right now.
2. I choose the **avatar** that represents my personal space.
3. Innerbloom uses rhythm to adapt the intensity of my journey.
4. Innerbloom uses avatar to style my experience visually.

### 4.2 Future-compatible extension
Future versions may support:
- avatar expressions that change by rhythm
- avatar-specific media by rhythm
- emotion-linked avatar expressions
- daily energy influencing visual states

But V1 must not require any of those to be complete.

---

## 5. V1 scope

### In scope
- Introduce `avatar` as a separate product concept and data model
- Keep `game_mode` internally as the intensity/math engine
- Add independent avatar selection support
- Add separate `Change Rhythm` and `Change Avatar` surfaces in the menu
- Move user-facing copy from “game mode” to “rhythm” where appropriate
- Decouple chips/themes/colors from rhythm and make them avatar-driven
- Decouple profile/dashboard primary media from rhythm and make it avatar-driven
- Reuse current UI surfaces as much as possible
- Use temporary rhythm placeholders where image/media dependencies still exist

### Out of scope for V1
- Renaming backend tables or historical data structures
- Rewriting taskgen prompts or mode logic semantics
- Making avatar affect math, GP, XP, targets, or upgrade logic
- Shipping all 16 final images and all 16 final videos as a hard dependency
- Full emotion-to-avatar engine
- Full avatar-expression-by-rhythm media rollout

---

## 6. Non-negotiable implementation constraints

### 6.1 Backend stability constraint
Do not destroy or rename the internal `game_mode` engine in V1.

### 6.2 Historical correctness constraint
Do not pollute `game_mode` with visual meaning. Historical analytics and calibration logic depend on it remaining purely behavioral.

### 6.3 Additive migration constraint
Prefer additive changes over destructive rewrites.

### 6.4 UI reuse constraint
Reuse the current onboarding rhythm card layout and current menu card layout wherever possible.

### 6.5 Safety constraint
The most dangerous current behavior is any shared writer that updates both intensity and identity at the same time. This must be neutralized early.

---

## 7. Required data/domain changes

## 7.1 New concept: avatar catalog
Introduce a catalog for avatars.

Suggested minimum fields:
- `avatar_id`
- `code`
- `name`
- `theme_tokens` or equivalent visual token set
- `is_active`
- timestamps

This can be represented as `cat_avatar`.

## 7.2 User-level avatar selection
Users need an independent avatar selection.

Suggested minimum user-facing field:
- `avatar_id`

Prefer an explicit field over overloading legacy visual URL fields.

## 7.3 Optional future-compatible asset model
Optional but recommended:
- avatar asset table keyed by `avatar_id + rhythm_code`
- separate media fields for image/video/thumb

This is not mandatory to finish V1, but should be considered in structure design.

---

## 8. Required API contract changes

### 8.1 `/users/me`
Must expand to return independent avatar information.

Current shape is not sufficient because it returns:
- `image_url`
- `game_mode`
- `weekly_target`

But not an explicit avatar identity.

V1 should add at minimum:
- `avatar_id`
- optionally `avatar_code`
- optionally theme payload or avatar visual profile

### 8.2 New avatar write endpoint
Add a dedicated avatar update endpoint.

Examples:
- `PUT /users/me/avatar`
- or equivalent product-safe route

This endpoint must:
- update avatar only
- not mutate `game_mode_id`

### 8.3 Rhythm/game mode write path
Existing rhythm/game mode write paths must remain dedicated to rhythm logic only.

If rhythm change endpoints still mutate visual identity fields, they must be refactored.

---

## 9. Required menu structure changes

The hamburger menu must expose two clearly separate actions.

### 9.1 Change Rhythm
Purpose:
- choose Low / Chill / Flow / Evolve
- communicate weekly intensity
- change behavioral intensity only

Rules:
- must not change avatar
- can reuse current mode selector layout
- in V1 should prioritize big rhythm text over avatar imagery

Recommended placeholder card content for V1:
- large rhythm name
- large weekly frequency
- brief objective/state copy
- no avatar identity art dependency required

### 9.2 Change Avatar
Purpose:
- choose the user’s visual identity
- update theme/media/visual surfaces only

Rules:
- must not change rhythm
- can reuse current selection pattern and confirmation flow
- should update chips/theme/media/profile visuals once saved

This must exist explicitly. It should not be deferred until the end.

---

## 10. Onboarding V1 behavior

### 10.1 Order
Recommended onboarding order:
1. Choose rhythm
2. Choose avatar

### 10.2 Why rhythm first
Rhythm is the product’s primary adaptive value. Starting with avatar would overemphasize cosmetics over the functional promise.

### 10.3 Rhythm step behavior
Keep the current mode/rhythm step structure where possible, but remove dependency on avatar imagery.

In V1:
- keep layout
- keep order and overall interaction pattern
- replace avatar image areas with stronger rhythm-first textual hierarchy if needed

Examples:
- `LOW · 1x/week`
- `CHILL · 2x/week`
- `FLOW · 3x/week`
- `EVOLVE · 4x/week`

### 10.4 Avatar step behavior
Avatar selection is a separate step.

In V1:
- simple avatar choice cards
- reuse current card logic/patterns where possible
- no need for dynamic slider behavior or advanced media previews

### 10.5 Telemetry
Add explicit onboarding progress tracking for avatar selection.

Suggested milestone:
- `avatar_selected_at`

This is important for debugging funnel behavior later.

---

## 11. Visual system rules for V1

### 11.1 Rhythm visuals
Rhythm still needs an identity, but not through a hard mode=avatar coupling.

In V1, rhythm identity can be represented through:
- typography hierarchy
- semantic labels
- objective/state copy
- simple neutral cards
- temporary placeholder blocks

### 11.2 Avatar visuals
Avatar becomes the source of:
- chip color
- glow
- surface accents
- profile media
- dashboard atmosphere where applicable

### 11.3 Transitional media rule
Until final assets are ready:
- do not block rollout on missing art
- use text placeholders where current mode imagery is still tightly coupled

### 11.4 Profile media transitional rule
V1 can use avatar-selected media directly, even without fully expressing rhythm variants yet.

That means:
- if user picks avatar X, show avatar X media in profile/dashboard
- do not wait for `avatar + rhythm` variant media to exist
- future enhancement can swap media by rhythm expression

---

## 12. High-risk coupling points to break first

These are the most dangerous architectural traps and should be handled early.

### 12.1 Shared mode writer mutates visual identity
If rhythm change still mutates `image_url` / `avatar_url`, the system will silently overwrite user identity.

This is the highest-priority technical risk.

### 12.2 Chip styles bound to rhythm palette
Any component where rhythm content is inseparable from mode-specific color/glow is now structurally wrong.

### 12.3 Profile media bound to rhythm
Any `game_mode -> media` mapping must be replaced with avatar-driven lookup.

### 12.4 Menu selector using rhythm cards as identity cards
Rhythm selector and avatar selector must become separate surfaces with separate consequences.

### 12.5 Fallback rendering based only on `game_mode`
As long as frontend surfaces still infer visuals from `game_mode`, partial migration will create mixed identity states.

---

## 13. Component-level target behavior

### 13.1 GameModeChip
Current concept is invalid for the new model if it still styles by mode.

New behavior:
- rhythm determines label/content
- avatar determines visual skin

### 13.2 ProfileCard
Current concept is invalid if it still selects media only by mode.

V1 behavior:
- selected avatar determines media
- rhythm does not yet have to determine media variant

Future behavior:
- selected avatar + rhythm determines exact expression/media

### 13.3 DashboardMenu
Must split into:
- Change Rhythm
- Change Avatar

And stop treating mode cards as the visual identity picker.

### 13.4 StreaksPanel and rhythm chips
Must continue using rhythm for counts/weekly goal text.

Must stop using rhythm as the source of color/glow.

### 13.5 Upgrade suggestion modal
Must stop visually comparing old mode avatar vs new mode avatar.

V1-safe behavior:
- keep same layout if useful
- replace imagery with strong rhythm text blocks / placeholders
- communicate increase/decrease/change in rhythm only

---

## 14. Copy migration rules

Replace user-facing “game mode” with “rhythm” where appropriate.

Examples:
- `Change Game Mode` → `Change Rhythm`
- `Choose your game mode` → `Choose your rhythm`
- `Current mode` → `Current rhythm`
- `Upgrade mode` → `Increase rhythm` / `Recommended rhythm change` depending on context

Do **not** rename internal code, routes, DB tables, or history tables just for copy reasons in V1.

---

## 15. Backward compatibility and migration safety

### 15.1 Fallback strategy
If a user has no explicit avatar assigned yet, use a temporary legacy mapping:
- legacy mode -> default avatar

This fallback should be transitional only.

### 15.2 Data backfill
Add a one-time backfill for existing users so avatar rendering does not become null/undefined in mixed states.

### 15.3 Mixed-state prevention
No surface should be allowed to resolve:
- rhythm text from new model
- but color/media from old mode assumptions

That produces identity drift.

---

## 16. Detailed implementation phases

## Phase 1 — Domain and contract preparation

Objective:
Introduce avatar as a first-class concept without changing behavior yet.

Tasks:
- add avatar catalog
- add `avatar_id` to user model
- extend `/users/me` response with avatar identity
- add frontend avatar types/models
- add resolver layer for avatar themes/media
- keep all current behavior intact for now

Success condition:
Frontend can read both rhythm and avatar independently, even if visuals still partially fallback.

---

## Phase 2 — Split write paths safely

Objective:
Ensure rhythm changes and avatar changes are not implemented through the same writer side effects.

Tasks:
- refactor rhythm change path so it no longer mutates avatar/image identity
- create explicit avatar change writer + endpoint
- audit onboarding side effects calling shared mode writer
- preserve `game_mode_id` history trigger behavior

Success condition:
Changing rhythm only changes rhythm.
Changing avatar only changes avatar.

---

## Phase 3 — Introduce Change Avatar in product UI

Objective:
Make avatar a real editable concept in product early.

Tasks:
- add `Change Avatar` surface to hamburger menu
- reuse current card/selection/confirmation pattern
- save avatar independently
- update visuals after save

Success condition:
User can independently change avatar without touching rhythm.

---

## Phase 4 — Move visual theming from rhythm to avatar

Objective:
Break visible mode=color assumptions.

Tasks:
- refactor `GameModeChip`
- refactor dashboard rhythm chips/glows
- move skin/theme logic to avatar tokens
- preserve rhythm content text and semantics

Success condition:
User can be in Flow with a non-Flow color theme based on chosen avatar.

---

## Phase 5 — Move profile/dashboard media from rhythm to avatar

Objective:
Break visible mode=media assumptions.

Tasks:
- refactor `ProfileCard`
- refactor any dashboard hero/profile media selection
- use avatar-driven media lookup
- keep future hook open for rhythm expressions later

Success condition:
Dashboard/profile shows selected avatar identity, not mode-linked identity.

---

## Phase 6 — Refactor Change Rhythm selector

Objective:
Turn current mode selector into a rhythm selector instead of a hybrid identity selector.

Tasks:
- rename to `Change Rhythm`
- reuse current layout
- remove dependency on avatar imagery for V1
- use large rhythm-first text placeholders where needed
- keep weekly frequency highly visible

Success condition:
Selector clearly communicates intensity choice, not visual character choice.

---

## Phase 7 — Refactor onboarding flow

Objective:
Align first-run experience to the new product model.

Tasks:
- keep rhythm selection first
- add avatar selection second
- add progress tracking for avatar selection
- preserve downstream onboarding/game_mode logic exactly

Success condition:
Onboarding teaches the correct mental model without breaking task generation and current path logic.

---

## Phase 8 — Refactor upgrades and suggestion surfaces

Objective:
Remove the remaining visual “mode vs mode” framing.

Tasks:
- update upgrade suggestion modal
- update related prompts/copy
- replace mode-image comparison with rhythm content blocks until final art exists

Success condition:
Rhythm changes are explained as behavioral intensity adjustments, not character swaps.

---

## Phase 9 — Attach final assets

Objective:
Plug in full avatar/rhythm visual matrix after architecture is stable.

Tasks:
- map avatar + rhythm to final images
- later map avatar + rhythm to final videos
- connect all visual resolvers to final asset matrix

Success condition:
No architectural changes required when final art lands.

---

## 17. Testing priorities

Regression testing must verify at minimum:
- changing rhythm updates behavioral logic only
- changing avatar updates visual identity only
- profile card respects avatar selection
- rhythm chips show rhythm text with avatar styling
- onboarding still routes correctly by rhythm
- upgrade acceptance still updates rhythm behavior only
- taskgen remains unchanged
- historical analytics remain mode/rhythm-correct
- fallback users without avatar render safely

---

## 18. Rules for future Codex prompts

When asking Codex to implement any part of this refactor, include these instructions:

1. Treat this document as the source of truth.
2. Do not collapse `avatar` back into `game_mode`.
3. Do not rename backend `game_mode` structures unless explicitly asked.
4. Prefer additive changes over destructive rewrites.
5. Preserve all math/business logic tied to `game_mode`.
6. Separate rhythm content from avatar styling.
7. If a component currently assumes `mode = avatar`, split that assumption explicitly instead of patching around it.
8. Reuse existing UI surfaces wherever possible.
9. Use temporary placeholder content instead of blocking on missing art.
10. Flag any code path where rhythm change still mutates avatar/image identity.

Recommended line to include in prompts:

> Use `docs/rhythm-avatar-decoupling-feature-spec-v1.md` and `docs/rhythm-avatar-decoupling-impact-audit-2026-04-13.md` as the implementation source of truth. Do not skip any constraints, migration rules, or phase ordering defined there.

---

## 19. Final summary

Innerbloom V1 after this refactor should behave like this:
- rhythm is the adaptive intensity engine
- avatar is the personal visual identity
- the user can change them independently
- the backend math remains stable
- the UI becomes more adaptive and more personal
- final art can arrive later without changing the architecture again

This is the intended V1 end state.
