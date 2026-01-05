import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebViewNavigation } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
// eslint-disable-next-line import/no-unresolved
import { CircleDot, Flame, Route, Sparkles, Sprout } from 'lucide-react-native';

import { getDashboardRoutes, type DashboardRoutes } from '@/constants/routes';
import { WebViewProvider, useWebViewController } from '@/hooks/webview-controller';
import { getNativeTabBarHeight } from '@/components/native-tab-bar';

import { DEFAULT_BASE_URL, buildAppUrl } from '@/utils/url';

const APP_FLAG_SCRIPT = 'window.__INNERBLOOM_NATIVE_APP__ = true; true;';

type TabKey = 'missions' | 'dquest' | 'dashboard' | 'rewards' | 'editor';

type TabConfig = {
  key: TabKey;
  label: string;
  path: string;
  matchers: string[];
  Icon: (props: { size?: number; color?: string; strokeWidth?: number }) => JSX.Element;
};

type ErrorState = {
  message: string;
  url?: string;
} | null;

function createTabs(routes: DashboardRoutes): TabConfig[] {
  return [
    {
      key: 'missions',
      label: 'Misiones',
      path: routes.missions,
      matchers: [routes.missions.toLowerCase()],
      Icon: Route,
    },
    {
      key: 'dquest',
      label: 'DAILY',
      path: routes.dquest,
      matchers: [routes.dquest.toLowerCase()],
      Icon: Flame,
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: routes.dashboard,
      matchers: [routes.dashboard.toLowerCase()],
      Icon: CircleDot,
    },
    {
      key: 'rewards',
      label: 'Rewards',
      path: routes.rewards,
      matchers: [routes.rewards.toLowerCase()],
      Icon: Sparkles,
    },
    {
      key: 'editor',
      label: 'Editor',
      path: routes.editor,
      matchers: [routes.editor.toLowerCase()],
      Icon: Sprout,
    },
  ];
}

function getTabFromPath(pathname: string, tabs: TabConfig[]): TabKey {
  const normalizedPath = pathname?.toLowerCase?.() ?? '';

  const matchingTab = tabs.find((tab) =>
    tab.matchers.some((matcher) => normalizedPath.startsWith(matcher)),
  );

  return matchingTab?.key ?? 'dashboard';
}

