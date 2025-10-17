import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  fetchTaskgenTraceByCorrelation,
  fetchTaskgenTraceByUser,
  fetchTaskgenTraceGlobal,
  postTaskgenForceRun,
} from '../../lib/adminApi';
import type { TaskgenTraceEvent } from '../../lib/types';

type TraceTableProps = {
  title: string;
  events: TaskgenTraceEvent[];
  loading?: boolean;
  emptyMessage: string;
};

function levelClass(level: TaskgenTraceEvent['level']): string {
  switch (level) {
    case 'error':
      return 'text-red-300';
    case 'warn':
      return 'text-amber-300';
    default:
      return 'text-sky-200';
  }
}

function TraceTable({ title, events, loading = false, emptyMessage }: TraceTableProps) {
  const rows = events;
  const displayRows = rows.length > 0;

  return (
    <section className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
        {loading ? <span className="text-xs text-slate-400">Cargando…</span> : null}
      </header>
      {displayRows ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr className="border-b border-slate-700/60 text-[11px] uppercase tracking-wide">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Nivel</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Correlation</th>
                <th className="px-3 py-2">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-100">
              {rows.map((event) => {
                const prettyData = JSON.stringify(
                  {
                    mode: event.mode ?? null,
                    origin: event.origin ?? null,
                    ...(event.data ?? {}),
                  },
                  null,
                  2,
                );
                return (
                  <tr key={`${event.correlationId}-${event.event}-${event.at}`} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-300">
                      {new Date(event.at).toLocaleString()}
                    </td>
                    <td className={`px-3 py-2 text-xs font-semibold ${levelClass(event.level)}`}>
                      {event.level.toUpperCase()}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-200">{event.event}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-400">{event.correlationId}</td>
                    <td className="px-3 py-2 text-[11px] text-slate-200">
                      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-4 text-slate-300">
                        {prettyData}
                      </pre>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400">{loading ? 'Cargando…' : emptyMessage}</p>
      )}
    </section>
  );
}

type TaskgenTracePanelProps = {
  selectedUserId?: string | null;
};

export function TaskgenTracePanel({ selectedUserId }: TaskgenTracePanelProps) {
  const [userIdQuery, setUserIdQuery] = useState(selectedUserId ?? '');
  const [correlationIdQuery, setCorrelationIdQuery] = useState('');
  const [forceUserId, setForceUserId] = useState(selectedUserId ?? '');
  const [forceMode, setForceMode] = useState('');
  const [userEvents, setUserEvents] = useState<TaskgenTraceEvent[]>([]);
  const [correlationEvents, setCorrelationEvents] = useState<TaskgenTraceEvent[]>([]);
  const [globalEvents, setGlobalEvents] = useState<TaskgenTraceEvent[]>([]);
  const [globalLimit, setGlobalLimit] = useState(50);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingCorrelation, setLoadingCorrelation] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingForce, setLoadingForce] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forceResult, setForceResult] = useState<string | null>(null);

  useEffect(() => {
    if (selectedUserId) {
      setUserIdQuery(selectedUserId);
      setForceUserId((prev) => (prev ? prev : selectedUserId));
    }
  }, [selectedUserId]);

  const refreshGlobal = useCallback(async () => {
    setLoadingGlobal(true);
    setErrorMessage(null);
    try {
      const response = await fetchTaskgenTraceGlobal(globalLimit);
      setGlobalEvents(response.events ?? []);
    } catch (error) {
      console.error('[admin] failed to fetch taskgen global traces', error);
      setErrorMessage('No se pudieron cargar las trazas globales.');
    } finally {
      setLoadingGlobal(false);
    }
  }, [globalLimit]);

  useEffect(() => {
    void refreshGlobal();
  }, [refreshGlobal]);

  const handleFetchByUser = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = userIdQuery.trim();
      if (!trimmed) {
        setUserEvents([]);
        return;
      }
      setLoadingUser(true);
      setErrorMessage(null);
      try {
        const response = await fetchTaskgenTraceByUser(trimmed);
        setUserEvents(response.events ?? []);
      } catch (error) {
        console.error('[admin] failed to fetch taskgen traces by user', error);
        setErrorMessage('No se pudieron cargar las trazas para ese usuario.');
      } finally {
        setLoadingUser(false);
      }
    },
    [userIdQuery],
  );

  const handleFetchByCorrelation = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = correlationIdQuery.trim();
      if (!trimmed) {
        setCorrelationEvents([]);
        return;
      }
      setLoadingCorrelation(true);
      setErrorMessage(null);
      try {
        const response = await fetchTaskgenTraceByCorrelation(trimmed);
        setCorrelationEvents(response.events ?? []);
      } catch (error) {
        console.error('[admin] failed to fetch taskgen traces by correlation', error);
        setErrorMessage('No se encontraron trazas para ese correlationId.');
      } finally {
        setLoadingCorrelation(false);
      }
    },
    [correlationIdQuery],
  );

  const handleForceRun = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedUserId = forceUserId.trim();
      if (!trimmedUserId) {
        setErrorMessage('Ingresá un user_id válido.');
        return;
      }
      setLoadingForce(true);
      setErrorMessage(null);
      setForceResult(null);
      try {
        const response = await postTaskgenForceRun({
          userId: trimmedUserId,
          mode: forceMode.trim() ? forceMode.trim().toLowerCase() : undefined,
        });
        setForceResult(response.correlation_id);
        await refreshGlobal();
      } catch (error) {
        console.error('[admin] failed to force taskgen run', error);
        setErrorMessage('No se pudo forzar la generación de tareas.');
      } finally {
        setLoadingForce(false);
      }
    },
    [forceMode, forceUserId, refreshGlobal],
  );

  const globalSummary = useMemo(() => {
    if (globalEvents.length === 0) {
      return 'No hay eventos recientes.';
    }
    return `${globalEvents.length} eventos`; 
  }, [globalEvents.length]);

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Buscar trazas de TaskGen
        </h2>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleFetchByUser}>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Buscar por user_id</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={userIdQuery}
                onChange={(event) => setUserIdQuery(event.target.value)}
                placeholder="00000000-0000-4000-8000-..."
                className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-sky-400"
              >
                Buscar
              </button>
            </div>
          </label>
        </form>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleFetchByCorrelation}>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Buscar por correlationId</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={correlationIdQuery}
                onChange={(event) => setCorrelationIdQuery(event.target.value)}
                placeholder="00000000-0000-4000-8000-..."
                className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-sky-400"
              >
                Buscar
              </button>
            </div>
          </label>
        </form>
      </section>

      <section className="space-y-4 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Forzar nueva ejecución
        </h2>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleForceRun}>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">user_id</span>
            <input
              type="text"
              value={forceUserId}
              onChange={(event) => setForceUserId(event.target.value)}
              placeholder="00000000-0000-4000-8000-..."
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-slate-400">Modo (opcional)</span>
            <input
              type="text"
              value={forceMode}
              onChange={(event) => setForceMode(event.target.value)}
              placeholder="low | chill | flow | evolve"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loadingForce}
              className="w-full rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
            >
              {loadingForce ? 'Enviando…' : 'Forzar generación'}
            </button>
          </div>
        </form>
        {forceResult ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100">
            Correlation ID generado: <span className="font-mono">{forceResult}</span>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Eventos globales recientes
            </h2>
            <p className="text-xs text-slate-400">{globalSummary}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <label className="flex items-center gap-2">
              <span>Límite</span>
              <input
                type="number"
                min={1}
                max={500}
                value={globalLimit}
                onChange={(event) => setGlobalLimit(Number(event.target.value))}
                className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => void refreshGlobal()}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
            >
              Actualizar
            </button>
          </div>
        </header>
        <TraceTable
          title="Eventos globales"
          events={globalEvents}
          loading={loadingGlobal}
          emptyMessage="No hay eventos registrados."
        />
      </section>

      <TraceTable
        title="Eventos por usuario"
        events={userEvents}
        loading={loadingUser}
        emptyMessage="Buscá un user_id para ver sus eventos."
      />

      <TraceTable
        title="Eventos por correlationId"
        events={correlationEvents}
        loading={loadingCorrelation}
        emptyMessage="Buscá un correlationId para ver eventos asociados."
      />
    </div>
  );
}
