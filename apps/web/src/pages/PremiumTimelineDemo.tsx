import { useMemo, useState } from 'react';
import PremiumTimeline, { type TimelineStep } from '../components/PremiumTimeline';

type Language = 'es' | 'en';

type TimelineCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  closingLine: string;
  steps: TimelineStep[];
};

const TIMELINE_COPY: Record<Language, TimelineCopy> = {
  es: {
    eyebrow: 'Premium Scroll Timeline',
    title: 'Cómo funciona Innerbloom',
    subtitle: 'Un sistema guiado para pasar de “quiero estar mejor” a hábitos reales en tu día a día.',
    closingLine: 'Innerbloom combina gestión de hábitos con registro emocional para construir constancia con un plan realista.',
    steps: [
      {
        title: 'Comienzas tu camino ✨',
        badge: 'ONBOARDING PERSONALIZADO',
        bullets: [
          'Elegís tu modo de juego y respondés unas preguntas sobre energía, prioridades y tu momento actual (2–3 min).',
          'Innerbloom entiende lo que estás buscando y arma un punto de partida claro para empezar con foco (sin presión).',
        ],
        chips: ['onboarding · energía diaria'],
      },
      {
        title: 'Tu primer plan equilibrado ⚖️',
        badge: 'PLAN EQUILIBRADO',
        bullets: [
          'Recibís un plan ordenado en Cuerpo, Mente y Alma, con microacciones realistas.',
          'Te queda una rutina simple y sostenible para avanzar incluso en días de baja energía.',
        ],
        chips: ['micro hábitos · rutina diaria'],
      },
      {
        title: 'Hazlo a tu medida 🧩',
        badge: 'FLEXIBLE',
        bullets: [
          'Editás, cambiás o descartás tareas; ajustás modo y avatar según cómo estés hoy.',
          'La IA propone y vos decidís: el plan se adapta a tu vida (no al revés).',
        ],
        chips: ['hábitos flexibles · personalización'],
      },
      {
        title: 'Retrospectiva diaria + progreso visible 📅📈',
        badge: 'PROGRESO SEMANAL',
        bullets: [
          'Completás microacciones y registrás tu emoción/estado en minutos (simple y realista).',
          'Ves progreso semana a semana y recibís sugerencias para sostener constancia sin saturarte.',
        ],
        chips: ['seguimiento de hábitos · mood tracking'],
      },
    ],
  },
  en: {
    eyebrow: 'Premium Scroll Timeline',
    title: 'How Innerbloom works',
    subtitle: 'A guided system to turn “I want to feel better” into real habits in your day-to-day.',
    closingLine: 'Innerbloom combines habit tracking with mood tracking to build consistency through a realistic plan.',
    steps: [
      {
        title: 'You start your journey ✨',
        badge: 'PERSONALIZED ONBOARDING',
        bullets: [
          'You choose your play mode and answer a few questions about energy, priorities, and your current moment (2–3 min).',
          'Innerbloom understands what you are looking for and builds a clear starting point so you can begin with focus (without pressure).',
        ],
        chips: ['onboarding · daily energy'],
      },
      {
        title: 'Your first balanced plan ⚖️',
        badge: 'BALANCED PLAN',
        bullets: [
          'You receive a plan organized across Body, Mind, and Soul, with realistic micro-habits.',
          'You get a simple, sustainable routine to keep moving forward even on low-energy days.',
        ],
        chips: ['micro-habits · daily routine'],
      },
      {
        title: 'Make it your own 🧩',
        badge: 'FLEXIBLE',
        bullets: [
          'You edit, swap, or remove tasks; you adjust your mode and avatar based on how you feel today.',
          'AI suggests and you decide: the plan adapts to your life (not the other way around).',
        ],
        chips: ['flexible habits · personalization'],
      },
      {
        title: 'Daily reflection + visible progress 📅📈',
        badge: 'WEEKLY PROGRESS',
        bullets: [
          'You complete micro-habits and log your emotion/state in minutes (simple and realistic).',
          'You see weekly progress and get suggestions to sustain consistency without overload.',
        ],
        chips: ['habit tracking · mood tracking'],
      },
    ],
  },
};

export default function PremiumTimelineDemoPage() {
  const [language, setLanguage] = useState<Language>('es');
  const copy = useMemo(() => TIMELINE_COPY[language], [language]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3358_0%,_#081423_45%,_#04070f_100%)] py-10">
      <div className="mx-auto w-full max-w-6xl px-4 text-center text-white sm:px-6">
        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage('es')}
            className={[
              'rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition',
              language === 'es' ? 'border-white/70 bg-white/20 text-white' : 'border-white/25 bg-white/5 text-white/70 hover:bg-white/10',
            ].join(' ')}
          >
            ES
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={[
              'rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition',
              language === 'en' ? 'border-white/70 bg-white/20 text-white' : 'border-white/25 bg-white/5 text-white/70 hover:bg-white/10',
            ].join(' ')}
          >
            EN
          </button>
        </div>
        <p className="text-sm uppercase tracking-[0.18em] text-white/65">{copy.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{copy.title}</h1>
        <p className="mx-auto mt-4 max-w-3xl text-base text-slate-200/85 sm:text-xl">{copy.subtitle}</p>
      </div>

      <PremiumTimeline steps={copy.steps} closingLine={copy.closingLine} className="mt-10" />
    </main>
  );
}
