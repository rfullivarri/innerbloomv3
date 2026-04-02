type CapacitorPluginListenerHandle = {
  remove: () => Promise<void> | void;
};

type CapacitorAppPlugin = {
  getLaunchUrl: () => Promise<{ url?: string } | undefined>;
  addListener: (
    eventName: 'appUrlOpen',
    listener: ({ url }: { url: string }) => void,
  ) => CapacitorPluginListenerHandle | Promise<CapacitorPluginListenerHandle>;
};

type CapacitorBrowserPlugin = {
  open: (options: { url: string }) => Promise<void>;
  close?: () => Promise<void>;
};

type CapacitorKeyboardPlugin = {
  setResizeMode: (options: { mode: 'native' | 'body' | 'ionic' | 'none' }) => Promise<void>;
  setStyle: (options: { style: 'DARK' | 'LIGHT' | 'DEFAULT' }) => Promise<void>;
  setAccessoryBarVisible: (options: { isVisible: boolean }) => Promise<void>;
  setScroll: (options: { isDisabled: boolean }) => Promise<void>;
};

type CapacitorStatusBarPlugin = {
  setStyle: (options: { style: 'DARK' | 'LIGHT' | 'DEFAULT' }) => Promise<void>;
};

type CapacitorLocalNotificationPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

type CapacitorLocalNotificationsPlugin = {
  checkPermissions: () => Promise<{ display: CapacitorLocalNotificationPermissionState }>;
  requestPermissions: () => Promise<{ display: CapacitorLocalNotificationPermissionState }>;
  schedule: (options: {
    notifications: Array<{
      id: number;
      title: string;
      body?: string;
      schedule?: {
        on?: {
          hour?: number;
          minute?: number;
          second?: number;
        };
        allowWhileIdle?: boolean;
      };
      extra?: Record<string, unknown>;
    }>;
  }) => Promise<unknown>;
  cancel: (options: { notifications: Array<{ id: number }> }) => Promise<unknown>;
  addListener: (
    eventName: 'localNotificationActionPerformed',
    listener: (event: { notification?: { extra?: Record<string, unknown> } }) => void,
  ) => CapacitorPluginListenerHandle | Promise<CapacitorPluginListenerHandle>;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
};

export const CAPACITOR_APP_SCHEME = 'innerbloom';
export const CAPACITOR_CALLBACK_HOST = 'callback';
export const CAPACITOR_SIGNED_OUT_HOST = 'signed-out';
export const CAPACITOR_STATUS_BAR_STYLE_DARK = 'DARK' as const;
export const CAPACITOR_KEYBOARD_STYLE_DARK = 'DARK' as const;
export const CAPACITOR_KEYBOARD_RESIZE_NATIVE = 'native' as const;

function getCapacitorGlobal(): CapacitorGlobal | null {
  const candidate = typeof window !== 'undefined'
    ? (window as typeof window & { Capacitor?: CapacitorGlobal }).Capacitor
    : (globalThis as typeof globalThis & { Capacitor?: CapacitorGlobal }).Capacitor;

  return candidate ?? null;
}

function getCapacitorPlugin<T>(name: string): T | null {
  const plugins = getCapacitorGlobal()?.Plugins;
  if (!plugins || !(name in plugins)) {
    return null;
  }

  return plugins[name] as T;
}

export function getCapacitorPlatform(): string {
  return getCapacitorGlobal()?.getPlatform?.() ?? 'web';
}

export function isNativeCapacitorPlatform(): boolean {
  return Boolean(getCapacitorGlobal()?.isNativePlatform?.());
}

export function getCapacitorAppPlugin(): CapacitorAppPlugin | null {
  return getCapacitorPlugin<CapacitorAppPlugin>('App');
}

export function getCapacitorBrowserPlugin(): CapacitorBrowserPlugin | null {
  return getCapacitorPlugin<CapacitorBrowserPlugin>('Browser');
}

export function getCapacitorKeyboardPlugin(): CapacitorKeyboardPlugin | null {
  return getCapacitorPlugin<CapacitorKeyboardPlugin>('Keyboard');
}

export function getCapacitorStatusBarPlugin(): CapacitorStatusBarPlugin | null {
  return getCapacitorPlugin<CapacitorStatusBarPlugin>('StatusBar');
}

export function getCapacitorLocalNotificationsPlugin(): CapacitorLocalNotificationsPlugin | null {
  return getCapacitorPlugin<CapacitorLocalNotificationsPlugin>('LocalNotifications');
}

export function normalizeAppUrlToPath(url: string): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol === `${CAPACITOR_APP_SCHEME}:`) {
      const hostPath = parsed.hostname ? `/${parsed.hostname}` : '';
      const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
      const combined = `${hostPath}${pathname}${parsed.search}${parsed.hash}` || '/';
      return combined.startsWith('/') ? combined : `/${combined}`;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return null;
  }
}

export function isNativeAuthCallbackUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== `${CAPACITOR_APP_SCHEME}:`) {
      return false;
    }

    return parsed.hostname === CAPACITOR_CALLBACK_HOST || parsed.hostname === CAPACITOR_SIGNED_OUT_HOST;
  } catch {
    return false;
  }
}

export function buildNativeAppUrl(host: string): string {
  return `${CAPACITOR_APP_SCHEME}://${host}`;
}

export async function openUrlInCapacitorBrowser(url: string): Promise<void> {
  const browser = getCapacitorBrowserPlugin();
  if (browser) {
    const startedAt = Date.now();
    console.info('[mobile-auth] Browser.open() start', { url, startedAt });
    await browser.open({ url });
    console.info('[mobile-auth] Browser.open() end', { url, finishedAt: Date.now() });
    return;
  }

  if (typeof window !== 'undefined') {
    console.info('[mobile-auth] window.location.assign()', { url, at: Date.now() });
    window.location.assign(url);
  }
}

export async function closeCapacitorBrowser(): Promise<void> {
  const browser = getCapacitorBrowserPlugin();
  if (!browser?.close) {
    return;
  }

  try {
    const startedAt = Date.now();
    console.info('[mobile-auth] Browser.close() start', { startedAt });
    await browser.close();
    console.info('[mobile-auth] Browser.close() end', { finishedAt: Date.now() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/No active window to close/i.test(message)) {
      return;
    }

    console.warn('[mobile-auth] failed to close capacitor browser', { error });
  }
}

export function scheduleCapacitorBrowserCloseRetries(delaysMs: number[] = [250, 900]): void {
  if (typeof window === 'undefined') {
    return;
  }

  delaysMs.forEach((delayMs) => {
    window.setTimeout(() => {
      console.info('[mobile-auth] Browser.close() retry scheduled', {
        delayMs,
        at: Date.now(),
      });
      void closeCapacitorBrowser();
    }, delayMs);
  });
}

export function shouldOpenExternalUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.href);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return false;
    }

    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}
