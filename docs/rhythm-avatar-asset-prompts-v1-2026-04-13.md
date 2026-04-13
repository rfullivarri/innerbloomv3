# Rhythm + Avatar Asset Prompt Pack V1 (2026-04-13)

Status: working prompt pack
Related docs:
- `docs/rhythm-avatar-decoupling-feature-spec-v1.md`
- `docs/rhythm-avatar-decoupling-impact-audit-2026-04-13.md`
- `docs/rhythm-avatar-decoupling-scope-freeze-2026-04-13.md`

---

## Purpose

This file provides prompt templates for generating the first visual asset wave needed by the rhythm/avatar decoupling work.

It is intentionally split into:
1. avatar identity assets,
2. rhythm placeholder assets,
3. avatar x rhythm matrix assets,
4. optional motion/video planning prompts.

These prompts are meant for image-generation workflows and creative production, not for backend or product logic.

---

## Important implementation note

Prompt 10 does **not** have to mean “wire all final assets right now.”

Prompt 10 can be split into two valid versions:
- **10A = asset preparation contract**
  - define filenames
  - define resolver expectations
  - define folder structure
  - define avatar/rhythm matrix naming
- **10B = final hookup**
  - plug real assets into resolver once they exist

That means the engineering track can keep moving before all final visuals are ready.

---

## Asset groups

### Group 1 — Avatar identity base stills
Goal: create 1 clean identity image per avatar.

Needed for:
- avatar picker
- profile fallback image
- general brand identity

Current intended avatars:
- amphibian / blue
- bear / green-black
- cat / red
- owl / violet-lilac

---

### Group 2 — Rhythm placeholder visuals
Goal: create 4 non-character visuals for rhythm selection.

Needed for:
- Change Rhythm selector
- onboarding rhythm step
- places where rhythm must feel clear without implying avatar choice

Rhythms:
- Low = 1x/week
- Chill = 2x/week
- Flow = 3x/week
- Evolve = 4x/week

---

### Group 3 — Avatar × Rhythm image matrix
Goal: create 16 images where each avatar is shown in 4 rhythm expressions.

Needed for future:
- richer dashboard/profile identity
- more expressive picker states
- future avatar/rhythm art hookup

Matrix:
- 4 avatars × 4 rhythms = 16 images

---

### Group 4 — Optional motion/video plan
Goal: plan future video/loop variants once still-image system is stable.

---

## Prompt templates

## Template A — Avatar identity base image

Use this prompt format:

> Create one premium Innerbloom avatar identity image for the selected avatar only.
> This is not a poster, not a UI screen, and not a scene.
> It is a single clean character identity visual for product UI usage.
>
> Goal:
> Represent the chosen avatar as a calm, premium, emotionally readable character that can become the user’s persistent visual identity.
>
> Constraints:
> - no text
> - no UI
> - no background clutter
> - no multi-character scene
> - no exaggerated cartoon chaos
> - no childish toy look
> - no hard sci-fi look
> - no fantasy-heavy look
> - no aggressive gaming mascot energy
>
> Visual direction:
> - premium digital product aesthetic
> - warm first
> - emotionally clear second
> - elegant third
> - soft, refined, slightly luminous
> - centered composition
> - rounded friendly forms
> - restrained detailing
> - clean silhouette
> - high recognizability at small size
>
> Background:
> - subtle, atmospheric, softly blurred
> - very low clutter
> - should support easy future cutout/cropping
>
> Avatar target:
> [INSERT AVATAR DESCRIPTION]
>
> Color identity:
> [INSERT COLOR DIRECTION]
>
> Output intent:
> This image will be used as a product avatar identity reference for profile, avatar selection, and visual theming.

---

## Template B — Rhythm placeholder image

Use this prompt format:

> Create one premium non-character visual for the Innerbloom rhythm: [LOW / CHILL / FLOW / EVOLVE].
> This is not a poster, not a character portrait, and not a UI screen.
> It is a mood/intensity visual used to communicate weekly rhythm without implying avatar identity.
>
> Goal:
> Communicate the feeling of this weekly rhythm in a way that is elegant, minimal, and product-native.
>
> Constraints:
> - no character
> - no animal
> - no face
> - no text
> - no UI
> - no literal calendar icon
> - no cliché productivity graphic
> - no stock illustration feel
>
> Visual language:
> - premium digital wellness-product aesthetic
> - atmospheric, minimal, precise
> - emotionally readable
> - abstract but understandable
> - not mystical, not fantasy-heavy
> - not childish
>
> Composition:
> - single centered visual idea
> - clean background
> - strong readability in small card format
>
> Rhythm definition:
> [INSERT RHYTHM MEANING]
>
> Weekly intensity label context:
> [1x/week or 2x/week or 3x/week or 4x/week]
>
> Emotional tone:
> [INSERT TONE]
>
> Output intent:
> This image is for rhythm selection cards in onboarding and settings.

---

## Template C — Avatar × Rhythm expression image

Use this prompt format:

