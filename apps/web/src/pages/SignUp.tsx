import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { createAuthAppearance } from '../lib/clerkAppearance';

export default function SignUpPage() {
  const signUpContainerRef = useRef<HTMLDivElement | null>(null);

  const appearance = createAuthAppearance({
    layout: {
      showOptionalFields: true
    },
    elements: {
      footerActionText: 'text-white/50',
      footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
      formFieldSuccessText: 'text-sm text-emerald-200'
    }
  });

  return (
    <AuthLayout
      title="Crear tu cuenta"
      description="Sumate a Innerbloom para comenzar a medir y automatizar tus flujos. Creamos tu cuenta en segundos y te guiamos paso a paso."
      secondaryActionLabel="Volver al inicio"
      secondaryActionHref="/"
    >
      <div
        ref={signUpContainerRef}
        className="mx-auto w-full min-w-0 max-w-full px-1 sm:max-w-[480px] sm:px-0"
      >
        <SignUp
          appearance={appearance}
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
