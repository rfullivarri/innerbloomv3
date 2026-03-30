import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import './index.css';
import { DEV_USER_SWITCH_ACTIVE } from './lib/api';
import { isApiLoggingEnabled, setApiLoggingEnabled } from './lib/logger';
import { resolveAuthLanguage } from './lib/authLanguage';
import { getClerkLocalization } from './lib/clerkLocalization';
import { ThemePreferenceProvider } from './theme/ThemePreferenceProvider';
import { applyStoredThemePreference } from './theme/themePreference';
import { PostLoginLanguageProvider } from './i18n/postLoginLanguage';
import { NativeMobileBridge } from './mobile/NativeMobileBridge';
import { isNativeCapacitorPlatform } from './mobile/capacitor';
import { RuntimeAuthProvider } from './auth/runtimeAuth';

declare global {
  interface Window {
    setInnerbloomApiLogging?: (enabled: boolean) => void;
    isInnerbloomApiLoggingEnabled?: () => boolean;
  }
}

setApiLoggingEnabled(true);

if (typeof window !== 'undefined') {
  (window as any).__DBG ??= true;
  (window as any).setDbg = (on: boolean) => ((window as any).__DBG = !!on);
  window.setInnerbloomApiLogging = setApiLoggingEnabled;
  window.isInnerbloomApiLoggingEnabled = isApiLoggingEnabled;
  console.info('[API] Use window.setInnerbloomApiLogging(false) to disable API logs.');
}


applyStoredThemePreference();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const publishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || (DEV_USER_SWITCH_ACTIVE ? 'dev-placeholder' : undefined);

if (!publishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set');
}

function LocalizedClerkProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isNativeApp = isNativeCapacitorPlatform();
  const authLanguage = resolveAuthLanguage(location.search);
  const clerkLocalization = getClerkLocalization(authLanguage);
  const isMobileBridgeRoute = location.pathname === '/mobile-auth';
  const clerkEnabled = !isNativeApp || isMobileBridgeRoute;
  const mobileBridgeSearch = new URLSearchParams(location.search);
  const mobileBridgeMode = mobileBridgeSearch.get('mode') === 'sign-up' ? 'sign-up' : 'sign-in';
  const mobileBridgeReturnTo = mobileBridgeSearch.get('return_to');
  const buildMobileBridgePath = (mode: 'sign-in' | 'sign-up') => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    if (mobileBridgeReturnTo) {
      params.set('return_to', mobileBridgeReturnTo);
    }
    const query = params.toString();
    return `/mobile-auth${query ? `?${query}` : ''}`;
  };
  const signInUrl = isMobileBridgeRoute ? buildMobileBridgePath('sign-in') : '/login';
  const signUpUrl = isMobileBridgeRoute ? buildMobileBridgePath('sign-up') : '/sign-up';
  const authBridgeRedirectUrl = isMobileBridgeRoute ? buildMobileBridgePath(mobileBridgeMode) : undefined;

  return (
    <RuntimeAuthProvider
      key={`${authLanguage}:${clerkEnabled ? 'clerk' : 'native-shell'}`}
      clerkEnabled={clerkEnabled}
      publishableKey={publishableKey}
      localization={clerkLocalization}
      standardBrowser={!isNativeApp}
      touchSession={!isNativeApp}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInForceRedirectUrl={authBridgeRedirectUrl}
      signUpForceRedirectUrl={authBridgeRedirectUrl}
      signInFallbackRedirectUrl={authBridgeRedirectUrl}
      signUpFallbackRedirectUrl={authBridgeRedirectUrl}
    >
      {children}
    </RuntimeAuthProvider>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <LocalizedClerkProvider>
        <PostLoginLanguageProvider>
          <ThemePreferenceProvider>
            <NativeMobileBridge />
            <App />
          </ThemePreferenceProvider>
        </PostLoginLanguageProvider>
      </LocalizedClerkProvider>
    </BrowserRouter>
  </StrictMode>,
);