function DashboardContent({ routes }: { routes: DashboardRoutes }) {
  const tabs = useMemo(() => createTabs(routes), [routes]);
  const { baseUrl, webviewRef, navigate, currentPath, setCurrentPath, initialUrl } =
    useWebViewController();
  const webViewSource = useMemo(() => ({ uri: initialUrl }), [initialUrl]);
  const activeTab = useMemo(() => getTabFromPath(currentPath, tabs), [currentPath, tabs]);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const allowedClerkDomains = useMemo(
    () => ['clerk.com', 'clerk.dev', 'clerkstage.dev', 'accounts.clerk.com', 'accounts.clerk.dev'],
    [],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      console.log('[WebView] navigation state url:', navState.url);
      setCanGoBack(navState.canGoBack);
      try {
        const parsed = new URL(navState.url);
        setCurrentPath(parsed.pathname.toLowerCase());
      } catch (error) {
        console.warn('Failed to parse navigation state URL', error);
        setCurrentPath(routes.dashboard);
      }
    },
    [routes.dashboard, setCurrentPath],
  );

  const navigateToTab = useCallback(
    (tab: TabConfig) => {
      setError(null);
      navigate(tab.path);
    },
    [navigate],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: any) => {
      const requestUrl = request?.url as string | undefined;
      const navigationType = request?.navigationType as string | undefined;

      if (navigationType === 'click' || navigationType === 'formsubmit') {
        console.log(`[WebView] Navigation (${navigationType}): ${requestUrl}`);
      }

      if (!requestUrl) return false;

      if (requestUrl.startsWith('about:blank')) return true;

      if (requestUrl.startsWith('mailto:') || requestUrl.startsWith('tel:')) {
        Linking.openURL(requestUrl).catch(() => undefined);
        return false;
      }

      if (navigationType && navigationType !== 'click' && navigationType !== 'formsubmit') {
        return true;
      }

      try {
        const requestUrlObject = new URL(requestUrl);
        const hostname = requestUrlObject.hostname;
        const protocol = requestUrlObject.protocol;

        const allowedBaseHostname = new URL(baseUrl).hostname;
        const defaultHostname = new URL(DEFAULT_BASE_URL).hostname;

        const isHttpNavigation = protocol === 'https:' || protocol === 'http:';
        const isClerkDomain = allowedClerkDomains.some(
          (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
        );
        const isAllowedHost =
          hostname === allowedBaseHostname ||
          hostname.endsWith(`.${allowedBaseHostname}`) ||
          hostname === defaultHostname ||
          hostname.endsWith(`.${defaultHostname}`);

        if (!isHttpNavigation || isClerkDomain || isAllowedHost) {
          return true;
        }

        Linking.openURL(requestUrl).catch(() => undefined);
        return false;
      } catch (error) {
        console.warn('Failed to handle navigation request', error);
        Linking.openURL(requestUrl).catch(() => undefined);
        return false;
      }
    },
    [allowedClerkDomains, baseUrl],
  );

  const handleReload = useCallback(() => {
    setError(null);
    setIsLoading(true);
    webviewRef.current?.reload();
  }, [webviewRef]);

  const handleBack = useCallback(() => {
    if (canGoBack) {
      webviewRef.current?.goBack();
    }
  }, [canGoBack, webviewRef]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleHttpError = useCallback(
    (event: any) => {
      const { statusCode, url } = event?.nativeEvent ?? {};

      if (statusCode === 404 && url?.includes(routes.dashboard) && baseUrl) {
        setError({ message: 'Redirecting to home after missing dashboard.', url });
        webviewRef.current?.injectJavaScript(
          `window.location.replace(${JSON.stringify(buildAppUrl(baseUrl, routes.dashboard))}); true;`,
        );
        setIsLoading(true);
        return;
      }

      setError({
        message: `Failed to load content (HTTP ${statusCode ?? 'error'})`,
        url,
      });
      setIsLoading(false);
    },
    [baseUrl, routes.dashboard, webviewRef],
  );

  const handleError = useCallback((event: any) => {
    const failingUrl = event?.nativeEvent?.url as string | undefined;
    setError({ message: 'An error occurred while loading the page.', url: failingUrl });
    setIsLoading(false);
  }, []);

  const navPadding = getNativeTabBarHeight(bottomInset);

  useFocusEffect(
    useCallback(() => {
      const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
      navigateToTab(active);
    }, [activeTab, navigateToTab, tabs]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canGoBack}
          onPress={handleBack}
          style={[styles.headerButton, !canGoBack && styles.headerButtonDisabled]}
        >
          <Text style={[styles.headerButtonText, !canGoBack && styles.headerButtonTextDisabled]}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Innerbloom</Text>
        <TouchableOpacity accessibilityRole="button" onPress={handleReload} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Recargar</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.webViewContainer, { paddingBottom: navPadding }]}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
            {error.url ? <Text style={styles.errorSubtext}>{error.url}</Text> : null}
            <TouchableOpacity accessibilityRole="button" onPress={handleReload} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={webViewSource}
            startInLoadingState
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            incognito={false}
            originWhitelist={["*"]}
            allowsBackForwardNavigationGestures
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            injectedJavaScript={APP_FLAG_SCRIPT}
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#C6D6FF" />
              </View>
            )}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onHttpError={handleHttpError}
            onError={handleError}
            style={styles.webView}
          />
        )}
        {isLoading && !error ? (
          <View style={styles.loaderOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#C6D6FF" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export function DashboardWebViewScreen({ initialRoute = 'dashboard' }: { initialRoute?: TabKey }) {
  const routes = useMemo(() => getDashboardRoutes(), []);
  const resolvedInitialPath = routes[initialRoute] ?? routes.dashboard;

  return (
    <WebViewProvider initialPath={resolvedInitialPath}>
      <DashboardContent routes={routes} />
    </WebViewProvider>
  );
}

export default function HomeScreen() {
  return <DashboardWebViewScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d17',
  },
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15, 19, 30, 0.85)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f5f6fb',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerButtonText: {
    color: '#d7e3ff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  headerButtonTextDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#0d111b',
    zIndex: 0,
  },
  webView: {
    flex: 1,
    zIndex: 0,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#f5f6fb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d111b',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 10, 16, 0.5)',
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#c6d6ff',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#0d111b',
    fontSize: 14,
    fontWeight: '700',
  },
});
