import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { useRequest } from '../../hooks/useRequest';
import {
  DailyReminderSettingsResponse,
  UpdateDailyReminderSettingsPayload,
  getDailyReminderSettings,
  updateDailyReminderSettings,
} from '../../lib/api';
import { TimezoneOption, getTimezoneCatalog, resolveDefaultTimezone } from '../../lib/timezones';
import { Skeleton } from '../common/Skeleton';
import { ToastBanner } from '../common/ToastBanner';
import { TimezoneCombobox } from '../common/TimezoneCombobox';

const DEFAULT_TIME = '09:00';
const LOAD_ERROR_MESSAGE = 'No pudimos cargar tus recordatorios.';
const LOAD_STALE_MESSAGE = 'No pudimos refrescar tus recordatorios. Mostramos tu último estado guardado.';
const SAVE_ERROR_MESSAGE = 'No pudimos guardar tus recordatorios. Intentá nuevamente.';
const SAVE_SUCCESS_MESSAGE = 'Guardamos tus recordatorios.';
const TIME_OPTIONS = buildTimeOptions();

type ReminderFormState = {
  enabled: boolean;
  localTime: string;
  timezone: string;
};

type SubmitStatus = 'idle' | 'saving' | 'success' | 'error';

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, '0')}:${minute === 0 ? '00' : '30'}`;
      options.push(value);
    }
  }
  return options;
}

function normalizeLocalTime(value?: string | null): string {
  if (!value) {
    return DEFAULT_TIME;
  }
  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Math.min(23, Math.max(0, Number(hoursRaw ?? 0)));
  const minutes = Number(minutesRaw ?? 0) >= 30 ? '30' : '00';
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function normalizeReminderResponse(
  response: DailyReminderSettingsResponse | null,
  fallbackTimezone: string,
): ReminderFormState {
  const timezone = response?.timezone ?? response?.timeZone ?? response?.time_zone ?? fallbackTimezone;
  const localTime = normalizeLocalTime(response?.local_time ?? response?.localTime);
  const status = typeof response?.status === 'string' ? response.status.toLowerCase() : null;
  const enabledFromStatus = status === 'active' || status === 'enabled';
  const enabled = typeof response?.enabled === 'boolean' ? response.enabled : enabledFromStatus;

  return {
    enabled,
    localTime,
    timezone: typeof timezone === 'string' && timezone.trim() ? timezone : fallbackTimezone,
  };
}

function combine(...classes: Array<string | null | false | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function DailyReminderSettings() {
  const defaultTimezone = useMemo(() => resolveDefaultTimezone(), []);
  const timeFieldId = useId();
  const timezoneFieldId = useId();
  const [formState, setFormState] = useState<ReminderFormState>({
    enabled: false,
    localTime: DEFAULT_TIME,
    timezone: defaultTimezone,
  });
  const [initialState, setInitialState] = useState<ReminderFormState | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data, status, error, reload } = useRequest(getDailyReminderSettings, []);
  const [timezoneCatalog] = useState<TimezoneOption[]>(() => getTimezoneCatalog());

  useEffect(() => {
    if (status !== 'success') {
      return;
    }
    const normalized = normalizeReminderResponse(data, defaultTimezone);
    setFormState(normalized);
    setInitialState(normalized);
  }, [status, data, defaultTimezone]);

  useEffect(() => {
    if (submitStatus !== 'success') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSubmitStatus('idle');
    }, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [submitStatus]);

  const isInitialLoading = (status === 'idle' || status === 'loading') && !data && !error;
  const hasBlockingError = status === 'error' && !data;
  const isSaving = submitStatus === 'saving';
  const canSubmit =
    !isInitialLoading &&
    !isSaving &&
    initialState !== null &&
    (initialState.enabled !== formState.enabled ||
      initialState.localTime !== formState.localTime ||
      initialState.timezone !== formState.timezone);
  // This copy mirrors the ON/OFF state so the modal stays channel-agnostic.
  const toggleLabel = formState.enabled ? 'Daily Quest activa' : 'Daily Quest pausada';

  const handleToggle = () => {
    if (isInitialLoading || isSaving) {
      return;
    }
    setFormState((previous) => ({ ...previous, enabled: !previous.enabled }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitStatus('saving');
    setSubmitError(null);
    try {
      const status: UpdateDailyReminderSettingsPayload['status'] = formState.enabled ? 'active' : 'paused';
      const payload: UpdateDailyReminderSettingsPayload = {
        status,
        local_time: formState.localTime || DEFAULT_TIME,
        timezone: formState.timezone || defaultTimezone,
      };
      const response = await updateDailyReminderSettings(payload);
      const normalized = normalizeReminderResponse(response, defaultTimezone);
      setFormState(normalized);
      setInitialState(normalized);
      setSubmitStatus('success');
    } catch (submitException) {
      console.error('Failed to update reminder settings', submitException);
      setSubmitStatus('error');
      const friendlyMessage =
        submitException instanceof Error && submitException.message ? submitException.message : SAVE_ERROR_MESSAGE;
      setSubmitError(friendlyMessage);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (hasBlockingError) {
    return (
      <div className="space-y-4">
        <ToastBanner tone="error" message={LOAD_ERROR_MESSAGE} />
        <div>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-base text-text">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-white">{toggleLabel}</p>
          <button
            type="button"
            role="switch"
            aria-checked={formState.enabled}
            aria-label={toggleLabel}
            onClick={handleToggle}
            disabled={isSaving}
            className={combine(
              'relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
              formState.enabled
                ? 'border-emerald-300/60 bg-emerald-400/30'
                : 'border-white/15 bg-white/5',
              (isSaving || isInitialLoading) && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={combine(
                'inline-block h-5 w-5 rounded-full bg-white shadow transition',
                formState.enabled ? 'translate-x-7 bg-emerald-100' : 'translate-x-2',
              )}
            />
          </button>
        </div>
      </div>

      {submitStatus === 'error' && submitError ? (
        <ToastBanner tone="error" message={submitError || SAVE_ERROR_MESSAGE} />
      ) : null}
      {submitStatus === 'success' ? <ToastBanner tone="success" message={SAVE_SUCCESS_MESSAGE} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm" htmlFor={timeFieldId}>
          <span className="block text-xs uppercase tracking-[0.3em] text-text-subtle">Hora local</span>
          <select
            id={timeFieldId}
            value={formState.localTime}
            onChange={(event) => setFormState((previous) => ({ ...previous, localTime: event.target.value }))}
            disabled={isSaving}
            className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
          >
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm" htmlFor={timezoneFieldId}>
          <span className="block text-xs uppercase tracking-[0.3em] text-text-subtle">Zona horaria</span>
          <TimezoneCombobox
            id={timezoneFieldId}
            value={formState.timezone}
            options={timezoneCatalog}
            disabled={isSaving}
            onChange={(timezone) => setFormState((previous) => ({ ...previous, timezone }))}
          />
        </label>
      </div>

      {status === 'error' && data ? (
        <ToastBanner tone="error" message={LOAD_STALE_MESSAGE} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 text-sm text-text-subtle">
        <p>Los cambios se aplican solo cuando presionás guardar.</p>
        <button
          type="submit"
          disabled={!canSubmit}
          className={combine(
            'inline-flex items-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
            canSubmit
              ? 'border-white/30 bg-white/10 text-white hover:border-white/50 hover:bg-white/20'
              : 'cursor-not-allowed border-white/10 bg-white/5 text-text-subtle',
          )}
        >
          {isSaving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
