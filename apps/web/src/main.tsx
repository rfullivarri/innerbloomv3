import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App';
import './index.css';
import { DEV_USER_SWITCH_ACTIVE } from './lib/api';
import { isApiLoggingEnabled, setApiLoggingEnabled } from './lib/logger';
import { resolveAuthLanguage } from './lib/authLanguage';
import { getClerkLocalization } from './lib/clerkLocalization';

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
  const authLanguage = resolveAuthLanguage(location.search);
  const clerkLocalization = getClerkLocalization(authLanguage);

  return (
    <ClerkProvider
      key={authLanguage}
      publishableKey={publishableKey}
      localization={clerkLocalization}
    >
      {children}
    </ClerkProvider>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <LocalizedClerkProvider>
        <App />
      </LocalizedClerkProvider>
    </BrowserRouter>
  </StrictMode>,
);
