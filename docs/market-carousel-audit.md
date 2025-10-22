# Market Carousel Audit — Fix Summary

## Context
- **Feature**: Missions V2 market carousel (`missions-market-view` in `MissionsV2Board`).
- **Problem areas**: single-proposal rendering, clipped back stack, competing gestures, sticky flip states, lack of scroll cues, and missing telemetry.

## Fix Overview
- **Back stack rendering**
  - Always renders the full proposal list for the active slot.
  - Active/locked proposals show contextual badges ("Activa" / "En progreso").
  - Inline counter displays the current proposal index and total (`k / N`).
- **Layout & scrolling**
  - Back stack now uses `max-height: calc(var(--card-body-available, 60vh))` plus generous inner padding to avoid clipping.
  - `touch-action` split (`pan-x` track, `pan-y` stack) with containment to stop nested scroll bleed.
  - Fade overlays reuse `data-has-prev/next` to hint at overflow.
- **Gesture arbitration**
  - Pointer events starting inside the back stack skip horizontal capture.
  - Horizontal drags require a dominant X delta and respect angular thresholding.
  - Pointer-up default suppression only fires after a committed swipe, eliminating “sticky” flips.
- **State management**
  - Only one flipped card at a time without discarding the state object.
  - Navigating (buttons or swipe) auto-closes open backs and resets drag flags.
  - `activeMarketProposalBySlot` remains the vertical selection index only.
- **Telemetry**
  - Added `missions_v2_market_*` events for view, navigation, flips, inner scroll, and proposal selection.
  - Scroll telemetry fires once per slot per trusted gesture.
- **UX cues**
  - Added "Deslizá para ver más" hint beside the proposal counter.
  - Scroll shadows remain for overflow feedback.

## QA Notes
- Mobile swipe snaps horizontally; vertical scroll on card back never moves the carousel.
- Changing cards closes any open back.
- Proposal lists with ≥6 items remain fully accessible via internal scroll.
- Telemetry verified via debug logger (see `emitMissionsV2Event`).

## Follow-up
- Capture updated UX video (mobile) demonstrating swipe → flip → vertical scroll → navigation auto-closing.
