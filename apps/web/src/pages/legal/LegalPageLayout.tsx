import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

type LegalPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function LegalPageLayout({ title, subtitle, children }: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <nav className="mb-8 text-sm text-slate-300">
          <Link className="underline-offset-2 hover:underline" to="/">
            ← Back to Innerbloom
          </Link>
        </nav>

        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="text-sm text-slate-300 sm:text-base">{subtitle}</p> : null}
        </header>

        <article className="space-y-7 text-sm leading-7 text-slate-100 sm:text-base sm:leading-8">{children}</article>
      </div>
    </main>
  );
}
