import type { PostLoginLanguage } from '../postLoginLanguage';
import { a11yTranslations } from './a11y';
import { dashboardTranslations } from './dashboard';
import { editorTranslations } from './editor';
import { feedbackTranslations } from './feedback';
import { missionsTranslations } from './missions';
import { pricingTranslations } from './pricing';
import { subscriptionTranslations } from './subscription';
import { dailyQuestTranslations } from './dailyQuest';
import type { PostLoginTranslations } from './types';

const postLoginTranslations: PostLoginTranslations = {
  ...dashboardTranslations,
  ...missionsTranslations,
  ...editorTranslations,
  ...pricingTranslations,
  ...subscriptionTranslations,
  ...feedbackTranslations,
  ...a11yTranslations,
  ...dailyQuestTranslations,
};

export type PostLoginTranslationKey = keyof typeof postLoginTranslations;

export function resolvePostLoginTranslation(
  language: PostLoginLanguage,
  key: string,
  params?: Record<string, string | number>,
): string {
  const entry = postLoginTranslations[key];
  const template = entry?.[language] ?? key;

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (current, [paramKey, value]) => current.split(`{{${paramKey}}}`).join(String(value)),
    template,
  );
}
