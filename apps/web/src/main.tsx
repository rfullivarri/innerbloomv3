import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { isApiLoggingEnabled, setApiLoggingEnabled } from './lib/logger';

declare global {
  interface Window {
    setInnerbloomApiLogging?: (enabled: boolean) => void;
    isInnerbloomApiLoggingEnabled?: () => boolean;
  }
}

setApiLoggingEnabled(true);

if (typeof window !== 'undefined') {
  (window as any).__DBG = true;
  (window as any).setDbg = (on: boolean) => ((window as any).__DBG = !!on);
  window.setInnerbloomApiLogging = setApiLoggingEnabled;
  window.isInnerbloomApiLoggingEnabled = isApiLoggingEnabled;
  console.info('[API] Use window.setInnerbloomApiLogging(false) to disable API logs.');
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set');
}

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
);
