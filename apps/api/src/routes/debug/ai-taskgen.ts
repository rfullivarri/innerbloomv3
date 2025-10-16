// #REMOVE_ME_DEBUG_BYPASS
import express from 'express';
import { z } from 'zod';
import process from 'node:process';
import { createDebugTaskgenRunner, type DebugTaskgenInput } from '../../services/debugTaskgenService.js';

const router = express.Router();

const requestSchema = z.object({
  user_id: z.string().uuid({ message: 'user_id must be a valid UUID' }),
  mode: z.enum(['low', 'chill', 'flow', 'evolve']).optional(),
  seed: z.number().int().optional(),
  dry_run: z.boolean().optional(),
  prompt_override: z.string().optional(),
  store: z.boolean().optional(),
});

const runner = createDebugTaskgenRunner();

function ensureEnabled() {
  if (process.env.ENABLE_TASKGEN_TRIGGER !== 'true') {
    throw new Error('Taskgen trigger is disabled');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    String(process.env.DEBUG_ALLOW_IN_PROD ?? 'false').toLowerCase() !== 'true'
  ) {
    throw new Error('Taskgen trigger is disabled in production');
  }
}

router.get('/', (_req, res) => {
  try {
    ensureEnabled();
  } catch {
    return res.status(404).send('Not found');
  }

  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>AI Taskgen Debug</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #f8fafc; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      form { display: grid; gap: 0.75rem; max-width: 480px; }
      label { display: flex; flex-direction: column; font-size: 0.95rem; gap: 0.25rem; }
      input, textarea, select { padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #334155; background: #1e293b; color: inherit; }
      button { padding: 0.6rem 1rem; border: none; border-radius: 0.5rem; background: #38bdf8; color: #0f172a; font-weight: 600; cursor: pointer; }
      pre { background: #020617; padding: 1rem; border-radius: 0.75rem; white-space: pre-wrap; word-break: break-word; }
      .row { display: flex; align-items: center; gap: 0.5rem; }
      .row input[type="checkbox"] { width: auto; }
      .panel { margin-top: 2rem; }
      .warning { font-size: 0.85rem; color: #facc15; }
    </style>
  </head>
  <body>
    <h1>AI Taskgen Debug</h1>
    <p class="warning">This interface is guarded by ENABLE_TASKGEN_TRIGGER and requires the admin token header.</p>
    <form id="debug-form">
      <label>UUID de usuario
        <input type="text" name="user_id" required placeholder="00000000-0000-0000-0000-000000000000" />
      </label>
      <label>Modo
        <select name="mode">
          <option value="">Inferido</option>
          <option value="low">low</option>
          <option value="chill">chill</option>
          <option value="flow">flow</option>
          <option value="evolve">evolve</option>
        </select>
      </label>
      <label>Seed (opcional)
        <input type="number" name="seed" />
      </label>
      <div class="row">
        <label class="row"><input type="checkbox" name="dry_run" checked /> Dry run</label>
        <label class="row"><input type="checkbox" name="store" /> Persistir en DB</label>
      </div>
      <label>Prompt override
        <textarea name="prompt_override" rows="6" placeholder="Pegá aquí un prompt completo o JSON"></textarea>
      </label>
      <label>Admin token (x-admin-token)
        <input type="password" name="admin_token" placeholder="Solo en dev" />
      </label>
      <button type="submit">Generar</button>
    </form>
    <div class="panel">
      <h2>Respuesta</h2>
      <pre id="result">(sin datos)</pre>
    </div>
    <script>
      const form = document.getElementById('debug-form');
      const output = document.getElementById('result');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const payload = {
          user_id: data.get('user_id'),
          mode: data.get('mode') || undefined,
          seed: data.get('seed') ? Number(data.get('seed')) : undefined,
          dry_run: data.get('dry_run') !== null,
          store: data.get('store') !== null,
          prompt_override: data.get('prompt_override') ? String(data.get('prompt_override')) : undefined,
        };

        try {
          const response = await fetch('/_debug/ai-taskgen/run', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-admin-token': data.get('admin_token') || '',
            },
            body: JSON.stringify(payload),
          });

          const json = await response.json();
          output.textContent = JSON.stringify(json, null, 2);
        } catch (error) {
          output.textContent = 'Request failed: ' + (error?.message || error);
        }
      });
    </script>
  </body>
</html>`);
});

router.post('/run', async (req, res) => {
  try {
    ensureEnabled();
  } catch (error) {
    return res.status(404).json({ status: 'error', error: (error as Error).message });
  }

  const adminToken = req.header('x-admin-token') ?? '';
  if (!process.env.ADMIN_TRIGGER_TOKEN || adminToken !== process.env.ADMIN_TRIGGER_TOKEN) {
    return res.status(401).json({ status: 'error', error: 'Invalid admin token' });
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessage = parsed.error.errors.map((err) => err.message).join('; ');
    return res.status(400).json({
      status: 'error',
      validation: { valid: false, errors: [errorMessage] },
    });
  }

  const body = parsed.data;
  const input: DebugTaskgenInput = {
    userId: body.user_id,
    mode: body.mode,
    seed: body.seed,
    dryRun: body.dry_run ?? true,
    promptOverride: body.prompt_override,
    store: body.store ?? false,
  };

  const result = await runner(input);

  if (result.status === 'error') {
    return res.status(200).json(result);
  }

  return res.status(200).json(result);
});

export default router;
