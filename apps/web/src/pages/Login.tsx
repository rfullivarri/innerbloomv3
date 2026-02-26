import { SignIn } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';
import { usePageMeta } from '../lib/seo';

export default function LoginPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);

  usePageMeta({
    title: 'Innerbloom',
    description:
      language === 'en'
        ? 'Observe yourself in third person for the first time and take control of your actions and habits.'
        : 'Obsérvate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
    image: 'https://innerbloomjourney.org/og/neneOGP.png',
    imageAlt: 'Innerbloom',
    ogImageSecureUrl: 'https://innerbloomjourney.org/og/neneOGP.png',
    ogImageType: 'image/png',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    twitterImage: 'https://innerbloomjourney.org/og/neneOGP.png',
    url: 'https://innerbloomjourney.org/login'
  });

  return (
    <AuthLayout
      title={language === 'en' ? 'Sign in' : 'Iniciar sesión'}
      secondaryActionLabel={language === 'en' ? 'Back to home' : 'Volver al inicio'}
      secondaryActionHref={`/?lang=${language}`}
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
        signUpUrl={buildLocalizedAuthPath('/sign-up', language)}
        fallbackRedirectUrl={DASHBOARD_PATH}
      />
    </AuthLayout>
  );
}
