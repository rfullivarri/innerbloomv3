import { Link } from 'react-router-dom';

export default function BillingSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-emerald-300/25 bg-slate-900/90 p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Stripe checkout</p>
        <h1 className="mt-3 text-3xl font-semibold">Pago confirmado</h1>
        <p className="mt-3 text-white/75">Tu suscripción quedó activa. Ya podés volver a la app y revisar tu estado.</p>
        <Link
          to="/settings/billing"
          className="mt-6 inline-flex rounded-2xl border border-emerald-300/30 bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
        >
          Volver a la app
        </Link>
      </section>
    </main>
  );
}
