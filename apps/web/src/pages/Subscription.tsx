import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  cancelSubscription,
  getSubscription,
  type SubscriptionData,
} from '../lib/api/subscriptionMock';

function formatDate(value: string | null): string {
  if (!value) {
    return 'No disponible';
  }
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const loadSubscription = useCallback(async () => {
    setIsLoading(true);
    const response = await getSubscription();
    if (!response.ok && response.error.code === 'subscription_inactive') {
      setIsLocked(true);
      setIsLoading(false);
      return;
    }

    if (response.ok) {
      setSubscription(response.data);
      setIsLocked(response.data.status === 'inactive');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const nextDateLabel = useMemo(() => {
    if (!subscription) {
      return 'No disponible';
    }

    if (subscription.status === 'trialing') {
      return `Fin de trial: ${formatDate(subscription.trialEndsAt)}`;
    }

    return `Próxima renovación: ${formatDate(subscription.nextRenewalAt)}`;
  }, [subscription]);

  const handleCancel = useCallback(async () => {
    const response = await cancelSubscription();
    if (response.ok) {
      setSubscription(response.data);
      setIsLocked(true);
    }
  }, []);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-white">Cargando suscripción...</div>;
  }

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <h1 className="text-3xl font-semibold">Tu suscripción está inactiva</h1>
        <p className="max-w-xl text-white/70">Activá un plan para volver a acceder a las funciones premium.</p>
        <Link
          to="/pricing"
          className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
        >
          Ver pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12 text-white">
      <h1 className="text-3xl font-semibold">Suscripción</h1>
      <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <p>
          <span className="text-white/70">Plan actual:</span> <strong>{subscription?.plan ?? 'No definido'}</strong>
        </p>
        <p>
          <span className="text-white/70">Estado:</span> <strong>{subscription?.status ?? 'No definido'}</strong>
        </p>
        <p className="text-white/90">{nextDateLabel}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/pricing"
          className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
        >
          Cambiar plan
        </Link>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl border border-red-300/30 bg-red-500/10 px-5 py-3 font-semibold text-red-100 transition hover:bg-red-500/20"
        >
          Cancelar suscripción
        </button>
      </div>
    </div>
  );
}
