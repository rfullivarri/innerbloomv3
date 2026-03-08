import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type PostLoginLanguage = 'es' | 'en';

const LANGUAGE_STORAGE_KEY = 'innerbloom.postlogin.language';

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

  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function resolveInitialLanguage(): PostLoginLanguage {
  return readStoredLanguage() ?? detectDeviceLanguage();
}

interface PostLoginLanguageContextValue {
  language: PostLoginLanguage;
  setManualLanguage: (language: PostLoginLanguage) => void;
  hasManualPreference: boolean;
}

const PostLoginLanguageContext = createContext<PostLoginLanguageContextValue | null>(null);

export function PostLoginLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<PostLoginLanguage>(() => resolveInitialLanguage());
  const [hasManualPreference, setHasManualPreference] = useState(() => readStoredLanguage() !== null);

  const value = useMemo<PostLoginLanguageContextValue>(
    () => ({
      language,
      hasManualPreference,
      setManualLanguage: (nextLanguage) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        }
        setLanguage(nextLanguage);
        setHasManualPreference(true);
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
