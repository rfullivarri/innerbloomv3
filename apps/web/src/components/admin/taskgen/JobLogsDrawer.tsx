import { useMemo } from 'react';
import type { TaskgenJob, TaskgenJobLog } from '../../../lib/types';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

type JobLogsDrawerProps = {
  job: TaskgenJob | null;
  logs: TaskgenJobLog[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function JsonNode({ name, value, level }: { name?: string; value: unknown; level: number }) {
  if (Array.isArray(value)) {
    return (
      <details open={level <= 0} className="space-y-1">
        {name ? <summary className="cursor-pointer text-slate-200">{name} [{value.length}]</summary> : null}
        <div className="space-y-1 border-l border-slate-700/60 pl-3">
          {value.length === 0 ? (
            <div className="text-xs text-slate-500">(vacío)</div>
          ) : (
            value.map((entry, index) => (
              <JsonNode key={index} name={String(index)} value={entry} level={level + 1} />
            ))
          )}
        </div>
      </details>
    );
  }

  if (isObject(value)) {
    const entries = Object.entries(value);
    return (
      <details open={level <= 0} className="space-y-1">
        {name ? <summary className="cursor-pointer text-slate-200">{name}</summary> : null}
        <div className="space-y-1 border-l border-slate-700/60 pl-3">
          {entries.length === 0 ? (
            <div className="text-xs text-slate-500">(vacío)</div>
          ) : (
            entries.map(([key, entry]) => (
              <JsonNode key={key} name={key} value={entry} level={level + 1} />
            ))
          )}
        </div>
      </details>
    );
  }

  let display = '';
  if (value === null || value === undefined) {
    display = 'null';
  } else if (typeof value === 'string') {
    display = value;
  } else {
    display = JSON.stringify(value);
  }

  return (
    <div className="text-xs text-slate-300">
      {name ? <span className="text-slate-500">{name}: </span> : null}
      <code className="whitespace-pre-wrap break-words text-slate-200">{display}</code>
    </div>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '–';
  }

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return DATE_TIME_FORMATTER.format(date);
  } catch {
    return value;
  }
}

function levelColor(level: string): string {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return 'text-red-300';
    case 'WARN':
    case 'WARNING':
      return 'text-amber-300';
    case 'INFO':
      return 'text-sky-300';
    case 'DEBUG':
      return 'text-slate-400';
    default:
      return 'text-slate-300';
  }
}

export function JobLogsDrawer({ job, logs, loading = false, error = null, onClose }: JobLogsDrawerProps) {
  const title = useMemo(() => {
    if (!job) {
      return 'Logs del job';
    }
    return `Logs del job ${job.id.slice(0, 8)}…`;
  }, [job]);

  if (!job) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <button type="button" className="flex-1 bg-black/40" onClick={onClose} aria-label="Cerrar logs" />
      <aside className="flex w-full max-w-xl flex-col border-l border-slate-800/60 bg-slate-950/95 shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-800/60 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Correlation ID: <span className="font-mono text-slate-300">{job.correlationId ?? '–'}</span>
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-700/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            onClick={onClose}
          >
            Cerrar
          </button>
        </header>

        <section className="space-y-2 border-b border-slate-800/60 px-5 py-4 text-xs text-slate-300">
          <div className="flex gap-2">
            <span className="text-slate-400">Usuario:</span>
            <span className="font-mono text-sky-200">{job.userId}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Email:</span>
            <span className="truncate text-slate-100">{job.userEmail ?? '–'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Modo:</span>
            <span className="text-slate-100">{job.mode ?? '–'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Status:</span>
            <span className="text-slate-100">{job.status}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Creado:</span>
            <span className="text-slate-100">{formatDateTime(job.createdAt)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Iniciado:</span>
            <span className="text-slate-100">{formatDateTime(job.startedAt)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Completado:</span>
            <span className="text-slate-100">{formatDateTime(job.completedAt)}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Tasks insertadas:</span>
            <span className="text-slate-100">{job.tasksInserted ?? '–'}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-400">Error code:</span>
            <span className="text-slate-100">{job.errorCode ?? '–'}</span>
          </div>
        </section>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">Cargando logs…</div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Sin eventos registrados para este job.</div>
          ) : (
            <ul className="space-y-4">
              {logs.map((log) => (
                <li key={log.id} className="rounded-lg border border-slate-800/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                    <span className={`text-xs font-semibold uppercase ${levelColor(log.level)}`}>{log.level}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{log.event}</p>
                  {log.data ? (
                    <div className="mt-2 rounded-lg border border-slate-800/60 bg-slate-950/80 px-3 py-2">
                      <JsonNode name="data" value={log.data} level={0} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
