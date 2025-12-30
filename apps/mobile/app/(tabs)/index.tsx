import { useCallback, useMemo, useRef, useState } from 'react';
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
import type { WebViewNavigation } from 'react-native-webview';
import { WebView } from 'react-native-webview';

type ErrorState = {
  message: string;
  url?: string;
} | null;

const DEFAULT_BASE_URL = 'https://web-dev-dfa2.up.railway.app';

export default function HomeScreen() {
  const baseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? DEFAULT_BASE_URL;
  const normalizedBaseUrl = useMemo(() => baseUrl?.replace(/\/$/, ''), [baseUrl]);
  const dashboardUrl = normalizedBaseUrl ? `${normalizedBaseUrl}/dashboard` : undefined;
  const [currentUri, setCurrentUri] = useState(dashboardUrl ?? normalizedBaseUrl ?? DEFAULT_BASE_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const webViewRef = useRef<WebView>(null);

  const onNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleShouldStartLoadWithRequest = useCallback(
    (request: any) => {
      const requestUrl = request?.url as string | undefined;

      if (!requestUrl) return false;

      if (requestUrl.startsWith('about:blank')) return true;

      if (requestUrl.startsWith('mailto:') || requestUrl.startsWith('tel:')) {
        Linking.openURL(requestUrl).catch(() => undefined);
        return false;
      }

      try {
        const requestOrigin = new URL(requestUrl).origin;
        const baseOrigin = normalizedBaseUrl ? new URL(normalizedBaseUrl).origin : undefined;

        const isSameOrigin = baseOrigin
          ? requestOrigin === baseOrigin || requestUrl.startsWith(`${normalizedBaseUrl}/`)
          : true;

        if (!isSameOrigin) {
          Linking.openURL(requestUrl).catch(() => undefined);
          return false;
        }
      } catch (e) {
        Linking.openURL(requestUrl).catch(() => undefined);
        return false;
      }

      return true;
    },
    [normalizedBaseUrl],
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

      if (statusCode === 404 && dashboardUrl && url?.startsWith(dashboardUrl) && normalizedBaseUrl) {
        setCurrentUri(normalizedBaseUrl);
        return;
      }

      setError({
        message: `Failed to load content (HTTP ${statusCode ?? 'error'})`,
        url,
      });
      setIsLoading(false);
    },
    [dashboardUrl, normalizedBaseUrl],
  );

  const handleError = useCallback((event: any) => {
    const failingUrl = event?.nativeEvent?.url as string | undefined;
    setError({ message: 'An error occurred while loading the page.', url: failingUrl });
    setIsLoading(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={!canGoBack}
          onPress={handleBack}
          style={[styles.headerButton, !canGoBack && styles.headerButtonDisabled]}
        >
          <Text style={[styles.headerButtonText, !canGoBack && styles.headerButtonTextDisabled]}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Innerbloom</Text>
        <TouchableOpacity accessibilityRole="button" onPress={handleReload} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>Reload</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.webViewContainer}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error.message}</Text>
            {error.url ? <Text style={styles.errorSubtext}>{error.url}</Text> : null}
            <TouchableOpacity accessibilityRole="button" onPress={handleReload} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: currentUri }}
            startInLoadingState
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={Platform.OS === 'android'}
            domStorageEnabled
            javaScriptEnabled
            allowsBackForwardNavigationGestures
            onNavigationStateChange={onNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            renderLoading={() => (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#0a84ff" />
              </View>
            )}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onHttpError={handleHttpError}
            onError={handleError}
          />
        )}
        {isLoading && !error ? (
          <View style={styles.loaderOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#0a84ff" />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#e0e4ea',
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0a0a0a',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#eef2f7',
  },
  headerButtonText: {
    color: '#0a84ff',
    fontSize: 14,
    fontWeight: '500',
  },
  headerButtonDisabled: {
    backgroundColor: '#f3f3f3',
  },
  headerButtonTextDisabled: {
    color: '#9aa0a6',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b00020',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 13,
    color: '#5f6368',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#0a84ff',
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
