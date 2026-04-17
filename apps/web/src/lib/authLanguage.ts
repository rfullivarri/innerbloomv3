export type AuthLanguage = 'es' | 'en';

export const AUTH_LANGUAGE_STORAGE_KEY = 'innerbloom.auth.language';

function isSupportedLanguage(language: string | null): language is AuthLanguage {
  return language === 'es' || language === 'en';
}

function resolveBrowserLanguage(): AuthLanguage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const languages = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language];

  for (const language of languages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('en')) {
      return 'en';
    }
    if (normalized.startsWith('es')) {
      return 'es';
    }
  }

  return null;
}

export function resolveAuthLanguage(search: string): AuthLanguage {
  if (typeof URLSearchParams !== 'undefined') {
    const params = new URLSearchParams(search);
    const queryLanguage = params.get('lang');

    if (isSupportedLanguage(queryLanguage)) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_LANGUAGE_STORAGE_KEY, queryLanguage);
      }
      return queryLanguage;
    }
  }

  if (typeof window !== 'undefined') {
    const storedLanguage = window.localStorage.getItem(AUTH_LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(storedLanguage)) {
      return storedLanguage;
    }
  }

  return resolveBrowserLanguage() ?? 'es';
}

export function buildLocalizedAuthPath(path: '/' | '/login' | '/sign-up' | '/mobile-auth', language: AuthLanguage): string {
  return `${path}?lang=${language}`;
}
