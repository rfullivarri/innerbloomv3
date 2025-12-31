import { useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
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
// eslint-disable-next-line import/no-unresolved
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebViewNavigation } from 'react-native-webview';
import { WebView } from 'react-native-webview';
// eslint-disable-next-line import/no-unresolved
import Svg, { Circle, Path } from 'react-native-svg';

import { getDashboardRoutes, type DashboardRoutes } from '@/constants/routes';
import { WebViewProvider, useWebViewController } from '@/hooks/webview-controller';

import { DEFAULT_BASE_URL, buildAppUrl } from '../utils/url';

const APP_FLAG_SCRIPT = 'window.__INNERBLOOM_NATIVE_APP__ = true; true;';

type TabKey = 'missions' | 'dquest' | 'dashboard' | 'rewards' | 'editor';

type TabConfig = {
  key: TabKey;
  label: string;
  path: string;
  matchers: string[];
  Icon: typeof RouteIcon;
};

type ErrorState = {
  message: string;
  url?: string;
} | null;

type IconProps = ComponentProps<typeof Svg> & { size?: number };

function BaseIcon({
  children,
  size = 24,
  strokeWidth = 1.75,
  color,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </Svg>
  );
}

function RouteIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M4 18c4 0 4-12 8-12s4 12 8 12" />
      <Circle cx="4" cy="18" r="2" />
      <Circle cx="20" cy="18" r="2" />
      <Circle cx="12" cy="6" r="2" />
    </BaseIcon>
  );
}

function FlameIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-3-3-4-4-7Z" />
      <Path d="M8 14a4 4 0 1 0 8 0 6 6 0 0 0-2-4" />
    </BaseIcon>
  );
}

function CircleDotIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="2" />
    </BaseIcon>
  );
}

function SparklesIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M12 4 13.5 7.5 17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5Z" />
      <Path d="m6 16 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <Path d="m18 14 .75 1.5L20 16l-1.25.5L18 18l-.75-1.5L16 16l1.25-.5Z" />
    </BaseIcon>
  );
}

function SproutIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <Path d="M12 22v-6" />
      <Path d="M16 10c0 2-1.79 4-4 4s-4-2-4-4a4 4 0 0 1 4-4c2.21 0 4 2 4 4Z" />
      <Path d="M9 9C9 6 7 4 4 4c0 3 2 5 5 5Z" />
      <Path d="M15 9c0-3 2-5 5-5 0 3-2 5-5 5Z" />
    </BaseIcon>
  );
}

