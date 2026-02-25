import { Link } from 'react-router-dom';

export default function BillingCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-amber-300/25 bg-slate-900/90 p-8 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">Stripe checkout</p>
        <h1 className="mt-3 text-3xl font-semibold">Pago cancelado</h1>
        <p className="mt-3 text-white/75">No se realizó ningún cargo. Podés volver al plan premium y reintentar cuando quieras.</p>
        <Link
          to="/premium"
          className="mt-6 inline-flex rounded-2xl border border-amber-300/30 bg-amber-300 px-5 py-3 font-semibold text-amber-950 transition hover:bg-amber-200"
        >
          Intentar de nuevo
        </Link>
      </section>
    </main>
  );
}
