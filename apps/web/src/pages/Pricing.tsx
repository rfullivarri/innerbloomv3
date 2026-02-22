import { Link } from 'react-router-dom';

export default function PricingPage() {
  const handleMockSubscribe = () => {
    window.alert('Mock subscribe: próxima integración con pasarela de pago.');
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-12 text-text">
      <h1 className="text-3xl font-semibold">Pricing / Precios</h1>
      <p className="mt-4 text-base text-text-muted">
        Aquí podrás completar la suscripción. This is a temporary pricing destination for signed-in users.
      </p>
      <p className="mt-3 text-sm text-text-muted">Precios finales para cliente (impuestos incluidos) · Final customer prices (taxes included).</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleMockSubscribe}
          className="rounded-full bg-accent-purple px-6 py-3 text-sm font-semibold text-white shadow-glow hover:bg-accent-purple/90"
        >
          Subscribe mock
        </button>
        <Link
          to="/"
          className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-text hover:bg-white/5"
        >
          Volver / Back
        </Link>
      </div>
    </main>
  );
}
