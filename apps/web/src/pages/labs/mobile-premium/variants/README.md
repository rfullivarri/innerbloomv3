# Premium Variants

This directory is reserved for Labs-only premium variants copied or derived from production features.

Do not edit production components to satisfy Labs visuals. When a production feature needs a premium mobile version, extract the Labs implementation into a named variant here and keep the production component unchanged.

## Planned Variants

- `PremiumStreaksPanel` / `PremiumTasksScreen` (`PremiumTasksScreen.tsx` extracted)
- `PremiumDailyQuest` (`PremiumDailyQuest.tsx` extracted)
- `PremiumDashboard` (`PremiumDashboard.tsx` extracted)
- `PremiumRewardsSection` (`PremiumRewardsSection.tsx` extracted)
- `PremiumTaskDetail` (`PremiumTaskDetail.tsx` extracted)
- `PremiumEmotionChart`
- `PremiumBalance`

## Extraction Order

1. Move the inline Labs screen from `MobilePremiumLabPage.tsx` into a named variant file.
2. Keep the same production data source or document why the variant is temporarily using an isolated Labs fallback.
3. Keep all mock/demo data inside Labs.
4. Export the variant from this folder.
5. Update `premiumFeatureMap.ts` if the source, status, or preserved semantics change.

## Hard Rule

Every visual element in a premium variant must map to an existing feature, data field, helper, API response, asset, or production semantic. If that mapping cannot be made, the visual element should not be implemented.
