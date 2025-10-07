import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import DashboardV3Page from './pages/DashboardV3';
import LoginPage from './pages/Login';
import LandingPage from './pages/Landing';
import SignUpPage from './pages/SignUp';
import { DevBanner } from './components/layout/DevBanner';

function RequireUser({ children }: { children: JSX.Element }) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-text">Cargando…</div>;
  }

  if (!userId) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RedirectIfSignedIn({ children }: { children: JSX.Element }) {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center text-text">Cargando…</div>;
  }

  if (userId) {
    return <Navigate to="/dashboard-v3" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-transparent">
      <DevBanner />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login/*"
          element={
            <RedirectIfSignedIn>
              <LoginPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <RedirectIfSignedIn>
              <SignUpPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/dashboard"
          element={<Navigate to="/dashboard-v3" replace />}
        />
        <Route
          path="/dashboard-v3"
          element={
            <RequireUser>
              <DashboardV3Page />
            </RequireUser>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
