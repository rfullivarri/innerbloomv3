import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, type ReactElement } from 'react';
import { useAuth } from '@clerk/clerk-react';
import DashboardV3Page from './pages/DashboardV3';
import TaskEditorPage from './pages/editor';
import LoginPage from './pages/Login';
import LandingPage from './pages/Landing';
import LandingV2Page from './pages/LandingV2';
import SignUpPage from './pages/SignUp';
import DebugAiTaskgenPage from './pages/DebugAiTaskgen';
import DevMissionsPage from './pages/DevMissionsPage';
import AdminRoute from './routes/admin';
import { DevBanner } from './components/layout/DevBanner';
import { DEV_USER_SWITCH_ACTIVE, setApiAuthTokenProvider } from './lib/api';
import OnboardingIntroPage from './pages/OnboardingIntro';
import PricingPage from './pages/Pricing';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from './config/auth';
import SubscriptionPage from './pages/Subscription';
import PricingPage from './pages/Pricing';

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

  useEffect(() => {
    if (DEV_USER_SWITCH_ACTIVE && import.meta.env.DEV) {
      setApiAuthTokenProvider(async () => 'dev-token');
      return () => {
        setApiAuthTokenProvider(null);
      };
    }

    if (!isLoaded || !isSignedIn) {
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

    setApiAuthTokenProvider(provider);

    return () => {
      setApiAuthTokenProvider(null);
    };
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}

function RequireUser({ children }: { children: ReactElement }) {
  const { isLoaded, userId } = useAuth();
  const devBypass = DEV_USER_SWITCH_ACTIVE && import.meta.env.DEV;

  if (devBypass) {
    return (
      <>
        <ApiAuthBridge />
        {children}
      </>
    );
  }

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-text">Cargando…</div>;
  }

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <ApiAuthBridge />
      {children}
    </>
  );
}

function RedirectIfSignedIn({
  children,
  redirectPath,
}: {
  children: ReactElement;
  redirectPath: string;
}) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-text">Cargando…</div>;
  }

  if (userId) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

export default function App() {
  const enableTaskgen = String(import.meta.env.VITE_ENABLE_TASKGEN_TRIGGER ?? 'false').toLowerCase() === 'true';
  const rawDashboardPath = DASHBOARD_PATH || DEFAULT_DASHBOARD_PATH;
  const normalizedDashboardPath = rawDashboardPath.startsWith('/') ? rawDashboardPath : `/${rawDashboardPath}`;
  const trimmedDashboardPath = normalizedDashboardPath.replace(/\/+$/, '') || DEFAULT_DASHBOARD_PATH;
  const dashboardRoutePath = `${trimmedDashboardPath}/*`;
  const signedInRedirectPath = trimmedDashboardPath;
  const dashboardAliases = ['/dashboard', '/dashboard-v3'].filter(
    (alias) => alias !== trimmedDashboardPath,
  );

  return (
    <div className="min-h-screen bg-transparent">
      <DevBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing-v2" element={<LandingV2Page />} />
        <Route path="/intro-journey" element={<OnboardingIntroPage />} />
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
