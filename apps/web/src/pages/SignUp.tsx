import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { createAuthAppearance } from '../lib/clerkAppearance';

export default function SignUpPage() {
  const signUpContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <AuthLayout
      title="Crear tu cuenta"
      description="Sumate a Innerbloom para comenzar a medir y automatizar tus flujos. Creamos tu cuenta en segundos y te guiamos paso a paso."
      primaryActionLabel="Crear cuenta"
      onPrimaryActionClick={() => {
        const input = signUpContainerRef.current?.querySelector<HTMLInputElement>('input');
        input?.focus();
      }}
      secondaryActionLabel="Volver al inicio"
      secondaryActionHref="/"
    >
      <div ref={signUpContainerRef} className="mx-auto w-full min-w-0 max-w-[calc(100%-2rem)] sm:max-w-[440px]">
        <SignUp
          appearance={createAuthAppearance({
            layout: {
              showOptionalFields: false
            },
            elements: {
              footer: 'mt-6 flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs text-white/60 backdrop-blur-xl shadow-none',
              footerActionText: 'text-white/50',
              footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
              formFieldSuccessText: 'text-sm text-emerald-200'
            }
          })}
          routing="path"
          path="/sign-up"
          signInUrl="/login"
          // post-signup must continue onboarding
          fallbackRedirectUrl="/intro-journey"
        />
      </div>
    </AuthLayout>
  );
}
