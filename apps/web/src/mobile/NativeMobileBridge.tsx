import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useNavigate } from 'react-router-dom';
import {
  isNativeAuthCallbackUrl,
  isNativeCapacitorPlatform,
  normalizeAppUrlToPath,
  shouldOpenExternalUrl,
} from './capacitor';

function useNativeDocumentClass(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const className = 'capacitor-native';
    document.documentElement.classList.add(className);
    document.body.classList.add(className);

    return () => {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    };
  }, [enabled]);
}

function useExternalLinkBridge(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const originalOpen = window.open.bind(window);

    window.open = ((url?: string | URL, target?: string, features?: string) => {
      const href = typeof url === 'string' ? url : url?.toString() ?? '';
      if (href && shouldOpenExternalUrl(href)) {
        void Browser.open({ url: new URL(href, window.location.href).toString() });
        return null;
      }

      return originalOpen(url as string | URL | undefined, target, features);
    }) as typeof window.open;

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }

      if (target.hasAttribute('download')) {
        return;
      }

      const href = target.href;
      const opensOutside = target.target === '_blank' || shouldOpenExternalUrl(href);
      if (!opensOutside) {
        return;
      }

      event.preventDefault();
      void Browser.open({ url: href });
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      window.open = originalOpen;
      document.removeEventListener('click', handleClick, true);
    };
  }, [enabled]);
}

function useNativeChrome(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    void StatusBar.setStyle({ style: Style.Dark });
    void Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    void Keyboard.setStyle({ style: KeyboardStyle.Dark });
    void Keyboard.setAccessoryBarVisible({ isVisible: false });

    if (Capacitor.getPlatform() === 'ios') {
      void Keyboard.setScroll({ isDisabled: false });
    }
  }, [enabled]);
}

function useDeepLinkNavigation(enabled: boolean) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleUrl = (url: string) => {
      if (isNativeAuthCallbackUrl(url)) {
        return;
      }

      const nextPath = normalizeAppUrlToPath(url);
      if (nextPath) {
        navigate(nextPath, { replace: true });
      }
    };

    void App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleUrl(launchUrl.url);
      }
    });

    let listenerHandle: Awaited<ReturnType<typeof App.addListener>> | null = null;

    void App.addListener('appUrlOpen', ({ url }) => {
      handleUrl(url);
    }).then((handle) => {
      listenerHandle = handle;
    });

    return () => {
      void listenerHandle?.remove();
    };
  }, [enabled, navigate]);
}

export function NativeMobileBridge() {
  const enabled = isNativeCapacitorPlatform();

  useNativeDocumentClass(enabled);
  useExternalLinkBridge(enabled);
  useNativeChrome(enabled);
  useDeepLinkNavigation(enabled);

  return null;
}
