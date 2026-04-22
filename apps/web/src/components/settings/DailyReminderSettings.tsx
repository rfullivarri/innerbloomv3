import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRequest } from "../../hooks/useRequest";
import {
  DailyReminderSettingsResponse,
  UpdateDailyReminderSettingsPayload,
  getDailyReminderSettings,
  updateDailyReminderSettings,
} from "../../lib/api";
import {
  TimezoneOption,
  getTimezoneCatalog,
  resolveDefaultTimezone,
} from "../../lib/timezones";
import { isNativeCapacitorPlatform } from "../../mobile/capacitor";
import {
  ensureNativeDailyReminderNotificationPermissions,
  sendNativeDailyReminderTestNotification,
  syncNativeDailyReminderNotification,
} from "../../mobile/localNotifications";
import { SHOW_NATIVE_TEST_NOTIFICATION } from "../../config/releaseFlags";
import { Skeleton } from "../common/Skeleton";
import { ToastBanner } from "../common/ToastBanner";
import { TimezoneCombobox } from "../common/TimezoneCombobox";

const DEFAULT_TIME = "09:00";
const LOAD_ERROR_MESSAGE = "No pudimos cargar tus recordatorios.";
const LOAD_STALE_MESSAGE =
  "No pudimos refrescar tus recordatorios. Mostramos tu último estado guardado.";
const SAVE_ERROR_MESSAGE =
  "No pudimos guardar tus recordatorios. Intentá nuevamente.";
const SAVE_SUCCESS_MESSAGE = "Guardamos tus recordatorios.";
const TIME_OPTIONS = buildTimeOptions();
const INNERBLOOM_GRADIENT_CLASS =
  "bg-[linear-gradient(90deg,#a770ef_0%,#cf8bf3_52%,#fdb99b_100%)]";

type DeliveryMode = "email" | "notification" | "email_and_notification";

type ReminderFormState = {
  enabled: boolean;
  localTime: string;
  timezone: string;
  deliveryMode: DeliveryMode;
};

type ReminderLoadResult = {
  email: DailyReminderSettingsResponse | null;
  notification: DailyReminderSettingsResponse | null;
};

type SubmitStatus = "idle" | "saving" | "success" | "error";
type TestNotificationStatus = "idle" | "sending" | "success" | "error";

interface DailyReminderSettingsProps {
  onSaveSuccess?: (response: DailyReminderSettingsResponse) => void;
}

function DeliveryModeIcon({ channel }: { channel: "email" | "notification" }) {
  if (channel === "email") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" />
        <path d="m4.25 7 7.1 5.4a1.05 1.05 0 0 0 1.3 0L19.75 7" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7.5-2.5 7.5h17S18 16.5 18 9.5Z" />
      <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
    </svg>
  );
}

function buildTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, "0")}:${minute === 0 ? "00" : "30"}`;
      options.push(value);
    }
  }
  return options;
}

function normalizeLocalTime(value?: string | null): string {
  if (!value) {
    return DEFAULT_TIME;
  }
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Math.min(23, Math.max(0, Number(hoursRaw ?? 0)));
  const minutes = Number(minutesRaw ?? 0) >= 30 ? "30" : "00";
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function normalizeReminderResponse(
  response: DailyReminderSettingsResponse | null,
  fallbackTimezone: string,
): Omit<ReminderFormState, "deliveryMode"> {
  const timezone =
    response?.timezone ??
    response?.timeZone ??
    response?.time_zone ??
    fallbackTimezone;
  const localTime = normalizeLocalTime(
    response?.local_time ?? response?.localTime,
  );
  const status =
    typeof response?.status === "string" ? response.status.toLowerCase() : null;
  const enabledFromStatus = status === "active" || status === "enabled";
  const enabled =
    typeof response?.enabled === "boolean"
      ? response.enabled
      : enabledFromStatus;

  return {
    enabled,
    localTime,
    timezone:
      typeof timezone === "string" && timezone.trim()
        ? timezone
        : fallbackTimezone,
  };
}

function isReminderResponseEnabled(response: DailyReminderSettingsResponse | null): boolean {
  if (!response) {
    return false;
  }

  if (typeof response.enabled === "boolean") {
    return response.enabled;
  }

  return response.status === "active";
}

function isReminderResponsePersisted(response: DailyReminderSettingsResponse | null): boolean {
  return Boolean(response?.user_daily_reminder_id ?? response?.reminder_id);
}

function deriveDeliveryMode(loadResult: ReminderLoadResult): DeliveryMode {
  const emailEnabled = isReminderResponseEnabled(loadResult.email);
  const notificationEnabled = isReminderResponseEnabled(loadResult.notification);
  const hasPersistedEmail = isReminderResponsePersisted(loadResult.email);
  const hasPersistedNotification = isReminderResponsePersisted(loadResult.notification);

  if (!hasPersistedEmail && !hasPersistedNotification) {
    return "email_and_notification";
  }

  if (emailEnabled && notificationEnabled) {
    return "email_and_notification";
  }

  if (notificationEnabled) {
    return "notification";
  }

  return "email";
}

function normalizeReminderLoadResult(
  loadResult: ReminderLoadResult,
  fallbackTimezone: string,
): ReminderFormState {
  const emailState = normalizeReminderResponse(loadResult.email, fallbackTimezone);
  const notificationState = normalizeReminderResponse(loadResult.notification, fallbackTimezone);
  const deliveryMode = deriveDeliveryMode(loadResult);
  const enabled = emailState.enabled || notificationState.enabled;
  const preferredState =
    deliveryMode === "notification"
      ? notificationState
      : emailState.enabled || loadResult.email
        ? emailState
        : notificationState;

  return {
    enabled,
    localTime: preferredState.localTime,
    timezone: preferredState.timezone,
    deliveryMode,
  };
}

function combine(...classes: Array<string | null | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function getDeliverySelections(deliveryMode: DeliveryMode): {
  email: boolean;
  notification: boolean;
} {
  return {
    email: deliveryMode === "email" || deliveryMode === "email_and_notification",
    notification:
      deliveryMode === "notification" || deliveryMode === "email_and_notification",
  };
}

function resolveDeliveryModeFromSelections(input: {
  email: boolean;
  notification: boolean;
}): DeliveryMode {
  if (input.email && input.notification) {
    return "email_and_notification";
  }

  if (input.notification) {
    return "notification";
  }

  return "email";
}

export function DailyReminderSettings({
  onSaveSuccess,
}: DailyReminderSettingsProps) {
  const isNativeApp = isNativeCapacitorPlatform();
  const defaultTimezone = useMemo(() => resolveDefaultTimezone(), []);
  const timeFieldId = useId();
  const timezoneFieldId = useId();
  const timePickerRef = useRef<HTMLDivElement | null>(null);
  const [formState, setFormState] = useState<ReminderFormState>({
    enabled: false,
    localTime: DEFAULT_TIME,
    timezone: defaultTimezone,
    deliveryMode: isNativeApp ? "email_and_notification" : "email",
  });
  const [initialState, setInitialState] = useState<ReminderFormState | null>(
    null,
  );
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [testNotificationStatus, setTestNotificationStatus] =
    useState<TestNotificationStatus>("idle");
  const [testNotificationError, setTestNotificationError] = useState<string | null>(null);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const { data, status, error, reload } = useRequest(
    async (): Promise<ReminderLoadResult> => {
      if (isNativeApp) {
        const [email, notification] = await Promise.all([
          getDailyReminderSettings("email"),
          getDailyReminderSettings("notification"),
        ]);
        return { email, notification };
      }

      const email = await getDailyReminderSettings("email");
      return { email, notification: null };
    },
    [isNativeApp],
  );
  const [timezoneCatalog] = useState<TimezoneOption[]>(() =>
    getTimezoneCatalog(),
  );

  useEffect(() => {
    if (status !== "success" || !data) {
      return;
    }
    const normalized = normalizeReminderLoadResult(data, defaultTimezone);
    setFormState(normalized);
    setInitialState(normalized);
  }, [status, data, defaultTimezone]);

  useEffect(() => {
    if (submitStatus !== "success") {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSubmitStatus("idle");
    }, 3200);
    return () => window.clearTimeout(timeoutId);
  }, [submitStatus]);

  useEffect(() => {
    if (testNotificationStatus !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTestNotificationStatus("idle");
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [testNotificationStatus]);

  useEffect(() => {
    if (!isTimePickerOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && timePickerRef.current?.contains(target)) {
        return;
      }
      setIsTimePickerOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTimePickerOpen(false);
      }
    };
    const frame = window.requestAnimationFrame(() => {
      timePickerRef.current
        ?.querySelector(`[data-time-option="${formState.localTime}"]`)
        ?.scrollIntoView({ block: "center" });
    });

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [formState.localTime, isTimePickerOpen]);

  const isInitialLoading =
    (status === "idle" || status === "loading") && !data && !error;
  const hasBlockingError = status === "error" && !data;
  const isSaving = submitStatus === "saving";
  const isSendingTestNotification = testNotificationStatus === "sending";
  const shouldShowNativeTestNotification = false && (isNativeApp || SHOW_NATIVE_TEST_NOTIFICATION);
  const canSubmit =
    !isInitialLoading &&
    !isSaving &&
    initialState !== null &&
    (initialState.enabled !== formState.enabled ||
      initialState.localTime !== formState.localTime ||
      initialState.timezone !== formState.timezone ||
      initialState.deliveryMode !== formState.deliveryMode);
  const toggleLabel = formState.enabled
    ? "Daily Quest activa"
    : "Daily Quest pausada";

  const handleToggle = () => {
    if (isInitialLoading || isSaving) {
      return;
    }
    setFormState((previous) => ({ ...previous, enabled: !previous.enabled }));
  };

  const handleDeliveryToggle = (channel: "email" | "notification") => {
    if (isSaving) {
      return;
    }

    setFormState((previous) => {
      const current = getDeliverySelections(previous.deliveryMode);
      const next = {
        ...current,
        [channel]: !current[channel],
      };

      if (!next.email && !next.notification) {
        next[channel] = true;
      }

      return {
        ...previous,
        deliveryMode: resolveDeliveryModeFromSelections(next),
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setSubmitStatus("saving");
    setSubmitError(null);
    try {
      const status: UpdateDailyReminderSettingsPayload["status"] =
        formState.enabled ? "active" : "paused";
      const payload: UpdateDailyReminderSettingsPayload = {
        status,
        local_time: formState.localTime || DEFAULT_TIME,
        timezone: formState.timezone || defaultTimezone,
      };
      const wantsEmail =
        formState.deliveryMode === "email" ||
        formState.deliveryMode === "email_and_notification";
      const wantsNotification =
        formState.deliveryMode === "notification" ||
        formState.deliveryMode === "email_and_notification";

      if (isNativeApp && formState.enabled && wantsNotification) {
        const permission = await ensureNativeDailyReminderNotificationPermissions({
          requestExactAlarm: true,
        });
        if (!permission.granted) {
          throw new Error("Necesitamos permiso para enviarte notificaciones en este dispositivo.");
        }
      }

      let response: DailyReminderSettingsResponse;
      let normalized: ReminderFormState;

      if (isNativeApp) {
        const [emailResponse, notificationResponse] = await Promise.all([
          updateDailyReminderSettings(
            {
              ...payload,
              status: formState.enabled && wantsEmail ? "active" : "paused",
            },
            "email",
          ),
          updateDailyReminderSettings(
            {
              ...payload,
              status: formState.enabled && wantsNotification ? "active" : "paused",
            },
            "notification",
          ),
        ]);

        await syncNativeDailyReminderNotification(
          {
            ...notificationResponse,
            status: formState.enabled && wantsNotification ? "active" : "paused",
            enabled: formState.enabled && wantsNotification,
            local_time: payload.local_time,
            timezone: payload.timezone,
          },
          { requestPermissions: false },
        );

        normalized = normalizeReminderLoadResult(
          {
            email: emailResponse,
            notification: notificationResponse,
          },
          defaultTimezone,
        );

        const wasFirstScheduleCompletion =
          emailResponse.was_first_schedule_completion === true ||
          emailResponse.wasFirstScheduleCompletion === true ||
          notificationResponse.was_first_schedule_completion === true ||
          notificationResponse.wasFirstScheduleCompletion === true;

        response = {
          ...emailResponse,
          channel: wantsNotification && !wantsEmail ? "notification" : "email",
          was_first_schedule_completion: wasFirstScheduleCompletion,
          wasFirstScheduleCompletion: wasFirstScheduleCompletion,
        };
      } else {
        response = await updateDailyReminderSettings(payload);
        normalized = {
          ...normalizeReminderResponse(response, defaultTimezone),
          deliveryMode: "email",
        };
      }

      setFormState(normalized);
      setInitialState(normalized);
      setSubmitStatus("success");
      onSaveSuccess?.(response);
    } catch (submitException) {
      console.error("Failed to update reminder settings", submitException);
      setSubmitStatus("error");
      const friendlyMessage =
        submitException instanceof Error && submitException.message
          ? submitException.message
          : SAVE_ERROR_MESSAGE;
      setSubmitError(friendlyMessage);
    }
  };

  const handleSendTestNotification = async () => {
    if (!isNativeApp || isInitialLoading || isSaving || isSendingTestNotification) {
      return;
    }

    setTestNotificationStatus("sending");
    setTestNotificationError(null);

    try {
      await sendNativeDailyReminderTestNotification();
      setTestNotificationStatus("success");
    } catch (testException) {
      console.error("Failed to send test notification", testException);
      setTestNotificationStatus("error");
      setTestNotificationError(
        testException instanceof Error && testException.message
          ? testException.message
          : "No pudimos enviar la notificación de prueba.",
      );
    }
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-full" />
        {isNativeApp ? <Skeleton className="h-16 w-full" /> : null}
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
            className="reminder-scheduler-form__retry-button inline-flex items-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="reminder-scheduler-form space-y-6 text-base text-text"
      data-light-scope="reminder-scheduler"
    >
      <div className="reminder-scheduler-form__toggle-card rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="reminder-scheduler-form__toggle-label text-sm font-semibold text-white">
            {toggleLabel}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={formState.enabled}
            aria-label={toggleLabel}
            onClick={handleToggle}
            disabled={isSaving}
            className={combine(
              "reminder-scheduler-form__switch-track relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              formState.enabled
                ? "reminder-scheduler-form__switch-track--enabled border-violet-200/45 bg-violet-300/70"
                : "reminder-scheduler-form__switch-track--disabled border-white/15 bg-white/5",
              (isSaving || isInitialLoading) && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              className={combine(
                "reminder-scheduler-form__switch-thumb inline-block h-5 w-5 rounded-full bg-white shadow transition",
                formState.enabled
                  ? "reminder-scheduler-form__switch-thumb--enabled translate-x-7 bg-white"
                  : "reminder-scheduler-form__switch-thumb--disabled translate-x-2",
              )}
            />
          </button>
        </div>
      </div>

      {isNativeApp ? (
        <div className="space-y-3">
          <span className="reminder-scheduler-form__field-label block text-xs uppercase tracking-[0.3em] text-text-subtle">
            Canal
          </span>
          <div className="reminder-scheduler-form__channel-grid grid grid-cols-2 gap-2">
            {[
              { id: "email" as const, label: "Email" },
              { id: "notification" as const, label: "Notificación" },
            ].map((option) => {
              const selections = getDeliverySelections(formState.deliveryMode);
              const active = selections[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  disabled={isSaving}
                  onClick={() => handleDeliveryToggle(option.id)}
                  className={combine(
                    "reminder-scheduler-form__channel-button inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                    active
                      ? `reminder-scheduler-form__channel-button--active border-[#fdb99b]/80 ${INNERBLOOM_GRADIENT_CLASS} text-white shadow-[0_12px_32px_rgba(167,112,239,0.28)] hover:brightness-105`
                      : "reminder-scheduler-form__channel-button--inactive border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:bg-white/10 hover:text-white",
                    isSaving && "cursor-not-allowed opacity-60",
                  )}
                >
                  <DeliveryModeIcon channel={option.id} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {submitStatus === "error" && submitError ? (
        <ToastBanner tone="error" message={submitError || SAVE_ERROR_MESSAGE} />
      ) : null}
      {submitStatus === "success" ? (
        <ToastBanner tone="success" message={SAVE_SUCCESS_MESSAGE} />
      ) : null}
      {shouldShowNativeTestNotification && testNotificationStatus === "error" && testNotificationError ? (
        <ToastBanner tone="error" message={testNotificationError} />
      ) : null}
      {shouldShowNativeTestNotification && testNotificationStatus === "success" ? (
        <ToastBanner
          tone="success"
          message="Enviamos una notificación de prueba. Debería aparecer en 10 segundos."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm" htmlFor={timeFieldId}>
          <span className="reminder-scheduler-form__field-label block text-xs uppercase tracking-[0.3em] text-text-subtle">
            Hora local
          </span>
          {isNativeApp ? (
            <div ref={timePickerRef} className="relative">
              <button
                id={timeFieldId}
                type="button"
                disabled={isSaving}
                aria-haspopup="listbox"
                aria-expanded={isTimePickerOpen}
                onClick={() => setIsTimePickerOpen((previous) => !previous)}
                className={combine(
                  "reminder-scheduler-form__control reminder-scheduler-form__time-trigger flex w-full items-center justify-between rounded-2xl border border-white/10 bg-surface px-4 py-3 text-left text-base text-white outline-none transition focus:border-white/40 focus-visible:ring-2 focus-visible:ring-white/50",
                  isSaving && "cursor-not-allowed opacity-60",
                )}
              >
                <span>{formState.localTime}</span>
                <span aria-hidden="true" className="text-white/45">⌄</span>
              </button>
              {isTimePickerOpen ? (
                <div
                  role="listbox"
                  aria-labelledby={timeFieldId}
                  className="reminder-scheduler-form__time-list absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[90] max-h-72 overflow-y-auto rounded-2xl border border-white/12 bg-[#101a2f] p-1 shadow-[0_22px_60px_rgba(2,6,23,0.55)]"
                >
                  {TIME_OPTIONS.map((time) => {
                    const selected = formState.localTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-time-option={time}
                        onClick={() => {
                          setFormState((previous) => ({
                            ...previous,
                            localTime: time,
                          }));
                          setIsTimePickerOpen(false);
                        }}
                        className={combine(
                          "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-base font-semibold transition",
                          selected
                            ? "bg-emerald-400/18 text-emerald-100"
                            : "text-white hover:bg-white/8",
                        )}
                      >
                        <span>{time}</span>
                        {selected ? <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-emerald-300" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <select
              id={timeFieldId}
              value={formState.localTime}
              onChange={(event) =>
                setFormState((previous) => ({
                  ...previous,
                  localTime: event.target.value,
                }))
              }
              disabled={isSaving}
              className="reminder-scheduler-form__control reminder-scheduler-form__time-select w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-base text-white outline-none transition focus:border-white/40"
            >
              {TIME_OPTIONS.map((time) => (
                <option
                  key={time}
                  value={time}
                  className="reminder-scheduler-form__time-option"
                >
                  {time}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="space-y-2 text-sm" htmlFor={timezoneFieldId}>
          <span className="reminder-scheduler-form__field-label block text-xs uppercase tracking-[0.3em] text-text-subtle">
            Zona horaria
          </span>
          <TimezoneCombobox
            id={timezoneFieldId}
            value={formState.timezone}
            options={timezoneCatalog}
            disabled={isSaving}
            onChange={(timezone) =>
              setFormState((previous) => ({ ...previous, timezone }))
            }
          />
        </label>
      </div>

      {status === "error" && data ? (
        <ToastBanner tone="error" message={LOAD_STALE_MESSAGE} />
      ) : null}

      {shouldShowNativeTestNotification ? (
        <button
          type="button"
          disabled={isSendingTestNotification || isSaving}
          onClick={handleSendTestNotification}
          className={combine(
            "reminder-scheduler-form__test-button inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            isSendingTestNotification || isSaving
              ? "cursor-not-allowed border-white/10 bg-white/5 text-text-subtle"
              : "border-cyan-200/60 bg-cyan-400/10 text-cyan-100 shadow-[0_12px_30px_rgba(34,211,238,0.16)] hover:border-cyan-200/90 hover:bg-cyan-400/20",
          )}
        >
          {isSendingTestNotification ? "Probando…" : "Probar notificación"}
        </button>
      ) : null}

      <div className="reminder-scheduler-form__footer flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 text-sm text-text-subtle">
        <p className="reminder-scheduler-form__footer-note">
          {isNativeApp
            ? "En la app nativa podés combinar email y notificación local. Los cambios se aplican al guardar."
            : "Los cambios se aplican solo cuando presionás guardar."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={combine(
              "reminder-scheduler-form__save-button inline-flex items-center rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              canSubmit
                ? `reminder-scheduler-form__save-button--enabled border-[#fdb99b]/80 ${INNERBLOOM_GRADIENT_CLASS} text-white shadow-[0_12px_36px_rgba(167,112,239,0.34)] hover:brightness-105 active:scale-[0.98]`
                : "reminder-scheduler-form__save-button--disabled cursor-not-allowed border-white/10 bg-white/5 text-text-subtle",
            )}
          >
            {isSaving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </form>
  );
}
