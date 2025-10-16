// #REMOVE_ME_DEBUG_BYPASS
import { FormEvent, useMemo, useState } from 'react';

type RunPayload = {
  user_id: string;
  mode?: string;
  seed?: number;
  dry_run: boolean;
  prompt_override?: string;
  store?: boolean;
};

const ENABLED = String(import.meta.env.VITE_ENABLE_TASKGEN_TRIGGER ?? 'false').toLowerCase() === 'true';
const ADMIN_TOKEN = import.meta.env.DEV
  ? String(import.meta.env.VITE_ADMIN_TRIGGER_TOKEN ?? '').trim()
  : '';

export default function DebugAiTaskgenPage() {
  const [formState, setFormState] = useState({
    user_id: '',
    mode: '',
    seed: '',
    dry_run: true,
    prompt_override: '',
    store: false,
  });
  const [adminToken, setAdminToken] = useState(ADMIN_TOKEN);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('(sin datos)');

  const headers = useMemo(() => {
    const base: Record<string, string> = { 'content-type': 'application/json' };
    if (adminToken) {
      base['x-admin-token'] = adminToken;
    }
    return base;
  }, [adminToken]);

  if (!ENABLED) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-slate-100">
        <h1 className="text-2xl font-semibold">AI Taskgen Debug</h1>
        <p>ENABLE_TASKGEN_TRIGGER must be set to true for this page.</p>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.user_id) {
      setResult('Debe completar user_id');
      return;
    }

    const payload: RunPayload = {
      user_id: formState.user_id,
      dry_run: formState.dry_run,
    };

    if (formState.mode) {
      payload.mode = formState.mode;
    }
    if (formState.seed) {
      payload.seed = Number(formState.seed);
    }
    if (formState.prompt_override.trim().length > 0) {
      payload.prompt_override = formState.prompt_override;
    }
    if (formState.store) {
      payload.store = true;
    }

    setLoading(true);
    try {
      const response = await fetch('/_debug/ai-taskgen/run', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setResult(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-6 text-slate-100">
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-slate-900/20">
        <h1 className="text-2xl font-semibold">AI Taskgen Debug</h1>
        <p className="mt-2 text-sm text-slate-400">
          Usa este formulario para probar prompts sin impactar la base (usa dry run para evitar llamadas a OpenAI).
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-1">
            <label className="text-sm font-medium">UUID de usuario</label>
            <input
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              placeholder="00000000-0000-0000-0000-000000000000"
              value={formState.user_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, user_id: event.target.value }))}
              required
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Modo</label>
            <select
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              value={formState.mode}
              onChange={(event) => setFormState((prev) => ({ ...prev, mode: event.target.value }))}
            >
              <option value="">Inferido</option>
              <option value="low">low</option>
              <option value="chill">chill</option>
              <option value="flow">flow</option>
              <option value="evolve">evolve</option>
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Seed (opcional)</label>
            <input
              type="number"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              value={formState.seed}
              onChange={(event) => setFormState((prev) => ({ ...prev, seed: event.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.dry_run}
                onChange={(event) => setFormState((prev) => ({ ...prev, dry_run: event.target.checked }))}
              />
              Dry run
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.store}
                onChange={(event) => setFormState((prev) => ({ ...prev, store: event.target.checked }))}
              />
              Persistir en DB
            </label>
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Prompt override</label>
            <textarea
              rows={6}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              placeholder="Pegá aquí un prompt alternativo"
              value={formState.prompt_override}
              onChange={(event) => setFormState((prev) => ({ ...prev, prompt_override: event.target.value }))}
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">x-admin-token (solo dev)</label>
            <input
              type="password"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="ADMIN_TRIGGER_TOKEN"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            disabled={loading}
          >
            {loading ? 'Procesando…' : 'Generar'}
          </button>
        </form>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-6 shadow-lg shadow-slate-900/20">
        <h2 className="text-xl font-semibold">Respuesta</h2>
        <pre className="mt-3 max-h-[480px] overflow-auto rounded-lg bg-slate-950/60 p-4 text-xs text-slate-200">
          {result}
        </pre>
      </section>
    </div>
  );
}
