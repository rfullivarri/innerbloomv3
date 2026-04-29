import { useEffect } from 'react';
import LandingPage from './Landing';
import { LANDING_V2_CONTENT } from '../content/landingV2Content';

export default function LandingOfficialV2Page() {
  useEffect(() => {
    document.title = 'Innerbloom — App de hábitos adaptativa';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Crea un plan de hábitos que se adapta a tu progreso real. Innerbloom ajusta ritmo, dificultad y próximos pasos para ayudarte a sostener hábitos.');
  }, []);

  return <LandingPage content={LANDING_V2_CONTENT} />;
}
