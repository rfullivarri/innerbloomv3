import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, type ReactElement } from 'react';
import { useAuth } from './auth/runtimeAuth';
import DashboardV3Page from './pages/DashboardV3';
import TaskEditorPage from './pages/editor';
import LoginPage from './pages/Login';
import LandingV2Page from './pages/LandingV2';
import LandingV3Page from './pages/LandingV3';
import LandingLegacyPage from './pages/LandingLegacy';
import SignUpPage from './pages/SignUp';
import DebugAiTaskgenPage from './pages/DebugAiTaskgen';
import DevMissionsPage from './pages/DevMissionsPage';
import Admin2Route from './routes/admin2';
import { DevBanner } from './components/layout/DevBanner';
import { DEV_USER_SWITCH_ACTIVE, setApiAuthTokenProvider } from './lib/api';
import { getDailyReminderSettings } from './lib/api';
import OnboardingIntroPage from './pages/OnboardingIntro';
import PricingPage from './pages/Pricing';
import { CLERK_TOKEN_TEMPLATE, DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from './config/auth';
import SubscriptionPage from './pages/Subscription';
import PremiumTimelineDemoPage from './pages/PremiumTimelineDemo';
import BillingSuccessPage from './pages/BillingSuccess';
import BillingCancelPage from './pages/BillingCancel';
import DemoDashboardPage from './pages/DemoDashboard';
import QuickStartPreviewPage from './pages/QuickStartPreview';
import LabsDemoModeSelectPage from './pages/LabsDemoModeSelect';
import DemoModeSelectPage from './pages/DemoModeSelect';
import LabsLogrosDemoPage from './pages/labs/LogrosDemoPage';
import LabsIndexPage from './pages/labs/LabsIndexPage';
import LandingRhythmSectionMvpPage from './pages/labs/LandingRhythmSectionMvpPage';
import EditorLabPage from './pages/labs/EditorLabPage';
import PublicTasksDemoPage from './pages/labs/PublicTasksDemoPage';
import HeroPhoneShowcaseLabPage from './pages/labs/HeroPhoneShowcaseLabPage';
import InnerbloomSystemMapPage from './pages/labs/InnerbloomSystemMapPage';
import AvatarCtaCarouselLabPage from './pages/labs/AvatarCtaCarouselLabPage';
import OnboardingRhythmSelectorLabPage from './pages/labs/OnboardingRhythmSelectorLabPage';
import { useGa4FunnelTracking } from './hooks/useGa4FunnelTracking';
import { isNativeCapacitorPlatform } from './mobile/capacitor';
import { writeMobileDebug } from './mobile/mobileDebug';
import { MobileAppEntry } from './mobile/MobileAppEntry';
import { syncNativeDailyReminderNotification } from './mobile/localNotifications';
import {
  ensureFreshMobileAuthSession,
  getMobileAuthSession,
  shouldForceNativeWelcome,
  useMobileAuthSession,
} from './mobile/mobileAuthSession';
import MobileBrowserAuthPage from './pages/MobileBrowserAuth';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';
import SupportPage from './pages/legal/SupportPage';
import AccountDeletionPage from './pages/AccountDeletion';
import SsoCallbackPage from './pages/SsoCallback';
import { SHOW_BILLING_UI } from './config/releaseFlags';

function ApiAuthBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const mobileAuthSession = useMobileAuthSession();
  const isNativeApp = isNativeCapacitorPlatform();
  const forceNativeWelcome = isNativeApp && shouldForceNativeWelcome();

  useEffect(() => () => {
    setApiAuthTokenProvider(null);
  }, []);

  useEffect(() => {
    if (DEV_USER_SWITCH_ACTIVE && import.meta.env.DEV) {
      setApiAuthTokenProvider(async () => 'dev-token');
      return;
    }

    if (forceNativeWelcome) {
      writeMobileDebug('api-auth-provider', {
        source: 'force-native-welcome',
        ready: false,
      });
      console.info('[API] auth provider cleared by native welcome override');
      setApiAuthTokenProvider(null);
      return;
    }

    if (isNativeApp && mobileAuthSession?.token) {
      writeMobileDebug('api-auth-provider', {
        source: 'mobile-callback-token',
        ready: true,
        hasToken: true,
        clerkUserId: mobileAuthSession.clerkUserId,
      });
      console.info('[API] auth provider source = mobile callback token', {
        hasToken: true,
        clerkUserId: mobileAuthSession.clerkUserId,
      });

      setApiAuthTokenProvider(async () => {
        const refreshed = await ensureFreshMobileAuthSession({
          reason: 'api-auth-provider',
          minValidityMs: 5_000,
        });

        const latestToken =
          refreshed?.token ??
          getMobileAuthSession()?.token ??
          mobileAuthSession.token;

        if (!latestToken) {
          throw new Error('Missing native mobile auth token for API request.');
        }

        return latestToken;
      });
      return;
    }

    if (!isLoaded || !isSignedIn) {
      writeMobileDebug('api-auth-provider', {
        source: 'none',
        ready: false,
        isNativeApp,
        isLoaded,
        isSignedIn,
        hasMobileCallbackToken: Boolean(mobileAuthSession?.token),
      });
      console.info('[API] auth provider cleared', {
        isNativeApp,
        isLoaded,
        isSignedIn,
        hasMobileCallbackToken: Boolean(mobileAuthSession?.token),
      });
      setApiAuthTokenProvider(null);
      return;
    }

    const provider = async () => {
      try {
        if (CLERK_TOKEN_TEMPLATE) {
          return await getToken({ template: CLERK_TOKEN_TEMPLATE });
        }

        return await getToken();
      } catch (error) {
        console.error('[API] Failed to retrieve Clerk token', error);
        throw error;
      }
    };

    console.info('[API] auth provider source = clerk', {
      isNativeApp,
      isLoaded,
      isSignedIn,
      usesTemplate: Boolean(CLERK_TOKEN_TEMPLATE),
    });
    writeMobileDebug('api-auth-provider', {
      source: 'clerk',
      ready: true,
      isNativeApp,
      isLoaded,
      isSignedIn,
      usesTemplate: Boolean(CLERK_TOKEN_TEMPLATE),
    });

    setApiAuthTokenProvider(provider);
  }, [forceNativeWelcome, getToken, isLoaded, isNativeApp, isSignedIn, mobileAuthSession?.clerkUserId, mobileAuthSession?.token]);

  return null;
}

