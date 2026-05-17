import { useEffect } from 'react';
import LandingPage from './Landing';
import { LANDING_V3_CONTENT } from '../content/landingV3Content';
import { usePageMeta } from '../lib/seo';

export default function LandingV3Page() {
  usePageMeta({
    title: 'Innerbloom — App de hábitos adaptativa',
    description: 'Innerbloom crea un Journey adaptativo que ajusta ritmo, dificultad y próximos pasos según tu progreso real.',
    image: 'https://innerbloomjourney.org/og/neneOG3.jpg',
    imageAlt: 'Innerbloom hero illustration',
    ogImageSecureUrl: 'https://innerbloomjourney.org/og/neneOG3.jpg',
    ogImageType: 'image/png',
    ogImageWidth: '1536',
    ogImageHeight: '1024',
    twitterImage: 'https://innerbloomjourney.org/og/neneOG3.jpg',
    twitterImageAlt: 'Innerbloom hero illustration',
    url: 'https://innerbloomjourney.org/',
  });

  useEffect(() => {
    document.body.classList.add('route-landing-v3');
    return () => {
      document.body.classList.remove('route-landing-v3');
    };
  }, []);

  return <LandingPage content={LANDING_V3_CONTENT} variant="v3Conversion" />;
}
