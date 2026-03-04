import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemePreference,
  observeSystemTheme,
  persistThemePreference,
  readStoredThemePreference,
  resolveThemeFromPreference,
  type ResolvedTheme,
  type ThemePreference,
} from './themePreference';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

function resolveInitialState(): { preference: ThemePreference; theme: ResolvedTheme } {
  const preference = readStoredThemePreference();
  return {
    preference,
    theme: resolveThemeFromPreference(preference),
  };
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(resolveInitialState);

  useEffect(() => {
    const resolvedTheme = applyThemePreference(state.preference);
    if (resolvedTheme !== state.theme) {
      setState((current) => ({ ...current, theme: resolvedTheme }));
    }
  }, [state.preference, state.theme]);

  useEffect(() => {
    if (state.preference !== 'auto') {
      return;
    }

    return observeSystemTheme((isDark) => {
      setState((current) => {
        if (current.preference !== 'auto') {
          return current;
        }

        const nextTheme: ResolvedTheme = isDark ? 'dark' : 'light';
        return current.theme === nextTheme ? current : { ...current, theme: nextTheme };
      });
    });
  }, [state.preference]);

  const setPreference = useCallback((preference: ThemePreference) => {
    persistThemePreference(preference);
    setState((current) => ({
      ...current,
      preference,
      theme: resolveThemeFromPreference(preference),
    }));
  }, []);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference: state.preference,
      theme: state.theme,
      setPreference,
    }),
    [setPreference, state.preference, state.theme],
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error('useThemePreference must be used within a ThemePreferenceProvider');
  }

  return context;
}
