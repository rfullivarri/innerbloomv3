import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import { DevBanner } from './components/layout/DevBanner';
import { UserProvider, useUser } from './state/UserContext';

function RequireUser({ children }: { children: JSX.Element }) {
  const { userId } = useUser();
  const location = useLocation();

  if (!userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function RootRedirect() {
  const { userId } = useUser();
  return <Navigate to={userId ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <UserProvider>
      <div className="min-h-screen bg-transparent">
        <DevBanner />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireUser>
                <DashboardPage />
              </RequireUser>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </UserProvider>
  );
}
