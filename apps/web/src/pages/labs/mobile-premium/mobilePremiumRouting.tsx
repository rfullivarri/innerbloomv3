import { createContext, useContext, type ReactNode } from 'react';

export const DEFAULT_MOBILE_PREMIUM_BASE = '/labs/mobile-premium';

const MobilePremiumBasePathContext = createContext(DEFAULT_MOBILE_PREMIUM_BASE);

export function normalizeMobilePremiumBasePath(basePath: string | undefined): string {
  const fallback = DEFAULT_MOBILE_PREMIUM_BASE;
  const value = (basePath ?? fallback).trim();
  if (!value) return fallback;
  const prefixed = value.startsWith('/') ? value : `/${value}`;
  return prefixed.replace(/\/+$/, '') || fallback;
}

export function MobilePremiumBasePathProvider({
  basePath,
  children,
}: {
  basePath?: string;
  children: ReactNode;
}) {
  return (
    <MobilePremiumBasePathContext.Provider value={normalizeMobilePremiumBasePath(basePath)}>
      {children}
    </MobilePremiumBasePathContext.Provider>
  );
}

export function useMobilePremiumBasePath(): string {
  return useContext(MobilePremiumBasePathContext);
}
