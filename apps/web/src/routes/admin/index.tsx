import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { verifyAdminAccess } from '../../lib/adminApi';

export default function AdminRoute() {
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
        console.error('[admin] admin gate failed', error);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  if (status === 'forbidden') {
    return <Navigate to="/" replace />;
  }

  return <AdminLayout />;
}
