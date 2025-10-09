let apiLoggingEnabled = true;

function toPrintable(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return JSON.parse(
    JSON.stringify(payload, (_key, value) =>
      typeof value === 'string' && value.length > 500 ? `${value.slice(0, 500)}…` : value,
    ),
  );
}

function logWith<T>(
  logger: (message?: any, ...optionalParams: any[]) => void,
  label: string,
  payload?: T,
) {
  if (payload === undefined) {
    logger(label);
    return;
  }

  try {
    logger(label, toPrintable(payload));
  } catch {
    logger(label, payload);
  }
}

export function setApiLoggingEnabled(enabled: boolean) {
  apiLoggingEnabled = enabled;
  const status = enabled ? 'enabled' : 'disabled';
  console.info(`[API] Logging ${status}.`);
}

export function isApiLoggingEnabled() {
  return apiLoggingEnabled;
}

export function logApiDebug(message: string, data?: unknown) {
  if (!apiLoggingEnabled) return;
  logWith(console.debug, `[API] ${message}`, data);
}

export function logApiError(message: string, data?: unknown) {
  if (!apiLoggingEnabled) return;
  logWith(console.error, `[API] ${message}`, data);
}

export function apiLog(label: string, payload: unknown) {
  if (!apiLoggingEnabled) return;
  logWith(console.error, label, payload);
}