function createTabs(routes: DashboardRoutes): TabConfig[] {
  return [
    {
      key: 'missions',
      label: 'Misiones',
      path: routes.missions,
      matchers: [routes.missions.toLowerCase()],
      Icon: RouteIcon,
    },
    {
      key: 'dquest',
      label: 'DQuest',
      path: routes.dquest,
      matchers: [routes.dquest.toLowerCase()],
      Icon: FlameIcon,
    },
    {
      key: 'dashboard',
      label: 'Dashboard',
      path: routes.dashboard,
      matchers: [routes.dashboard.toLowerCase()],
      Icon: CircleDotIcon,
    },
    {
      key: 'rewards',
      label: 'Rewards',
      path: routes.rewards,
      matchers: [routes.rewards.toLowerCase()],
      Icon: SparklesIcon,
    },
    {
      key: 'editor',
      label: 'Editor',
      path: routes.editor,
      matchers: [routes.editor.toLowerCase()],
      Icon: SproutIcon,
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
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const insets = useSafeAreaInsets();

  const allowedClerkDomains = useMemo(
    () => ['clerk.com', 'clerk.dev', 'clerkstage.dev', 'accounts.clerk.com', 'accounts.clerk.dev'],
    [],
  );

  const allowedHosts = useMemo(() => {
    const hosts = new Set<string>();
    try {
      hosts.add(new URL(baseUrl).hostname.toLowerCase());
    } catch (error) {
      console.warn('Invalid base URL when collecting hosts', error);
    }

    try {
      hosts.add(new URL(DEFAULT_BASE_URL).hostname.toLowerCase());
    } catch (error) {
      console.warn('Invalid default URL when collecting hosts', error);
    }

    return Array.from(hosts);
  }, [baseUrl]);

  const shouldShowNavForUrl = useCallback(
    (url?: string | null) => {
      if (!url) return false;

      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.toLowerCase();
        const pathname = parsed.pathname.toLowerCase();

        const isAllowedHost = allowedHosts.some(
          (host) => hostname === host || hostname.endsWith(`.${host}`),
        );

        if (!isAllowedHost) return false;

        return tabs.some((tab) => tab.matchers.some((matcher) => pathname.startsWith(matcher)));
      } catch (error) {
        console.warn('Failed to evaluate navbar visibility for URL', error);
        return false;
      }
    },
    [allowedHosts, tabs],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
      setIsNavVisible(shouldShowNavForUrl(navState.url));

      try {
        const parsed = new URL(navState.url);
        setCurrentPath(parsed.pathname.toLowerCase());
      } catch (error) {
        console.warn('Failed to parse navigation state URL', error);
        setCurrentPath(routes.dashboard);
      }
    },
    [routes.dashboard, setCurrentPath, shouldShowNavForUrl],
  );

  const navigateToTab = useCallback(
    (tab: TabConfig) => {
      setError(null);
      setIsNavVisible(true);
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

  useEffect(() => {
    setIsNavVisible(shouldShowNavForUrl(initialUrl));
  }, [initialUrl, shouldShowNavForUrl]);

  const navPadding = insets.bottom + 12;

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

      <View style={styles.webViewContainer}>
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

      {isNavVisible ? (
        <NativeBottomNav activeTab={activeTab} onTabPress={navigateToTab} tabs={tabs} safeAreaBottom={navPadding} />
      ) : null}
    </SafeAreaView>
  );
}

type NativeBottomNavProps = {
  tabs: TabConfig[];
  activeTab: TabKey;
  onTabPress: (tab: TabConfig) => void;
  safeAreaBottom: number;
};

function NativeBottomNav({ tabs, activeTab, onTabPress, safeAreaBottom }: NativeBottomNavProps) {
  return (
    <View style={[styles.navContainer, { bottom: safeAreaBottom }]}> 
      <BlurView intensity={40} tint="dark" style={styles.navBlur} experimentalBlurMethod="dimezisBlurView">
        {tabs.map((tab) => {
          const Icon = tab.Icon;
          const isActive = activeTab === tab.key;
          const isDashboard = tab.key === 'dashboard';

          return (
            <View key={tab.key} style={styles.navItemWrapper}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => onTabPress(tab)}
                style={styles.navButton}
                activeOpacity={0.85}
              >
                <View style={styles.navContent}>
                  <View style={styles.iconOuter}>
                    {isActive ? <View style={[styles.iconHalo, isDashboard && styles.dashboardHalo]} /> : null}
                    <View
                      style={[
                        styles.iconWrapper,
                        isDashboard && styles.dashboardIconWrapper,
                        isActive ? styles.iconWrapperActive : styles.iconWrapperInactive,
                      ]}
                    >
                      <Icon
                        size={isDashboard ? 26 : 22}
                        strokeWidth={2.25}
                        color={isActive ? '#ffffff' : 'rgba(255,255,255,0.58)'}
                        style={[styles.icon, isDashboard && styles.dashboardIcon]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.tabLabel,
                      isDashboard && styles.dashboardLabel,
                      isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {tab.label}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </BlurView>
    </View>
  );
}

export default function HomeScreen() {
  const routes = useMemo(() => getDashboardRoutes(), []);

  return (
    <WebViewProvider initialPath={routes.dashboard}>
      <DashboardContent routes={routes} />
    </WebViewProvider>
  );
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
  },
  webView: {
    flex: 1,
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
  navContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 30,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  navBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(44, 76, 140, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#0c1635',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    overflow: 'hidden',
  },
  navItemWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    width: '100%',
  },
  navContent: {
    alignItems: 'center',
    gap: 4,
  },
  iconOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHalo: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.12)',
    shadowColor: 'rgba(198,214,255,0.65)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  dashboardHalo: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(10,16,35,0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  dashboardIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 18,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  iconWrapperInactive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  icon: {
    width: 22,
    height: 22,
  },
  dashboardIcon: {
    width: 26,
    height: 26,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    includeFontPadding: false,
    minWidth: 64,
  },
  dashboardLabel: {
    fontSize: 10,
  },
  tabLabelActive: {
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.22)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.7)',
  },
});
