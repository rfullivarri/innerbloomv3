# Innerbloom Privacy Policy Draft

Estado: borrador operativo basado en el comportamiento y los datos visibles en el repo. Requiere revisión final antes de publicarse.

Última actualización sugerida: 2026-04-11

## 1. Overview

Innerbloom provides an adaptive habit-building experience that helps users organize routines, complete guided daily actions, track progress, and reflect on emotional patterns over time.

This draft explains what information Innerbloom may collect, how it may use that information, and which choices users may have.

## 2. Who we are

Product name: Innerbloom

App / service domain used in the product:

- `https://innerbloomjourney.org`
- `https://apiv2.innerbloomjourney.org`

Contact email:

- Privacy: `privacy@innerbloomjourney.org`
- Support: `support@innerbloomjourney.org` recommended, pending final confirmation as the public support inbox
- Notifications / transactional sender: `notifications@innerbloomjourney.org`

Email receiving for `innerbloomjourney.org` is currently configured through Resend Receiving.

## 3. Information we may collect

Based on the current codebase, Innerbloom may process the following categories of data:

### Account and profile information

- Email address
- First name
- Last name
- Full name
- Profile image URL
- Authentication provider user identifier

This information is used to create and maintain a user account and authenticate access to the app.

### User-provided habit and journey data

- Onboarding responses
- Selected rhythm or mode
- Habit/task configuration
- Task completion history
- Missions and progress signals
- Daily reflection and emotional check-in data
- Reminder preferences
- Timezone settings

This information is used to personalize the user journey, generate plans, adapt tasks, and show progress inside the app.

### Device and app usage information

- Basic technical request information needed to operate the service
- App interaction events and product telemetry
- Optional analytics signals on the web experience, subject to consent

This information is used to keep the service working, diagnose issues, and improve the product.

### Notifications and communications

- Reminder preferences
- Local notification settings
- Email delivery metadata where reminder or transactional email features are enabled
- Inbound privacy/support emails received through the configured domain inbox

This information is used to deliver reminders and service-related communications.

## 4. How we use information

Innerbloom may use personal information to:

- authenticate users and secure accounts
- create and maintain a personalized habit journey
- deliver tasks, quests, reminders, and progress insights
- show emotional and habit patterns over time
- support app functionality and troubleshooting
- measure usage and improve the product
- communicate essential account or service updates

## 5. Legal bases

Depending on the user’s jurisdiction, processing may be based on one or more of the following:

- performance of a contract
- legitimate interests in operating and improving the service
- user consent, where required
- compliance with legal obligations

## 6. Analytics and cookies

The web experience includes support for analytics consent storage and Google Analytics 4 initialization. Analytics should only be treated as active in the final policy if they are actually enabled in production.

If analytics are enabled, Innerbloom should disclose:

- what analytics provider is used
- what events are collected
- whether IP anonymization is enabled
- how users can withdraw consent

## 7. Sharing of information

Based on the current architecture, Innerbloom may rely on third-party service providers for:

- authentication
- infrastructure and hosting
- email delivery
- inbound email receiving
- analytics, if enabled

Data should only be shared with service providers to the extent necessary to operate, secure, and improve the service.

## 8. Data retention

Personal information should be retained only for as long as needed to:

- provide the service
- comply with legal obligations
- resolve disputes
- enforce agreements

Exact retention windows still need to be defined.

## 9. Account deletion

Users can delete their Innerbloom account from inside the app after signing in.

Public instructions are available at:

- `https://innerbloomjourney.org/account-deletion`

Current deletion flow:

1. Sign in with the account to be deleted.
2. Open the personal menu in the Dashboard.
3. Select the red account deletion option below sign out.
4. Confirm the irreversible deletion by typing the required confirmation word.

When account deletion is confirmed, Innerbloom deletes the user's account data from the application database and deletes the authentication user in Clerk. The current implementation is intended to delete:

- account profile data stored by Innerbloom
- onboarding and rhythm data
- task, mission, progress, daily log, emotion log, and weekly summary records
- reminder preferences and notification state records
- the Clerk authentication user

Deletion is immediate and irreversible in the current product version. Innerbloom does not currently offer account recovery after deletion.

If analytics are enabled in production, analytics data should be treated as de-identified or no longer associated with the deleted account where technically possible. If native purchases or subscriptions are added in the future, this section must be updated to describe any billing-related retention or cancellation requirements.

## 10. Security

Innerbloom uses authenticated access flows and HTTPS-based network requests. No privacy policy should promise absolute security; the final version should state that reasonable technical and organizational safeguards are used.

## 11. User rights

Depending on location, users may have rights to:

- access their data
- correct inaccurate data
- delete data
- object to or restrict certain processing
- withdraw consent where processing depends on consent

The final policy should include the contact channel to exercise those rights.

## 12. Children

The final policy should state the intended minimum age and whether the service is directed to children. That age threshold is still pending confirmation.

## 13. International transfers

If service providers process data outside the user’s country, the final policy should disclose that and describe the applicable safeguards.

## 14. Contact

Privacy contact email:

- `privacy@innerbloomjourney.org`

Support contact email:

- `support@innerbloomjourney.org` recommended; confirm before publishing.

Account deletion instructions:

- `https://innerbloomjourney.org/account-deletion`

## 15. Final review items before publishing

- Confirm whether `support@innerbloomjourney.org` will be published as support contact
- Confirm whether GA4 is enabled in production
- Confirm whether reminder emails are active in production through `notifications@innerbloomjourney.org`
- Confirm whether any additional processors are used
- Add a real legal entity name if applicable
- Add jurisdiction-specific wording if needed
- Confirm whether App Store / Play Store require any additional retention disclosure if paid subscriptions are enabled later

## 16. Important note

This file is a product-informed draft, not legal advice. It should be reviewed before being published as the final privacy policy linked in Google Play.
