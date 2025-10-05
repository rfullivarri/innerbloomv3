import { useState } from 'react';
import { API_BASE } from '../../lib/api';

const isDev = import.meta.env.DEV;

type HealthState = 'idle' | 'loading' | 'ok' | 'error';

export function DevBanner() {
  const [status, setStatus] = useState<HealthState>('idle');
  const [message, setMessage] = useState<string>('');

  if (!isDev) return null;

  const handlePing = async () => {
    if (!API_BASE) {
      setStatus('error');
      setMessage('VITE_API_BASE_URL is not set');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch(`${API_BASE}/health/db`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      setStatus('ok');
      setMessage(payload ? JSON.stringify(payload) : 'Database healthy');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const statusStyles: Record<HealthState, string> = {
    idle: 'border-white/20 text-text-muted',
    loading: 'border-accent-blue/60 text-accent-blue',
    ok: 'border-emerald-400/70 text-emerald-300',
    error: 'border-rose-400/60 text-rose-300'
  };

  return (
    <div className={`sticky top-0 z-50 hidden w-full justify-center border-b bg-surface/80 px-4 py-2 text-sm backdrop-blur lg:flex ${statusStyles[status]}`}>
      <div className="flex w-full max-w-6xl items-center justify-between gap-4">
        <span>
          API base: <code className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-text">{API_BASE || 'not set'}</code>
        </span>
        <div className="flex items-center gap-3">
          {message && <span className="text-xs text-text-muted">{message}</span>}
          <button
            type="button"
            onClick={handlePing}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text hover:bg-white/10"
          >
            {status === 'loading' ? 'Pinging…' : 'Ping DB'}
          </button>
        </div>
      </div>
    </div>
  );
}
