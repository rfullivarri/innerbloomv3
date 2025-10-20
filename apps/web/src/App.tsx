import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import DashboardPage from './pages/Dashboard';
import DashboardV3Page from './pages/DashboardV3';
import TaskEditorPage from './pages/editor';
import LoginPage from './pages/Login';
import LandingPage from './pages/Landing';
import SignUpPage from './pages/SignUp';
import DebugAiTaskgenPage from './pages/DebugAiTaskgen';
import AdminRoute from './routes/admin';
import { DevBanner } from './components/layout/DevBanner';
import { setApiAuthTokenProvider } from './lib/api';
import OnboardingIntroPage from './pages/OnboardingIntro';
import { DASHBOARD_PATH, DEFAULT_DASHBOARD_PATH } from './config/auth';

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

function RequireUser({ children }: { children: JSX.Element }) {
  const { isLoaded, userId } = useAuth();

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
  children: JSX.Element;
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
  const dashboardSegments = trimmedDashboardPath.split('/').filter(Boolean);
  const primaryDashboardPath = dashboardSegments.length > 0 ? `/${dashboardSegments[0]}` : DEFAULT_DASHBOARD_PATH;
  const isDashboardV3Default = primaryDashboardPath === '/dashboard-v3';
  const fallbackDashboardPath = trimmedDashboardPath || DEFAULT_DASHBOARD_PATH;
  const dashboardBasePath = isDashboardV3Default ? '/dashboard-v3' : fallbackDashboardPath;
  const dashboardRoutePath = isDashboardV3Default
    ? `${dashboardBasePath}/*`
    : fallbackDashboardPath;
  const signedInRedirectPath = trimmedDashboardPath;

  return (
    <div className="min-h-screen bg-transparent">
      <DevBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
              {isDashboardV3Default ? <DashboardV3Page /> : <DashboardPage />}
            </RequireUser>
          }
        />
        {isDashboardV3Default ? (
          <Route path="/dashboard" element={<Navigate to={trimmedDashboardPath} replace />} />
        ) : (
          <Route
            path="/dashboard-v3/*"
            element={
              <RequireUser>
                <DashboardV3Page />
              </RequireUser>
            }
          />
        )}
        <Route
          path="/editor"
          element={
            <RequireUser>
              <TaskEditorPage />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
