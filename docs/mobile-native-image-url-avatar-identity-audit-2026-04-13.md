# Mobile/native callback audit — stop treating legacy `image_url` as avatar identity

Date: 2026-04-13
Owner: Web/Auth
Scope: `apps/web/src/pages/MobileBrowserAuth.tsx` and adjacent mobile auth/session payloads.

## A) Current risk

`MobileBrowserAuth` currently forwards Clerk profile image (`user.imageUrl`) into the native deep-link callback as `image_url`. That callback is consumed as a cross-platform auth contract, so any native/web consumer that interprets `image_url` as product avatar identity can overwrite or drift from the new decoupled avatar model (`avatar_id`/`avatar_code`).

This conflicts with decoupling direction already documented in the spec/audits:
- rhythm drives behavior
- avatar drives appearance
- legacy image fields should not be canonical identity

Risk level: **high** for identity drift in mobile callback flows, especially during partial rollout where both legacy and new fields coexist.

## B) Exact legacy field usage

### Primary write path (web -> native callback)
- `apps/web/src/pages/MobileBrowserAuth.tsx`
  - `buildRedirectUrl(...)` sets callback query param `image_url` from `user.imageUrl`.
  - Other callback params are identity/session metadata (`token`, `auth_mode`, `user_id`, `username`, `full_name`, `first_name`, `last_name`, `email`).

### Adjacent payload/type surfaces that keep legacy pathways alive
- `apps/web/src/lib/api.ts`
  - `CurrentUserProfile` still includes `image_url`.
  - game-mode and avatar mutations still return `image_url` and `avatar_url` in response shapes.
- `apps/web/src/lib/adminApi.ts`
  - admin user payload types still include `image_url` and `avatar_url`.

### Mobile callback/session parser context
- `apps/web/src/mobile/mobileAuthSession.ts`
  - callback parsing/fingerprint/session persistence uses `token`, `user_id`, `email`, and `auth_mode`.
  - it does **not** require `image_url` for session establishment, so removing callback `image_url` is low-risk to auth mechanics.

## C) Safest additive fix

1. **Stop emitting `image_url` from mobile callback now (non-breaking additive gate).**
   - In `buildRedirectUrl(...)`, remove unconditional `image_url` emission.
   - Optional compatibility gate: only emit `image_url` behind explicit query flag (`legacy_profile_image=1`) during short transition.

2. **Add explicit non-canonical profile-image naming if needed for UX-only fallback.**
   - If native still wants third-party profile photo, use a new callback param name such as `clerk_image_url` (or `profile_photo_url`) to avoid product-avatar ambiguity.
   - Treat it as decorative profile metadata, never avatar identity.

3. **Keep avatar identity sourced from backend `/users/me` avatar fields.**
   - Native/web should hydrate product avatar from `avatar_id`/`avatar_code`/theme payload, not callback query params.

4. **Document callback contract versioning.**
   - Add a small callback contract note (or version flag like `contract=v2`) to clarify that avatar identity is no longer represented by callback `image_url`.

5. **Telemetry safety check.**
   - Add debug counters/logging for callbacks containing legacy `image_url` so rollout can confirm native clients no longer depend on it.

## D) Implement now vs wait

**Recommendation: implement now** (small, additive, low blast radius), because:
- auth session parsing already ignores `image_url`;
- the current behavior is directly listed as a decoupling risk in existing audits;
- delaying prolongs cross-platform identity drift while decoupling is actively in-flight.

Only reason to wait: if a shipped native client hard-depends on `image_url` for mandatory UI. If that is true, use a short dual-write window (`clerk_image_url` + optional gated legacy `image_url`) with an explicit retirement date.

## E) Recommended next prompt

Use this prompt to execute the change safely:

> Implement a minimal additive hardening for mobile callback identity decoupling.
> 
> Scope:
> - `apps/web/src/pages/MobileBrowserAuth.tsx`
> - optional tests near mobile auth callback URL building.
> 
> Requirements:
> 1) stop treating `image_url` as canonical avatar identity in callback URLs;
> 2) remove callback `image_url` emission by default;
> 3) if needed for compatibility, emit `clerk_image_url` instead, and only emit legacy `image_url` when `legacy_profile_image=1` query flag is present;
> 4) do not change token/auth/session behavior;
> 5) add/adjust tests proving callback building still includes token/auth/user params and excludes legacy `image_url` by default.
> 
> Output:
> - summary of changed files,
> - risk notes,
> - test results.
