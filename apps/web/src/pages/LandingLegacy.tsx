import LandingPage from './Landing';
import { usePageMeta } from '../lib/seo';

export default function LandingLegacyPage() {
  usePageMeta({
    title: 'Innerbloom',
    description: 'Obsérvate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
    image: 'https://innerbloomjourney.org/og/neneOG3.jpg',
    imageAlt: 'Innerbloom hero illustration',
    ogImageSecureUrl: 'https://innerbloomjourney.org/og/neneOG3.jpg',
    ogImageType: 'image/png',
    ogImageWidth: '1536',
    ogImageHeight: '1024',
    twitterImage: 'https://innerbloomjourney.org/og/neneOG3.jpg',
    twitterImageAlt: 'Innerbloom hero illustration',
    url: 'https://innerbloomjourney.org/v3',
  });

  return <LandingPage />;
}
