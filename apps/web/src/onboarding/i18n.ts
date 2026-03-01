import type { OnboardingLanguage } from './constants';

const LANGUAGE_STORAGE_KEY = 'innerbloom.onboarding.language';

export function resolveOnboardingLanguage(search: string): OnboardingLanguage {
  if (typeof URLSearchParams !== 'undefined') {
    const params = new URLSearchParams(search);
    const queryLang = params.get('lang');
    if (queryLang === 'es' || queryLang === 'en') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, queryLang);
      }
      return queryLang;
    }
  }

  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'es' || stored === 'en') {
      return stored;
    }

    const navigatorLanguage = window.navigator?.language?.toLowerCase() ?? '';
    if (navigatorLanguage.startsWith('en')) {
      return 'en';
    }
  }

  return 'es';
}

export function buildOnboardingPath(language: OnboardingLanguage): string {
  return `/intro-journey?lang=${language}`;
}