> Create one premium Innerbloom avatar expression image.
> This image must represent:
> - avatar: [INSERT AVATAR]
> - rhythm: [LOW / CHILL / FLOW / EVOLVE]
>
> This is not a poster, not a scene, and not a UI screen.
> It is a single product character visual showing the same avatar identity expressed through a specific rhythm/intensity state.
>
> Goal:
> Preserve the avatar’s core identity while making its posture, facial affect, energy, and overall presence clearly reflect the selected rhythm.
>
> Constraints:
> - one character only
> - no text
> - no UI
> - no busy environment
> - no totally different redesign of the avatar
> - keep identity continuity across all 4 rhythm states
>
> Visual language:
> - premium digital product character art
> - warm, elegant, soft, readable
> - emotionally clear
> - restrained, not chaotic
> - consistent silhouette family across the 4 rhythm variants
>
> Identity rule:
> The same avatar must still feel unmistakably like the same character in all rhythm variants.
>
> Rhythm expression rule:
> - LOW: lower energy, more tired, more saturated/overwhelmed, but still gentle and dignified
> - CHILL: stable, calm, unpressured, relaxed
> - FLOW: focused, engaged, in motion, energized but balanced
> - EVOLVE: ambitious, determined, sharper presence, higher intensity without looking hostile
>
> Avatar target:
> [INSERT AVATAR DESCRIPTION]
>
> Color identity:
> [INSERT AVATAR COLOR DIRECTION]
>
> Selected rhythm:
> [INSERT RHYTHM]
>
> Output intent:
> This image is part of a 16-image avatar × rhythm matrix for future dashboard/profile/product use.

---

## Concrete prompts

## 1. Amphibian avatar — base identity

> Create one premium Innerbloom avatar identity image for a friendly amphibian-like character.
> This is not a poster, not a UI screen, and not a scene.
> It is a single clean character identity visual for product UI usage.
>
> Goal:
> Represent this avatar as a calm, premium, emotionally readable character that can become the user’s persistent visual identity.
>
> Constraints:
> - no text
> - no UI
> - no background clutter
> - no multi-character scene
> - no exaggerated cartoon chaos
> - no childish toy look
> - no hard sci-fi look
> - no fantasy-heavy look
> - no aggressive gaming mascot energy
>
> Visual direction:
> - premium digital product aesthetic
> - warm first
> - emotionally clear second
> - elegant third
> - soft, refined, slightly luminous
> - centered composition
> - rounded friendly forms
> - restrained detailing
> - clean silhouette
> - high recognizability at small size
>
> Background:
> - subtle, atmospheric, softly blurred
> - very low clutter
> - should support easy future cutout/cropping
>
> Avatar target:
> a soft amphibian-like character, slightly rounded, intelligent eyes, gentle presence, balanced between cute and elegant, no childish exaggeration
>
> Color identity:
> blue / cyan / soft aquatic glow, refined and premium, not neon cartoon
>
> Output intent:
> This image will be used as a product avatar identity reference for profile, avatar selection, and visual theming.

---

## 2. Bear avatar — base identity

> Create one premium Innerbloom avatar identity image for a calm bear character.
> This is not a poster, not a UI screen, and not a scene.
> It is a single clean character identity visual for product UI usage.
>
> Goal:
> Represent this avatar as grounded, stable, reassuring, and premium.
>
> Constraints:
> - no text
> - no UI
> - no background clutter
> - no childish plush-toy look
> - no wild animal aggression
> - no fantasy armor or adventure styling
>
> Visual direction:
> - premium digital wellness-product aesthetic
> - solid, calm, emotionally safe
> - elegant and restrained
> - centered composition
> - strong silhouette
> - readable at small size
>
> Avatar target:
> a bear-like character with calm eyes, strong but soft facial structure, grounded posture, secure presence
>
> Color identity:
> deep green, dark charcoal, subtle natural richness, slightly luminous accents
>
> Output intent:
> This image will be used as a product avatar identity reference for profile, avatar selection, and visual theming.

---

## 3. Cat avatar — base identity

> Create one premium Innerbloom avatar identity image for a refined cat character.
> This is not a poster, not a UI screen, and not a scene.
> It is a single clean character identity visual for product UI usage.
>
> Goal:
> Represent this avatar as emotionally vivid, elegant, alert, and memorable without becoming aggressive or childish.
>
> Constraints:
> - no text
> - no UI
> - no background clutter
> - no meme-cat energy
> - no childish mascot styling
> - no fantasy styling
>
> Visual direction:
> - premium digital product character aesthetic
> - graceful, expressive, clean
> - emotionally warm
> - elegant and slightly sharper than the other avatars
>
> Avatar target:
> a cat-like character with expressive eyes, elegant facial line, poised presence, emotionally readable but controlled
>
> Color identity:
> rich red, warm crimson, subtle orange-red depth, premium not cartoonish
>
> Output intent:
> This image will be used as a product avatar identity reference for profile, avatar selection, and visual theming.

---

