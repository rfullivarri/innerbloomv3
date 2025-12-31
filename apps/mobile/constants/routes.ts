export const DEFAULT_DASHBOARD_PATH = '/dashboard-v3';

function normalizePath(path?: string | null) {
  const trimmed = path?.trim();
  if (!trimmed) return DEFAULT_DASHBOARD_PATH;

  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, '') || DEFAULT_DASHBOARD_PATH;

  return withoutTrailing;
}

export function getDashboardRoutes(rawBasePath?: string | null) {
  const basePath = normalizePath(rawBasePath ?? process.env.EXPO_PUBLIC_DASHBOARD_PATH ?? null);

  return {
    dashboard: basePath,
    missions: `${basePath}/misiones`,
    dquest: `${basePath}/dquest`,
    rewards: `${basePath}/rewards`,
    editor: '/editor',
  } as const;
}

export type DashboardRoutes = ReturnType<typeof getDashboardRoutes>;
