import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../state/UserContext';

const DEMO_ID = '00000000-0000-0000-0000-000000000001';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUserId } = useUser();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Please paste a valid user ID.');
      return;
    }
    setError(null);
    setUserId(trimmed);
    navigate('/dashboard');
  };

  const handleDemo = () => {
    setUserId(DEMO_ID);
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-lg space-y-10 rounded-3xl p-8 text-text shadow-glow">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Innerbloom</p>
          <h1 className="font-display text-3xl font-semibold text-white">Welcome back, explorer</h1>
          <p className="text-sm text-text-subtle">Drop your user ID to continue your quest streak.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-left text-xs font-semibold uppercase tracking-wide text-text-subtle">
            User ID
            <input
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0000-0000-..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-surface-muted/70 px-4 py-3 text-sm text-white outline-none transition focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/40"
            />
          </label>
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-accent-purple via-accent-blue to-accent-amber px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 shadow-glow transition hover:shadow-lg"
          >
            Continue
          </button>
        </form>

        <div className="space-y-3 text-center text-sm text-text-muted">
          <p className="text-xs uppercase tracking-[0.2em] text-text-subtle">or</p>
          <button
            type="button"
            onClick={handleDemo}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-text hover:border-white/20 hover:bg-white/10"
          >
            Continue as Demo
          </button>
          <p className="text-xs text-text-subtle">
            Demo mode uses a shared sandbox profile so everyone can explore the dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
