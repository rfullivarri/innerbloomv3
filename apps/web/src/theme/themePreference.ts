export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCE_STORAGE_KEY = 'ib-theme-preference';
export const LEGACY_LANDING_THEME_STORAGE_KEY = 'ib:landing-theme-mode';
const DARK_SCHEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedPreference = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  return storedPreference === 'light' || storedPreference === 'dark' || storedPreference === 'auto'
    ? storedPreference
    : 'dark';
}

export function migrateLegacyLandingThemePreference() {
  if (typeof window === 'undefined') {
    return;
  }

  const current = window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);
  if (current === 'light' || current === 'dark' || current === 'auto') {
    return;
  }

  const legacy = window.localStorage.getItem(LEGACY_LANDING_THEME_STORAGE_KEY);
  if (legacy === 'light' || legacy === 'dark') {
    window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, legacy);
  }
}

export function resolveThemeFromPreference(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark';
  }

  return window.matchMedia(DARK_SCHEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

export function persistThemePreference(preference: ThemePreference) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, preference);
}

export function applyResolvedTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
}

export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveThemeFromPreference(preference);
  applyResolvedTheme(resolvedTheme);
  return resolvedTheme;
}

export function applyStoredThemePreference(): ThemePreference {
  migrateLegacyLandingThemePreference();
  const preference = readStoredThemePreference();
  applyThemePreference(preference);
  return preference;
}

export function observeSystemTheme(onChange: (isDark: boolean) => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const media = window.matchMedia(DARK_SCHEME_MEDIA_QUERY);
  const listener = (event: MediaQueryListEvent) => {
    onChange(event.matches);
  };

  media.addEventListener('change', listener);
  return () => {
    media.removeEventListener('change', listener);
  };
}
