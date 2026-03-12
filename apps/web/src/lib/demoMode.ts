const DEMO_MODE_KEY = '__innerbloom_demo_mode__';

type DemoWindow = Window & { [DEMO_MODE_KEY]?: boolean };

function readGlobalDemoModeFlag(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean((window as DemoWindow)[DEMO_MODE_KEY]);
}

export function setDashboardDemoModeEnabled(enabled: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  (window as DemoWindow)[DEMO_MODE_KEY] = enabled;
}

export function isDashboardDemoModeEnabled(): boolean {
  if (readGlobalDemoModeFlag()) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname.startsWith('/demo');
}
