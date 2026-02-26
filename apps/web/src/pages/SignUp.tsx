import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';

export default function SignUpPage() {
  const signUpContainerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);

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
      title={language === 'en' ? 'Create your account' : 'Crear tu cuenta'}
      secondaryActionLabel={language === 'en' ? 'Back to home' : 'Volver al inicio'}
      secondaryActionHref={`/?lang=${language}`}
    >
      <div
        ref={signUpContainerRef}
        className="mx-auto w-full min-w-0 max-w-full px-1 sm:px-0"
      >
        <SignUp
          appearance={appearance}
          routing="path"
          path="/sign-up"
          signInUrl={buildLocalizedAuthPath('/login', language)}
          // post-signup must continue onboarding
          fallbackRedirectUrl="/intro-journey"
        />
      </div>
    </AuthLayout>
  );
}
