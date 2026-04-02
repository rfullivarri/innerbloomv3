import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './admin2-theme.css';

type AdminTheme = 'light' | 'dark';

type Admin2ThemeContextValue = {
  theme: AdminTheme;
  toggleTheme: () => void;
};

const STORAGE_KEY = 'innerbloom-admin2-theme';

const Admin2ThemeContext = createContext<Admin2ThemeContextValue | null>(null);

function resolveInitialTheme(): AdminTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function Admin2ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AdminTheme>(resolveInitialTheme);
  const previousRootTheme = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    if (previousRootTheme.current === null) {
      previousRootTheme.current = root.getAttribute('data-theme');
    }

    root.setAttribute('data-theme', theme);
  }, [theme]);

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

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<Admin2ThemeContextValue>(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <Admin2ThemeContext.Provider value={value}>
      <div className="admin-theme admin2-theme" data-theme={theme}>
        {children}
      </div>
    </Admin2ThemeContext.Provider>
  );
}

export function useAdmin2Theme() {
  const context = useContext(Admin2ThemeContext);

  if (!context) {
    throw new Error('useAdmin2Theme must be used within Admin2ThemeProvider');
  }

  return context;
}