## 4. Owl avatar — base identity

> Create one premium Innerbloom avatar identity image for an owl character.
> This is not a poster, not a UI screen, and not a scene.
> It is a single clean character identity visual for product UI usage.
>
> Goal:
> Represent this avatar as wise, focused, composed, and quietly premium.
>
> Constraints:
> - no text
> - no UI
> - no background clutter
> - no fantasy sage costume
> - no hard mystical look
> - no childish bird mascot look
>
> Visual direction:
> - premium digital wellness-product character art
> - intelligent, calm, elegant
> - emotionally contained but warm
> - centered composition
> - clean silhouette
>
> Avatar target:
> an owl-like character with composed gaze, refined face structure, calm intelligence, quiet presence
>
> Color identity:
> violet, lilac, soft plum, subtle cool-luminous premium accents
>
> Output intent:
> This image will be used as a product avatar identity reference for profile, avatar selection, and visual theming.

---

## 5. Low rhythm placeholder

> Create one premium non-character visual for the Innerbloom rhythm: LOW.
> This is not a poster, not a character portrait, and not a UI screen.
> It is a mood/intensity visual used to communicate weekly rhythm without implying avatar identity.
>
> Goal:
> Communicate low weekly intensity, reduced capacity, overwhelm, and the idea of doing only the minimum essential in a gentle, elegant, non-judgmental way.
>
> Constraints:
> - no character
> - no animal
> - no face
> - no text
> - no UI
> - no cliché battery icon
> - no productivity cliché
>
> Visual language:
> - premium digital wellness-product aesthetic
> - atmospheric, minimal, precise
> - emotionally readable
> - abstract but understandable
> - not mystical, not fantasy-heavy
>
> Composition:
> - single centered visual idea
> - clean background
> - strong readability in small card format
>
> Weekly intensity label context:
> 1x/week
>
> Emotional tone:
> low energy, saturated, overwhelmed, but safe and compassionate
>
> Output intent:
> This image is for rhythm selection cards in onboarding and settings.

---

## 6. Chill rhythm placeholder

> Create one premium non-character visual for the Innerbloom rhythm: CHILL.
> This is not a poster, not a character portrait, and not a UI screen.
> It is a mood/intensity visual used to communicate weekly rhythm without implying avatar identity.
>
> Goal:
> Communicate stable, sustainable, low-pressure consistency in a calm and premium way.
>
> Constraints:
> - no character
> - no animal
> - no face
> - no text
> - no UI
>
> Visual language:
> - premium digital wellness-product aesthetic
> - atmospheric, minimal, precise
> - emotionally readable
> - abstract but understandable
>
> Weekly intensity label context:
> 2x/week
>
> Emotional tone:
> stable, calm, unpressured, steady
>
> Output intent:
> This image is for rhythm selection cards in onboarding and settings.

---

## 7. Flow rhythm placeholder

> Create one premium non-character visual for the Innerbloom rhythm: FLOW.
> This is not a poster, not a character portrait, and not a UI screen.
> It is a mood/intensity visual used to communicate weekly rhythm without implying avatar identity.
>
> Goal:
> Communicate focus, movement, engagement, and balanced momentum.
>
> Constraints:
> - no character
> - no animal
> - no face
> - no text
> - no UI
>
> Visual language:
> - premium digital product aesthetic
> - atmospheric, elegant, dynamic but controlled
>
> Weekly intensity label context:
> 3x/week
>
> Emotional tone:
> focused, energized, active, balanced
>
> Output intent:
> This image is for rhythm selection cards in onboarding and settings.

---

## 8. Evolve rhythm placeholder

> Create one premium non-character visual for the Innerbloom rhythm: EVOLVE.
> This is not a poster, not a character portrait, and not a UI screen.
> It is a mood/intensity visual used to communicate weekly rhythm without implying avatar identity.
>
> Goal:
> Communicate ambition, determination, structured high intensity, and upward drive.
>
> Constraints:
> - no character
> - no animal
> - no face
> - no text
> - no UI
>
> Visual language:
> - premium digital product aesthetic
> - elegant, strong, clear, aspirational
>
> Weekly intensity label context:
> 4x/week
>
> Emotional tone:
> determined, ambitious, sharper, high-energy but not hostile
>
> Output intent:
> This image is for rhythm selection cards in onboarding and settings.

---

## 9. Matrix prompt instruction

For the 16-image matrix, reuse Template C and only swap:
- avatar description
- avatar color identity
- selected rhythm

Naming recommendation:
- `avatar-amphibian-low.png`
- `avatar-amphibian-chill.png`
- `avatar-amphibian-flow.png`
- `avatar-amphibian-evolve.png`
- etc.

---

## 10. Engineering handoff note

Once assets exist, Prompt 10 should not ask engineering to invent asset semantics.
It should ask engineering to:
- wire the agreed filenames/paths into resolver logic
- preserve fallback behavior
- keep rhythm as expression selector and avatar as identity selector
- avoid reintroducing any mode-derived identity fallback
