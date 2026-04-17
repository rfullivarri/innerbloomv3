export const DEFAULT_DASHBOARD_PATH = '/dashboard-v3';

export const DASHBOARD_PATH = import.meta.env.VITE_DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;

export const CLERK_TOKEN_TEMPLATE = (() => {
  const raw = import.meta.env.VITE_CLERK_TOKEN_TEMPLATE;
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
})();
