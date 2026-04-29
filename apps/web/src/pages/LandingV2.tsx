import { useEffect } from 'react';
import LandingPage from './Landing';
import { LANDING_V2_CONTENT } from '../content/landingV2Content';

export default function LandingV2Page() {
  useEffect(() => {
    document.title = 'Innerbloom — App de hábitos adaptativa';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Crea un plan de hábitos que se adapta a tu progreso real. Innerbloom ajusta ritmo, dificultad y próximos pasos para ayudarte a sostener hábitos.');
    }
  }, []);

  return <LandingPage content={LANDING_V2_CONTENT} />;
}
