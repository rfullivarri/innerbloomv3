import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, type ReactElement } from 'react';
import { useAuth } from './auth/runtimeAuth';
import DashboardV3Page from './pages/DashboardV3';
import TaskEditorPage from './pages/editor';
import LoginPage from './pages/Login';
import LandingPage from './pages/Landing';
import LandingV2Page from './pages/LandingV2';
import SignUpPage from './pages/SignUp';
import DebugAiTaskgenPage from './pages/DebugAiTaskgen';
import DevMissionsPage from './pages/DevMissionsPage';
import AdminRoute from './routes/admin';
import Admin2Route from './routes/admin2';
import { DevBanner } from './components/layout/DevBanner';
import { DEV_USER_SWITCH_ACTIVE, setApiAuthTokenProvider } from './lib/api';
import OnboardingIntroPage from './pages/OnboardingIntro';
import PricingPage from './pages/Pricing';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from './config/auth';
import SubscriptionPage from './pages/Subscription';
import PremiumTimelineDemoPage from './pages/PremiumTimelineDemo';
import BillingSuccessPage from './pages/BillingSuccess';
import BillingCancelPage from './pages/BillingCancel';
import DemoDashboardPage from './pages/DemoDashboard';
import QuickStartPreviewPage from './pages/QuickStartPreview';
import LabsDemoModeSelectPage from './pages/LabsDemoModeSelect';
import DemoModeSelectPage from './pages/DemoModeSelect';
import { useGa4FunnelTracking } from './hooks/useGa4FunnelTracking';
import { isNativeCapacitorPlatform } from './mobile/capacitor';
import { writeMobileDebug } from './mobile/mobileDebug';
import { MobileAppEntry } from './mobile/MobileAppEntry';
import { shouldForceNativeWelcome, useMobileAuthSession } from './mobile/mobileAuthSession';
import MobileBrowserAuthPage from './pages/MobileBrowserAuth';

const CLERK_TOKEN_TEMPLATE = (() => {
  const raw = import.meta.env.VITE_CLERK_TOKEN_TEMPLATE;
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
})();

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

      setApiAuthTokenProvider(async () => mobileAuthSession.token);
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
      <DevBanner />
      <Routes>
        <Route path="/" element={isNativeApp ? <MobileAppEntry /> : <LandingPage />} />
        <Route path="/landing-v2" element={<LandingV2Page />} />
        <Route path="/premium-timeline" element={<PremiumTimelineDemoPage />} />
        <Route path="/demo" element={<DemoDashboardPage />} />
        <Route path="/demo-mode-select" element={<DemoModeSelectPage />} />
        <Route path="/labs/demo-mode-select" element={<LabsDemoModeSelectPage legacyLabsPath />} />
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
        <Route
          path="/pricing"
          element={
            <RequireUser>
              <PricingPage />
            </RequireUser>
          }
        />
        <Route
          path="/editor"
          element={
            <RequireUser>
              <TaskEditorPage />
            </RequireUser>
          }
        />
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
        <Route path="/billing/success" element={<BillingSuccessPage />} />
        <Route path="/billing/cancel" element={<BillingCancelPage />} />
        <Route
          path="/pricing"
          element={
            <RequireUser>
              <PricingPage />
            </RequireUser>
          }
        />
        <Route
          path="/admin/*"
          element={
            <RequireUser>
              <AdminRoute />
            </RequireUser>
          }
        />
        <Route
          path="/admin2/*"
          element={
            <RequireUser>
              <Admin2Route />
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
