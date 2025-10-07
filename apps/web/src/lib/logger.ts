let apiLoggingEnabled = true;

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
  if (data !== undefined) {
    console.debug(`[API] ${message}`, data);
  } else {
    console.debug(`[API] ${message}`);
  }
}

export function logApiError(message: string, data?: unknown) {
  if (!apiLoggingEnabled) return;
  if (data !== undefined) {
    console.error(`[API] ${message}`, data);
  } else {
    console.error(`[API] ${message}`);
  }
}
