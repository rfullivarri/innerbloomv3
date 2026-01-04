import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { WebView } from 'react-native-webview';

import { getDashboardRoutes } from '../constants/routes';
import { buildAppUrl, normalizeBaseUrl } from '@/utils/url';

type WebViewControllerValue = {
  baseUrl: string;
  currentPath: string;
  webviewRef: RefObject<WebView>;
  initialUrl: string;
  navigate: (path: string) => void;
  setCurrentPath: (path: string) => void;
};

const WebViewContext = createContext<WebViewControllerValue | null>(null);

type Props = {
  children: ReactNode;
  initialPath?: string;
};

export function WebViewProvider({ children, initialPath }: Props) {
  const routes = useMemo(() => getDashboardRoutes(), []);
  const resolvedInitialPath = (initialPath ?? routes.dashboard).toLowerCase();
  const [currentPath, setCurrentPath] = useState(resolvedInitialPath);
  const baseUrl = useMemo(
    () => normalizeBaseUrl(process.env.EXPO_PUBLIC_WEB_BASE_URL ?? null),
    [],
  );
  const initialUrl = useMemo(
    () => buildAppUrl(baseUrl, resolvedInitialPath),
    [baseUrl, resolvedInitialPath],
  );
  const webviewRef = useRef<WebView>(null);

  const navigate = useCallback(
    (path: string) => {
      const normalizedPath = (path.startsWith('/') ? path : `/${path}`).toLowerCase();
      setCurrentPath(normalizedPath);

      const script = `(() => {
        try {
          const targetUrl = new URL(${JSON.stringify(normalizedPath)}, ${JSON.stringify(baseUrl)});
          targetUrl.searchParams.set('app', '1');
          const currentUrl = new URL(window.location.href);

          if (targetUrl.toString() === currentUrl.toString()) {
            return;
          }

          if (targetUrl.origin !== currentUrl.origin) {
            window.location.href = targetUrl.toString();
            return;
          }

          window.history.pushState({}, '', targetUrl.toString());
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        } catch (error) {
          console.error('Failed to navigate inside WebView', error);
        }
      })(); true;`;

      webviewRef.current?.injectJavaScript(script);
    },
    [baseUrl],
  );

  const value = useMemo(
    () => ({ baseUrl, currentPath, webviewRef, navigate, setCurrentPath, initialUrl }),
    [baseUrl, currentPath, initialUrl, navigate],
  );

  return <WebViewContext.Provider value={value}>{children}</WebViewContext.Provider>;
}

export function useWebViewController() {
  const context = useContext(WebViewContext);

  if (!context) {
    throw new Error('useWebViewController must be used within a WebViewProvider');
  }

  return context;
}
