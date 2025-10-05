import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type UserContextValue = {
  userId: string | null;
  setUserId: (value: string | null) => void;
};

const STORAGE_KEY = 'userId';

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? stored : null;
  });

  const setUserId = useCallback((value: string | null) => {
    setUserIdState(value);
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handle = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setUserIdState(event.newValue ?? null);
      }
    };

    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, []);

  const value = useMemo<UserContextValue>(() => ({ userId, setUserId }), [userId, setUserId]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return ctx;
}
