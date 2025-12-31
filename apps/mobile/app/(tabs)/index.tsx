import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
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

const DEFAULT_BASE_URL = 'https://web-dev-dfa2.up.railway.app';

const APP_FLAG_SCRIPT = 'window.__INNERBLOOM_NATIVE_APP__ = true; true;';

type TabKey = 'missions' | 'dquest' | 'dashboard' | 'rewards' | 'editor';

type TabConfig = {
  key: TabKey;
  label: string;
  path: string;
  matchers: string[];
  Icon: typeof SvgIcon;
};

type ErrorState = {
  message: string;
  url?: string;
} | null;

function normalizeBaseUrl(raw?: string | null) {
  const trimmed = raw?.trim();

  if (!trimmed) {
    return DEFAULT_BASE_URL;
  }

  try {
    const parsed = new URL(trimmed);
    parsed.pathname = parsed.pathname.replace(/\/$/, '');
    return parsed.toString();
  } catch (error) {
    console.warn('Invalid EXPO_PUBLIC_WEB_BASE_URL, falling back to default', error);
    return DEFAULT_BASE_URL;
  }
}

function buildAppUrl(base: string, path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, base);
  url.searchParams.set('app', '1');
  return url.toString();
}

function getTabFromUrl(url?: string | null): TabKey {
  if (!url) return 'dashboard';

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();

    const matchingTab = TABS.find((tab) =>
      tab.matchers.some((matcher) => pathname.startsWith(matcher)),
    );

    return matchingTab?.key ?? 'dashboard';
  } catch (error) {
    console.warn('Failed to parse url for tab detection', error);
    return 'dashboard';
  }
}

function SvgIcon(props: ComponentProps<typeof Svg>) {
  return <Svg width={24} height={24} fill="none" stroke="currentColor" strokeWidth={1.75} {...props} />;
}

function RouteIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <Path d="M4 18c4 0 4-12 8-12s4 12 8 12" />
      <Circle cx="4" cy="18" r="2" />
      <Circle cx="20" cy="18" r="2" />
      <Circle cx="12" cy="6" r="2" />
    </SvgIcon>
  );
}

function FlameIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <Path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-3-3-4-4-7Z" />
      <Path d="M8 14a4 4 0 1 0 8 0 6 6 0 0 0-2-4" />
    </SvgIcon>
  );
}

function CircleDotIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="2" />
    </SvgIcon>
  );
}

function SparklesIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <Path d="M12 4l1.5 3.5L17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5Z" />
      <Path d="M6 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <Path d="M18 14l.75 1.5L20 16l-1.25.5L18 18l-.75-1.5L16 16l1.25-.5Z" />
    </SvgIcon>
  );
}

function SproutIcon(props: ComponentProps<typeof SvgIcon>) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <Path d="M12 22v-6" />
      <Path d="M16 10c0 2-1.79 4-4 4s-4-2-4-4a4 4 0 0 1 4-4c2.21 0 4 2 4 4Z" />
      <Path d="M9 9C9 6 7 4 4 4c0 3 2 5 5 5Z" />
      <Path d="M15 9c0-3 2-5 5-5 0 3-2 5-5 5Z" />
    </SvgIcon>
  );
}

const TABS: TabConfig[] = [
  {
    key: 'missions',
    label: 'Misiones',
    path: '/missions',
    matchers: ['/missions', '/misiones', '/dashboard/misiones', '/dashboard/missions', '/dashboard/missions-v2', '/dashboard/missions-v3'],
    Icon: RouteIcon,
  },
  {
    key: 'dquest',
    label: 'DQuest',
    path: '/dquest',
    matchers: ['/dquest', '/dashboard/dquest'],
    Icon: FlameIcon,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    matchers: ['/dashboard', '/dashboard-v3'],
    Icon: CircleDotIcon,
  },
  {
    key: 'rewards',
    label: 'Rewards',
    path: '/rewards',
    matchers: ['/rewards', '/dashboard/rewards'],
    Icon: SparklesIcon,
  },
  {
    key: 'editor',
    label: 'Editor',
    path: '/editor',
    matchers: ['/editor'],
    Icon: SproutIcon,
  },
];

export default function HomeScreen() {
  const baseUrl = useMemo(
    () => normalizeBaseUrl(process.env.EXPO_PUBLIC_WEB_BASE_URL ?? null),
    [],
  );
  const initialUrl = useMemo(() => buildAppUrl(baseUrl, '/dashboard'), [baseUrl]);
  const webViewSource = useMemo(() => ({ uri: initialUrl }), [initialUrl]);
  const [activeTab, setActiveTab] = useState<TabKey>(() => getTabFromUrl(initialUrl));
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const webViewRef = useRef<WebView>(null);
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

        return TABS.some((tab) =>
          tab.matchers.some((matcher) => pathname.startsWith(matcher.toLowerCase())),
        );
      } catch (error) {
        console.warn('Failed to evaluate navbar visibility for URL', error);
        return false;
      }
    },
    [allowedHosts],
  );

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
      const nextTab = getTabFromUrl(navState.url);
      setActiveTab(nextTab);
      setIsNavVisible(shouldShowNavForUrl(navState.url));
    },
    [shouldShowNavForUrl],
  );

  const navigateToTab = useCallback(
    (tab: TabConfig) => {
      const targetUrl = buildAppUrl(baseUrl, tab.path || '/dashboard');
      setError(null);
      setIsLoading(true);
      setActiveTab(tab.key);
      setIsNavVisible(true);

      webViewRef.current?.injectJavaScript(
        `if (window.location.href !== ${JSON.stringify(targetUrl)}) { window.location.href = ${JSON.stringify(targetUrl)}; } true;`,
      );
    },
    [baseUrl],
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
    webViewRef.current?.reload();
  }, []);

  const handleBack = useCallback(() => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    }
  }, [canGoBack]);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleHttpError = useCallback(
    (event: any) => {
      const { statusCode, url } = event?.nativeEvent ?? {};

      if (statusCode === 404 && url?.includes('/dashboard') && baseUrl) {
        setError({ message: 'Redirecting to home after missing dashboard.', url });
        webViewRef.current?.injectJavaScript(
          `window.location.replace(${JSON.stringify(buildAppUrl(baseUrl, '/dashboard'))}); true;`,
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
    [baseUrl],
  );

  const handleError = useCallback((event: any) => {
    const failingUrl = event?.nativeEvent?.url as string | undefined;
    setError({ message: 'An error occurred while loading the page.', url: failingUrl });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsNavVisible(shouldShowNavForUrl(initialUrl));
  }, [initialUrl, shouldShowNavForUrl]);

  const navPadding = Math.max(insets.bottom, 12);

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

      <View style={[styles.webViewContainer, { paddingBottom: navPadding + 78 }]}>
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
            ref={webViewRef}
            source={webViewSource}
            startInLoadingState
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={Platform.OS === 'android'}
            domStorageEnabled
            javaScriptEnabled
            incognito={false}
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
        <NativeBottomNav
          activeTab={activeTab}
          onTabPress={navigateToTab}
          tabs={TABS}
          safeAreaBottom={navPadding}
        />
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
    <View style={[styles.navContainer, { paddingBottom: safeAreaBottom }]}>
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
                        stroke={isActive ? '#ffffff' : 'rgba(255,255,255,0.58)'}
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
    backgroundColor: 'transparent',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d111b',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 13, 23, 0.45)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0d111b',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffb4c6',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#c7c9d6',
    textAlign: 'center',
    marginBottom: 16,
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
    paddingHorizontal: 16,
    paddingTop: 6,
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
