# Dashboard data review

This document lists dashboard widgets that are not yet populated with user-specific data from the backend.

## Static "Game Mode" hero stats
- Location: `apps/web/src/pages/Dashboard.tsx`
- Observations:
  - "Daily quests" is hardcoded to `3`.
  - "XP today" is hardcoded to an em dash (`—`).
  - There is an inline TODO noting that this block should be replaced with a live mission payload when available.
- Impact: No request is made to the backend using the authenticated user's ID; the values are static placeholders.

## PillarsSection without user context
- Location: `apps/web/src/components/dashboard/PillarsSection.tsx`
- Observations:
  - Fetches `/pillars` via `getPillars` without including a user identifier.
  - Likely returns global defaults instead of the signed-in user's pillar progress.
- Impact: The section cannot reflect per-user Body · Mind · Soul metrics until the endpoint accepts a user ID or a user-specific endpoint is used.

## Achievements placeholder
- Location: `apps/web/src/components/dashboard/AchievementsList.tsx`
- Observations:
  - Renders static copy with a TODO to connect the achievements endpoint once available.
  - No backend call is performed; nothing is filtered by user.
- Impact: Users never see their actual badges, streak freezes, or trophies.

## Emotion heatmap fallback copy
- Location: `apps/web/src/components/dashboard/EmotionHeatmap.tsx`
- Observations:
  - When the backend returns no emotion check-ins, the component displays a TODO message indicating the endpoint still needs wiring.
  - The data request (`getEmotions`) does include the `userId`, so backend coverage depends on the endpoint implementation.
- Impact: If the endpoint is not live, the widget remains empty despite a valid user ID being available.

## Summary
The primary dashboard gaps are the static hero metrics, the pillars section that ignores the current user, and the achievements list placeholder. Addressing these requires wiring each component to a backend resource that accepts the signed-in user's ID.
