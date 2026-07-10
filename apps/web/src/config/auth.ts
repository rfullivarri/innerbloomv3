export const DEFAULT_DASHBOARD_PATH = '/dashboard-v3';

export const DASHBOARD_PATH = import.meta.env.VITE_DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;

export const INNERBLOOM2_BASE_PATH = '/innerbloom2';
export const INNERBLOOM2_DASHBOARD_PATH = `${INNERBLOOM2_BASE_PATH}/dashboard`;
export const INNERBLOOM2_INTRO_JOURNEY_PATH = '/intro-journey2';
export const INNERBLOOM2_ONBOARDING_PATH = '/onboarding2';
export const INNERBLOOM2_DAILY_QUEST_PATH = `${INNERBLOOM2_BASE_PATH}/dquest`;

export const CLERK_TOKEN_TEMPLATE = (() => {
  const raw = import.meta.env.VITE_CLERK_TOKEN_TEMPLATE;
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
})();
