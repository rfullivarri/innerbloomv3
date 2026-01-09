import { SignIn } from '@clerk/clerk-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';
import { createAuthAppearance } from '../lib/clerkAppearance';
import { usePageMeta } from '../lib/seo';

export default function LoginPage() {
  usePageMeta({
    title: 'Innerbloom | Iniciar sesión',
    description: 'Ingresá a Innerbloom y continuá tu Journey con hábitos y misiones personalizadas.',
    image: '/FlowMood.jpg',
    url: '/login'
  });

  return (
    <AuthLayout
      title={
        <div className="flex flex-col items-center gap-2 text-center text-3xl font-semibold uppercase tracking-[0.24em] text-white sm:text-4xl sm:tracking-[0.28em] md:text-5xl">
          dashboard
        </div>
      }
      secondaryActionLabel="Volver al inicio"
      secondaryActionHref="/"
    >
      <SignIn
        appearance={createAuthAppearance({
          elements: {
            footerActionText: 'text-white/50',
            footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4'
          }
        })}
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={DASHBOARD_PATH}
      />
    </AuthLayout>
  );
}
