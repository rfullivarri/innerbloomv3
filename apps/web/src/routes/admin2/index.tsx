import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { verifyAdminAccess } from '../../lib/adminApi';
import { Skeleton } from '../../components/common/Skeleton';
import { Admin2ThemeProvider } from '../../components/admin2/Admin2ThemeProvider';
import { Admin2Shell } from '../../components/admin2/Admin2Shell';

export default function Admin2Route() {
  const { isLoaded, userId } = useAuth();
  const [status, setStatus] = useState<'checking' | 'ready' | 'forbidden'>('checking');

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      setStatus('forbidden');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    verifyAdminAccess()
      .then(() => {
        if (!cancelled) {
          setStatus('ready');
        }
      })
      .catch((error: unknown) => {
        console.error('[admin2] admin gate failed', error);
        if (!cancelled) {
          setStatus('forbidden');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  if (!isLoaded || status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <p className="text-sm">Verificando acceso admin…</p>
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    return <Navigate to="/" replace />;
  }

  return (
    <Admin2ThemeProvider>
      <Admin2Shell />
    </Admin2ThemeProvider>
  );
}
