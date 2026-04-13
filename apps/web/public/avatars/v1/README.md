# Avatar/Rhythm Asset Contract (Prompt 10A)

This folder reserves the decoupled asset structure for rhythm/avatar visuals.

## Folder tiers

- `identity-base/`
  - Avatar identity stills used by avatar picker and profile fallback.
  - Pattern: `avatar-<avatar-code>-base.png`
- `rhythm-placeholder/`
  - Rhythm-only visuals used by rhythm selectors and onboarding rhythm steps.
  - Pattern: `rhythm-<rhythm-code>-placeholder.png`
- `matrix-image/`
  - Future richer avatar × rhythm still image matrix.
  - Pattern: `avatar-<avatar-code>-<rhythm-code>.png`
- `matrix-motion/`
  - Optional future avatar × rhythm motion/video variants.
  - Pattern: `avatar-<avatar-code>-<rhythm-code>.mp4`

## Allowed rhythm codes

- `low`
- `chill`
- `flow`
- `evolve`

## Current status

Prompt 10A prepares naming + resolver contract only.
Final assets can be added later without changing resolver architecture.
