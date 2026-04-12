# Innerbloom Legal Publishing Checklist

This checklist is the operational reference for publishing Innerbloom’s legal and support pages before App Store and Play Store submission.

## 1. Files created

- `Docs/legal/privacy-policy.md`
- `Docs/legal/terms-of-service.md`
- `Docs/legal/support.md`
- `Docs/legal/legal-publishing-checklist.md`

## 2. Public pages published on the landing website

These documents are exposed as public website routes:

- `/privacy`
- `/terms`
- `/support`
- `/account-deletion`

## 3. Required manual replacement before publishing

Replace this placeholder in the legal documents:

- **[FULL LEGAL NAME OF THE OPERATOR]**

Files where it appears:

- `Docs/legal/privacy-policy.md`
- `Docs/legal/terms-of-service.md`

## 4. Confirmed policy and publishing assumptions

These points were treated as confirmed when preparing the documents:

- operator type: **individual / natural person**
- jurisdiction / country: **Spain**
- minimum age: **16+**
- governing law for Terms: **Spain**
- privacy contact: **privacy@innerbloomjourney.org**
- support contact: **support@innerbloomjourney.org**
- GA4 on web: **yes**
- reminder / transactional emails in production: **yes**
- ads: **no**
- push notifications: **yes**
- local notifications: **yes**

## 5. Product/site implementation status

### Website / landing

- public pages for `/privacy`, `/terms`, `/support`, and `/account-deletion`: **done**
- footer links to `/privacy`, `/terms`, and `/support`: **done**
- public sitemap entries for legal/support/account deletion pages: **done**

### Product / onboarding

Recommended next step after the first store-ready release:

- add a required acceptance checkbox at sign-up or onboarding start
- link to `/terms` and `/privacy`
- store acceptance timestamp and policy version if possible

Suggested text:

> I agree to the Terms of Service and acknowledge the Privacy Policy.

## 6. Store-facing use

These URLs are intended to be used for:

- Apple App Store Connect Privacy Policy URL
- Apple Support URL
- Google Play Privacy Policy URL
- Google Play data deletion URL
- general reviewer-facing public legal/support references

## 7. Practical recommendation

For this B1 release, prioritize:

1. verify the four public pages are deployed and accessible without auth
2. use those URLs in App Store Connect and Play Console
3. verify account deletion in production with a real test account
4. then implement in-product consent flow if required for a later hardening pass

---

This checklist is meant to keep the legal publishing work operational and focused, not to replace legal advice.
