import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { resolvePostLoginTranslation } from './post-login';

export type PostLoginLanguage = 'es' | 'en';

export const POSTLOGIN_LANGUAGE_STORAGE_KEY = 'innerbloom.postlogin.language';
const LANGUAGE_SOURCE_STORAGE_KEY = 'innerbloom.postlogin.language.source';
const ONBOARDING_LANGUAGE_STORAGE_KEY = 'innerbloom.onboarding.language';
type LanguageSource = 'manual' | 'locale';

function normalizeLanguage(raw: string | null | undefined): PostLoginLanguage | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith('es')) {
    return 'es';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  return null;
}

export function detectDeviceLanguage(): PostLoginLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const languages = window.navigator.languages?.length ? window.navigator.languages : [window.navigator.language];
  const hasSpanish = languages.some((language) => normalizeLanguage(language) === 'es');
  return hasSpanish ? 'es' : 'en';
}

function readStoredLanguage(): PostLoginLanguage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return normalizeLanguage(window.localStorage.getItem(POSTLOGIN_LANGUAGE_STORAGE_KEY));
}

function readLanguageSource(): LanguageSource | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const source = window.localStorage.getItem(LANGUAGE_SOURCE_STORAGE_KEY);
  return source === 'manual' || source === 'locale' ? source : null;
}

function readOnboardingLanguage(): PostLoginLanguage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return normalizeLanguage(window.localStorage.getItem(ONBOARDING_LANGUAGE_STORAGE_KEY));
}

function resolveInitialLanguage(): PostLoginLanguage {
  return readStoredLanguage() ?? readOnboardingLanguage() ?? detectDeviceLanguage();
}

interface PostLoginLanguageContextValue {
  language: PostLoginLanguage;
  t: (key: string, params?: Record<string, string | number>) => string;
  setManualLanguage: (language: PostLoginLanguage) => void;
  syncLocaleLanguage: (language: PostLoginLanguage) => void;
  hasManualPreference: boolean;
}

const PostLoginLanguageContext = createContext<PostLoginLanguageContextValue | null>(null);

export function PostLoginLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<PostLoginLanguage>(() => resolveInitialLanguage());
  const [hasManualPreference, setHasManualPreference] = useState(() => readLanguageSource() === 'manual');

  const value = useMemo<PostLoginLanguageContextValue>(
    () => ({
      language,
      t: (key, params) => resolvePostLoginTranslation(language, key, params),
      hasManualPreference,
      setManualLanguage: (nextLanguage) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(POSTLOGIN_LANGUAGE_STORAGE_KEY, nextLanguage);
          window.localStorage.setItem(LANGUAGE_SOURCE_STORAGE_KEY, 'manual');
        }
        setLanguage(nextLanguage);
        setHasManualPreference(true);
      },
      syncLocaleLanguage: (nextLanguage) => {
        if (hasManualPreference) {
          return;
        }

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(POSTLOGIN_LANGUAGE_STORAGE_KEY, nextLanguage);
          window.localStorage.setItem(LANGUAGE_SOURCE_STORAGE_KEY, 'locale');
        }

        setLanguage(nextLanguage);
      },
    }),
    [hasManualPreference, language],
  );

  return <PostLoginLanguageContext.Provider value={value}>{children}</PostLoginLanguageContext.Provider>;
}

export function usePostLoginLanguage() {
  const context = useContext(PostLoginLanguageContext);
  if (!context) {
    throw new Error('usePostLoginLanguage must be used inside PostLoginLanguageProvider');
  }
  return context;
}
