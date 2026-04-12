# Innerbloom Release Current State

Status reviewed on `main` on 2026-04-12.

## Product state

- Mobile login with Clerk is working on Android and iOS through the native browser/deep-link callback flow.
- Account deletion is implemented, owner-tested, and working with real test users.
- Account deletion is available inside the authenticated Dashboard menu, below sign out, as a destructive red action.
- Public account deletion instructions are available at `https://innerbloomjourney.org/account-deletion`.
- Public legal pages are available at `/privacy`, `/terms`, `/support`, and `/account-deletion`.
- Pricing and subscription UI are hidden by default for the first release.
- All first-release users should be treated as FREE unless manually changed by admin.
- The native test-notification button is hidden in production.

## Account deletion behavior

- Endpoint: `DELETE /api/account`.
- Requires an authenticated user.
- Fails before local data mutation if the Clerk Admin integration is not configured.
- Deletes application data in Neon for the authenticated user.
- Deletes the Clerk authentication user.
- V1 deletion is immediate and irreversible.
- No grace period or account recovery is offered in V1.
- If subscriptions or purchases are enabled later, deletion and retention documentation must be revisited.

## Contacts and legal

- Privacy contact: `privacy@innerbloomjourney.org`.
- Support contact: `support@innerbloomjourney.org`.
- Transactional/reminder sender: `notifications@innerbloomjourney.org`.
- Resend Receiving is verified for `innerbloomjourney.org`.
- Support receiving is confirmed by the owner.

## Analytics and consent

- GA4 support exists in the web app.
- The public landing uses cookie consent before initializing GA4.
- Authenticated funnel tracking also checks the stored analytics consent before initializing GA4.
- Native apps do not currently have a dedicated in-app analytics consent prompt.
- Recommendation for V1: do not treat GA4 as active in native apps until a native consent prompt/toggle exists.
- If GA4 mobile is enabled, disclose analytics in Apple App Privacy and Google Play Data Safety.

## Recommended native analytics consent UX

- Show a one-time, non-blocking prompt after sign-in/onboarding and before enabling analytics.
- Do not make analytics consent mandatory for account creation or onboarding completion.
- Provide two equal choices: allow analytics and not now.
- Use app language, not cookie language: “Optional analytics” / “Help improve Innerbloom”.
- Store the decision locally and respect it before loading GA4.
- Add a menu/settings entry so the user can change analytics consent later.
- Keep ads-related consent denied because Innerbloom does not run ads in this release.

## Store submission state

- Android still needs release signing, AAB generation, Play Console listing, Data Safety, content rating, screenshots, and testing track setup.
- iOS still needs App Store Connect setup, signing/archive flow, screenshots, Privacy Nutrition Labels, age rating, and review metadata.
- Public legal/support URLs are ready to be used in both stores.
- Account deletion URL is ready to be used in both stores.
- Monetization should be declared as not active for V1 unless pricing/subscription UI is re-enabled.

## Known documentation caveat

The repo contains both `Docs/` and `docs/` mirrors. Release-facing updates should be kept synchronized until one canonical docs directory is chosen.