function NativeDailyReminderSyncBridge() {
  const { isLoaded, isSignedIn } = useAuth();
  const mobileAuthSession = useMobileAuthSession();
  const isNativeApp = isNativeCapacitorPlatform();
  const forceNativeWelcome = isNativeApp && shouldForceNativeWelcome();

  useEffect(() => {
    if (!isNativeApp) {
      return;
    }

    let cancelled = false;
    const hasSession = Boolean(mobileAuthSession?.token) || (isLoaded && isSignedIn);

    void (async () => {
      if (!hasSession || forceNativeWelcome) {
        console.info('[mobile-reminder] sync skipped without clearing scheduled reminder', {
          hasSession,
          forceNativeWelcome,
        });
        writeMobileDebug('mobile-reminder:sync-skip-no-session-preserve', {
          hasSession,
          forceNativeWelcome,
          at: Date.now(),
        });
        return;
      }

      try {
        const reminder = await getDailyReminderSettings('notification');
        if (!cancelled) {
          await syncNativeDailyReminderNotification(reminder);
        }
      } catch (error) {
        console.warn('[mobile-reminder] failed to sync local notification from backend', { error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [forceNativeWelcome, isLoaded, isNativeApp, isSignedIn, mobileAuthSession?.token]);

  return null;
}

function RequireUser({ children }: { children: ReactElement }) {
  const { isLoaded, userId } = useAuth();
  const mobileAuthSession = useMobileAuthSession();
  const devBypass = DEV_USER_SWITCH_ACTIVE && import.meta.env.DEV;
  const unauthenticatedRedirectPath = isNativeCapacitorPlatform() ? '/' : '/login';
  const hasNativeSession = isNativeCapacitorPlatform() && Boolean(mobileAuthSession?.token) && !shouldForceNativeWelcome();

  if (devBypass) {
    return children;
  }

  if (!isLoaded && !hasNativeSession) {
    return <div className="flex min-h-screen items-center justify-center text-text">Cargando…</div>;
  }

  if (!userId && !hasNativeSession) {
    return <Navigate to={unauthenticatedRedirectPath} replace />;
  }

  return children;
}

function RedirectIfSignedIn({
  children,
  redirectPath,
}: {
  children: ReactElement;
  redirectPath: string;
}) {
  const { isLoaded, userId } = useAuth();
  const mobileAuthSession = useMobileAuthSession();
  const hasNativeSession = isNativeCapacitorPlatform() && Boolean(mobileAuthSession?.token) && !shouldForceNativeWelcome();

  if (!isLoaded && !hasNativeSession) {
    return <div className="flex min-h-screen items-center justify-center text-text">Cargando…</div>;
  }

  if (userId || hasNativeSession) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default function App() {
  const isNativeApp = isNativeCapacitorPlatform();
  const enableTaskgen = String(import.meta.env.VITE_ENABLE_TASKGEN_TRIGGER ?? 'false').toLowerCase() === 'true';
  const rawDashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;
  const normalizedDashboardPath = rawDashboardPath.startsWith('/') ? rawDashboardPath : `/${rawDashboardPath}`;
  const trimmedDashboardPath = normalizedDashboardPath.replace(/\/+$/, '') || DEFAULT_DASHBOARD_PATH;
  const dashboardRoutePath = `${trimmedDashboardPath}/*`;
  const signedInRedirectPath = isNativeApp ? '/' : trimmedDashboardPath;
  const dashboardAliases = ['/dashboard', '/dashboard-v3'].filter(
    (alias) => alias !== trimmedDashboardPath,
  );
  useGa4FunnelTracking({ dashboardBasePath: trimmedDashboardPath });

  return (
    <div className="min-h-screen bg-transparent">
      <ApiAuthBridge />
      <NativeDailyReminderSyncBridge />
      <DevBanner />
      <Routes>
        <Route path="/" element={isNativeApp ? <MobileAppEntry /> : <LandingV3Page />} />
        <Route path="/v2" element={isNativeApp ? <MobileAppEntry /> : <LandingV2Page />} />
        <Route path="/v3" element={isNativeApp ? <MobileAppEntry /> : <LandingLegacyPage />} />
        <Route path="/premium-timeline" element={<PremiumTimelineDemoPage />} />
        <Route path="/demo" element={<DemoDashboardPage />} />
        <Route path="/demo-mode-select" element={<DemoModeSelectPage />} />
        <Route path="/labs" element={<LabsIndexPage />} />
        <Route path="/labs/demo-mode-select" element={<LabsDemoModeSelectPage legacyLabsPath />} />
        <Route path="/labs/logros" element={<LabsLogrosDemoPage />} />
        <Route path="/labs/tasks-demo" element={<PublicTasksDemoPage />} />
        <Route path="/labs/hero-phone-showcase" element={<HeroPhoneShowcaseLabPage />} />
        <Route path="/labs/innerbloom-system-map" element={<InnerbloomSystemMapPage />} />
        <Route path="/labs/avatar-cta-carousel" element={<AvatarCtaCarouselLabPage />} />
        <Route path="/labs/onboarding-rhythm-selector" element={<OnboardingRhythmSelectorLabPage />} />
        <Route path="/demo/logros" element={<LabsLogrosDemoPage />} />
        <Route path="/demo/tasks" element={<PublicTasksDemoPage />} />
        <Route path="/labs/landing-rhythm-section" element={<LandingRhythmSectionMvpPage />} />
        <Route
          path="/labs/editor"
          element={(
            <RequireUser>
              <EditorLabPage />
            </RequireUser>
          )}
        />
        <Route path="/onboarding" element={<OnboardingIntroPage />} />
        <Route path="/intro-journey" element={<OnboardingIntroPage />} />
        <Route
          path="/labs/quick-start"
          element={(
            <RequireUser>
              <QuickStartPreviewPage />
            </RequireUser>
          )}
        />
        <Route
          path="/login/*"
          element={
            <RedirectIfSignedIn redirectPath={signedInRedirectPath}>
              <LoginPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <RedirectIfSignedIn redirectPath={signedInRedirectPath}>
              <SignUpPage />
            </RedirectIfSignedIn>
          }
        />
        <Route path="/mobile-auth" element={<MobileBrowserAuthPage />} />
        <Route path="/sso-callback" element={<SsoCallbackPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account-deletion" element={<AccountDeletionPage />} />
        <Route
          path={dashboardRoutePath}
          element={
            <RequireUser>
              <DashboardV3Page />
            </RequireUser>
          }
        />
        {dashboardAliases.map((alias) => (
          <Route
            key={alias}
            path={`${alias}/*`}
            element={<DashboardAliasRedirect from={alias} to={trimmedDashboardPath} />}
          />
        ))}
        {SHOW_BILLING_UI ? (
          <Route
            path="/pricing"
            element={
              <RequireUser>
                <PricingPage />
              </RequireUser>
            }
          />
        ) : null}
        <Route
          path="/editor"
          element={
            <RequireUser>
              <TaskEditorPage />
            </RequireUser>
          }
        />
        {SHOW_BILLING_UI ? (
          <>
            <Route
              path="/subscription"
              element={
                <RequireUser>
                  <SubscriptionPage />
                </RequireUser>
              }
            />
            <Route
              path="/settings/billing"
              element={
                <RequireUser>
                  <SubscriptionPage />
                </RequireUser>
              }
            />
            <Route
              path="/premium"
              element={
                <RequireUser>
                  <SubscriptionPage />
                </RequireUser>
              }
            />
          </>
        ) : null}
        {SHOW_BILLING_UI ? (
          <>
            <Route path="/billing/success" element={<BillingSuccessPage />} />
            <Route path="/billing/cancel" element={<BillingCancelPage />} />
          </>
        ) : null}
        <Route
          path="/admin/*"
          element={
            <RequireUser>
              <Admin2Route />
            </RequireUser>
          }
        />
        <Route
          path="/admin2/*"
          element={
            <RequireUser>
              <AdminAliasRedirect from="/admin2" to="/admin" />
            </RequireUser>
          }
        />
        {enableTaskgen ? (
          <Route path="/_debug/ai-taskgen" element={<DebugAiTaskgenPage />} />
        ) : null}
        {DEV_USER_SWITCH_ACTIVE ? <Route path="/_dev/missions-v2" element={<DevMissionsPage />} /> : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function DashboardAliasRedirect({ from, to }: { from: string; to: string }) {
  const location = useLocation();
  const pathname = location.pathname;
  let suffix = pathname.startsWith(from) ? pathname.slice(from.length) : '';
  if (suffix === '/') {
    suffix = '';
  }
  const normalizedSuffix = suffix.startsWith('/') ? suffix : suffix ? `/${suffix}` : '';
  const target = `${to}${normalizedSuffix}` || to;
  const search = location.search || '';
  const hash = location.hash || '';
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

function AdminAliasRedirect({ from, to }: { from: string; to: string }) {
  const location = useLocation();
  const pathname = location.pathname;
  let suffix = pathname.startsWith(from) ? pathname.slice(from.length) : '';
  if (suffix === '/') {
    suffix = '';
  }

  const normalizedSuffix = suffix.startsWith('/') ? suffix : suffix ? `/${suffix}` : '';
  const target = `${to}${normalizedSuffix}` || to;
  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
}
