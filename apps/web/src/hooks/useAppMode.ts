import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

function hasNativeAppFlag(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return (window as typeof window & { __INNERBLOOM_NATIVE_APP__?: unknown }).__INNERBLOOM_NATIVE_APP__ === true;
  } catch (error) {
    console.warn('Unable to read native app flag from window', error);
    return false;
  }
}

export function isAppModeEnabled(search?: string | null): boolean {
  if (search) {
    const params = new URLSearchParams(search);
    if (params.get('app') === '1') {
      return true;
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('app') === '1') {
        return true;
      }
    } catch (error) {
      console.warn('Failed to read app param from window.location.search', error);
    }
  }

  return hasNativeAppFlag();
}

export function useAppMode(): boolean {
  const location = useLocation();

  return useMemo(() => isAppModeEnabled(location.search), [location.search]);
}
