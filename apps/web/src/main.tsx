import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { getClerkPublishableKey } from './config/clerk';

function MissingClerkConfiguration() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center text-text">
      <h1 className="text-2xl font-semibold text-white">Configuración de Clerk incompleta</h1>
      <p className="max-w-xl text-sm text-text-subtle">
        No encontramos una publishable key para Clerk. Define la variable{' '}
        <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-white">VITE_CLERK_PUBLISHABLE_KEY</code>{' '}
        (o&nbsp;<code className="rounded bg-white/5 px-1 py-0.5 text-xs text-white">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>)
        y vuelve a desplegar la aplicación.
      </p>
      <p className="max-w-xl text-xs text-text-muted">
        También puedes inyectar la clave mediante la etiqueta{' '}
        <code className="rounded bg-white/5 px-1 py-0.5">&lt;meta name="clerk-publishable-key" /&gt;</code> en <code>index.html</code>.
      </p>
    </div>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const publishableKey = getClerkPublishableKey();

const root = createRoot(rootElement);

if (!publishableKey) {
  root.render(
    <StrictMode>
      <MissingClerkConfiguration />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </StrictMode>,
  );
}
