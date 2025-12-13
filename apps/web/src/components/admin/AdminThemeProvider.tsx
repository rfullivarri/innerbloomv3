import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './admin-theme.css';

type AdminTheme = 'light' | 'dark';

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'innerbloom-admin-theme';

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function resolveInitialTheme(): { theme: AdminTheme; hasStoredPreference: boolean } {
  if (typeof window === 'undefined') {
    return { theme: 'dark', hasStoredPreference: false };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return { theme: stored, hasStoredPreference: true };
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { theme: prefersDark ? 'dark' : 'light', hasStoredPreference: false };
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(resolveInitialTheme);
  const previousRootTheme = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !state.hasStoredPreference) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, state.theme);
  }, [state.hasStoredPreference, state.theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || state.hasStoredPreference) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) =>
      setState((prev) => ({ ...prev, theme: event.matches ? 'dark' : 'light' }));

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [state.hasStoredPreference]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    if (previousRootTheme.current === null) {
      previousRootTheme.current = root.getAttribute('data-theme');
    }

    root.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    return () => {
      if (previousRootTheme.current === null) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', previousRootTheme.current);
      }
    };
  }, []);

  const setTheme = useCallback((theme: AdminTheme) => setState({ theme, hasStoredPreference: true }), []);

  const toggleTheme = useCallback(
    () =>
      setState((prev) => ({
        theme: prev.theme === 'dark' ? 'light' : 'dark',
        hasStoredPreference: true,
      })),
    [],
  );

  const value = useMemo<AdminThemeContextValue>(
    () => ({
      theme: state.theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, state.theme, toggleTheme],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div className="admin-theme" data-theme={state.theme}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);

  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider');
  }

  return context;
}
