import { useEffect } from 'react';
import LandingPage from './Landing';
import { LANDING_V3_CONTENT } from '../content/landingV3Content';

export default function LandingV3Page() {
  useEffect(() => {
    document.title = 'Innerbloom — App de hábitos adaptativa';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Innerbloom crea un Journey adaptativo que ajusta ritmo, dificultad y próximos pasos según tu progreso real.');
    }

    document.body.classList.add('route-landing-v3');
    return () => {
      document.body.classList.remove('route-landing-v3');
    };
  }, []);

  return <LandingPage content={LANDING_V3_CONTENT} variant="v3Conversion" />;
}
