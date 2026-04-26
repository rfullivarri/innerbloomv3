import type { CSSProperties } from 'react';

export type LandingThemeMode = 'dark' | 'light';

export const LANDING_THEME_STORAGE_KEY = 'ib:landing-theme-mode';

const LANDING_BACKGROUNDS: Record<LandingThemeMode, { base: string; gradient: string }> = {
  dark: {
    base: '#05050B',
    gradient:
      'radial-gradient(circle at 72% 18%, rgba(143, 91, 255, 0.24), transparent 38%), radial-gradient(circle at 24% 78%, rgba(72, 190, 255, 0.14), transparent 42%), linear-gradient(180deg, #0A0714 0%, #05050B 100%)',
  },
  light: {
    base: '#FBFAFF',
    gradient:
      'radial-gradient(circle at 75% 12%, rgba(139, 92, 246, 0.16), transparent 36%), radial-gradient(circle at 18% 82%, rgba(56, 189, 248, 0.10), transparent 42%), linear-gradient(180deg, #FBFAFF 0%, #F3EEFF 100%)',
  },
};

export function isLandingThemeMode(value: string | null): value is LandingThemeMode {
  return value === 'dark' || value === 'light';
}

export function readLandingThemeMode(defaultMode: LandingThemeMode = 'dark'): LandingThemeMode {
  if (typeof window === 'undefined') {
    return defaultMode;
  }
  const stored = window.localStorage.getItem(LANDING_THEME_STORAGE_KEY);
  return isLandingThemeMode(stored) ? stored : defaultMode;
}

export function writeLandingThemeMode(mode: LandingThemeMode) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(LANDING_THEME_STORAGE_KEY, mode);
}

export function getLandingThemeBackground(mode: LandingThemeMode) {
  return LANDING_BACKGROUNDS[mode];
}

export function getLandingThemeStyle(mode: LandingThemeMode): CSSProperties {
  const background = getLandingThemeBackground(mode);
  return {
    '--landing-background-base': background.base,
    '--landing-background': background.gradient,
  } as CSSProperties;
}
