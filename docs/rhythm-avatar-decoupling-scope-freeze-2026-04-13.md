# Rhythm + Avatar Decoupling — Scope Freeze Note (2026-04-13)

Status: Active scope constraint
Owner: Product
Related docs:
- `docs/rhythm-avatar-decoupling-feature-spec-v1.md`
- `docs/rhythm-avatar-decoupling-impact-audit-2026-04-13.md`
- `docs/rhythm-avatar-decoupling-frontend-drift-audit-2026-04-13-phase2-followup.md`

---

## Purpose

This note freezes part of the previously discussed migration scope so future implementation prompts do not drift into lower-priority surfaces.

---

## Frozen / deferred area

### Missions surfaces are explicitly out of near-term scope
Do **not** work on missions-related visual decoupling in the current implementation wave.

This includes, but is not limited to:
- `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`
- `apps/web/src/components/dashboard-v3/MissionsV3Board.tsx`
- any mission art resolver migration
- any mission slot/theme/media remapping
- any mission-specific avatar/rhythm visual alignment work

Reason:
- Product priority is to concentrate current effort on the main authenticated UX and onboarding/rhythm/avatar control flow.
- Missions decoupling is postponed for a later, separate wave.

---

## Near-term focus (active)

Current implementation effort should concentrate on:

1. Dashboard/post-login authenticated UX consistency
   - avatar-driven dashboard visual identity
   - rhythm content + avatar styling consistency
   - upgrade / recommendation surfaces
   - profile / chips / menu coherence

2. Rhythm selector cleanup
   - keep rhythm selection intensity-led
   - remove remaining mode=avatar visual assumptions

3. Onboarding primary flow cleanup
   - rhythm step
   - avatar step
   - rhythm-first framing
   - removal of mode-bound visual identity assumptions

4. Fallback and cleanup work
   - legacy fallback hardening
   - cleanup of stale mode-bound metadata usage
   - safe retirement planning for temporary compatibility paths

---

## Prompting rule for future Codex work

Until this freeze note is explicitly removed, all future prompts related to rhythm/avatar decoupling must follow this rule:

> Do not touch missions surfaces in this implementation wave. Treat missions-related decoupling as frozen/deferred. Focus only on dashboard, rhythm selector, onboarding primary flows, upgrade/recommendation surfaces, and cleanup/fallback work.

Recommended prompt line:

> Also read `docs/rhythm-avatar-decoupling-scope-freeze-2026-04-13.md` and treat missions work as explicitly out of scope for now.

---

## Effective interpretation

If a migration order or audit document lists missions as a future high-risk area, that should be interpreted as:
- relevant later,
- but not part of the current execution block.

This freeze note overrides any prior suggestion to work on missions in the current wave.

---

## Short operational summary

For the current wave:
- yes: dashboard
- yes: change avatar / change rhythm surfaces
- yes: onboarding
- yes: upgrade/recommendation cleanup
- yes: legacy fallback cleanup
- no: missions
