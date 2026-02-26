export type AuthLanguage = 'es' | 'en';

const AUTH_LANGUAGE_STORAGE_KEY = 'innerbloom.auth.language';

function isSupportedLanguage(language: string | null): language is AuthLanguage {
  return language === 'es' || language === 'en';
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

  return 'es';
}

export function buildLocalizedAuthPath(path: '/' | '/login' | '/sign-up', language: AuthLanguage): string {
  return `${path}?lang=${language}`;
}
