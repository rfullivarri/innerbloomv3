import { useState } from 'react';
import {
  API_BASE,
  DEV_USER_SWITCH_ACTIVE,
  DEV_USER_SWITCH_OPTIONS,
  getDevUserOverride,
  setDevUserOverride,
} from '../../lib/api';

const isDev = import.meta.env.DEV;

type HealthState = 'idle' | 'loading' | 'ok' | 'error';

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function DevBanner() {
  const [status, setStatus] = useState<HealthState>('idle');
  const [message, setMessage] = useState<string>('');
  const [devUser, setDevUser] = useState<string | null>(() => getDevUserOverride());

  if (!isDev) return null;

  const handlePing = async () => {
    if (!API_BASE) {
      setStatus('error');
      setMessage('VITE_API_URL is not set');
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

  const showDevUserSwitch = DEV_USER_SWITCH_ACTIVE && DEV_USER_SWITCH_OPTIONS.length > 0;

  const handleSelectUser = (userId: (typeof DEV_USER_SWITCH_OPTIONS)[number]['id']) => {
    setDevUserOverride(userId);
    setDevUser(userId);
  };

  return (
    <div
      className={`sticky top-0 z-50 hidden w-full justify-center border-b bg-surface/80 px-4 py-2 text-sm backdrop-blur lg:flex ${statusStyles[status]}`}
    >
      <div className="flex w-full max-w-6xl flex-col gap-2">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <span>
            API base:{' '}
            <code className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-text">{API_BASE || 'not set'}</code>
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
        {showDevUserSwitch && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Usuario demo</span>
            <div className="flex flex-wrap gap-2">
              {DEV_USER_SWITCH_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectUser(option.id)}
                  disabled={devUser === option.id}
                  className={classNames('dev-user-chip', devUser === option.id && 'dev-user-chip--active')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
