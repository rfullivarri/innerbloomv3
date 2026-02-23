import { useMemo, useState } from 'react';
import PremiumTimeline, { type TimelineStep } from '../components/PremiumTimeline';

type Language = 'es' | 'en';

const TIMELINE_COPY: Record<Language, { eyebrow: string; title: string; subtitle: string; steps: TimelineStep[] }> = {
  es: {
    eyebrow: 'Premium Scroll Timeline',
    title: 'Cómo funciona Innerbloom',
    subtitle: 'Un sistema guiado para pasar de “quiero estar mejor” a hábitos reales en tu día a día.',
    steps: [
      {
        title: 'Comienzas con un diagnóstico breve',
        description:
          'Qué haces: respondes unas preguntas sobre energía, prioridades y momento actual (2–3 min). Qué obtienes: un punto de partida claro + tu primer plan personalizado.',
        badge: '2–3 min',
        chips: ['Check-in inicial', 'Energía y prioridades', 'Plan personalizado'],
      },
      {
        title: 'Recibes un plan en 3 pilares',
        description:
          'Qué haces: revisas tareas sugeridas en Cuerpo, Mente y Alma. Qué obtienes: una rutina equilibrada, concreta y fácil de sostener.',
        badge: '3 pilares',
        chips: ['Cuerpo · Mente · Alma', 'Rutina equilibrada', 'Acciones concretas'],
      },
      {
        title: 'Lo adaptas a tu realidad',
        description:
          'Qué haces: editas, cambias o descartas tareas; eliges modo y avatar según cómo estés hoy. Qué obtienes: un plan realmente tuyo (la IA propone, tú decides).',
        badge: 'Flexible',
        chips: ['Editar tareas', 'Modo y avatar', 'Tú decides'],
      },
      {
        title: 'Lo aplicas en pocos minutos al día',
        description:
          'Qué haces: completas microacciones diarias (3–5 min) con enfoque simple y realista. Qué obtienes: constancia sin saturarte y progreso visible semana a semana.',
        badge: '3–5 min/día',
        chips: ['Microacciones', 'Constancia', 'Progreso semanal'],
      },
      {
        title: 'Registras cómo te sientes y recalibras',
        description:
          'Qué haces: registras tu emoción y estado diario en segundos. Qué obtienes: recomendaciones ajustadas a tu momento + continuidad del proceso.',
        badge: 'Recalibración',
        chips: ['Registro emocional', 'Ajuste inteligente', 'Continuidad'],
      },
    ],
  },
  en: {
    eyebrow: 'Premium Scroll Timeline',
    title: 'How Innerbloom works',
    subtitle: 'A guided system to turn “I want to feel better” into real habits in your day-to-day.',
    steps: [
      {
        title: 'You begin with a brief check-in',
        description:
          'What you do: answer a few questions about energy, priorities, and your current moment (2–3 min). What you get: a clear starting point + your first personalized plan.',
        badge: '2–3 min',
        chips: ['Initial check-in', 'Energy & priorities', 'Personalized plan'],
      },
      {
        title: 'You receive a 3-pillar plan',
        description:
          'What you do: review suggested tasks across Body, Mind, and Soul. What you get: a balanced routine that is concrete and easy to sustain.',
        badge: '3 pillars',
        chips: ['Body · Mind · Soul', 'Balanced routine', 'Concrete actions'],
      },
      {
        title: 'You adapt it to your reality',
        description:
          'What you do: edit, swap, or discard tasks; choose a mode and avatar based on how you feel today. What you get: a plan that is truly yours (AI suggests, you decide).',
        badge: 'Flexible',
        chips: ['Edit tasks', 'Mode & avatar', 'You decide'],
      },
      {
        title: 'You apply it in just minutes a day',
        description:
          'What you do: complete daily micro-actions (3–5 min) with a simple, realistic focus. What you get: consistency without overload and visible week-by-week progress.',
        badge: '3–5 min/day',
        chips: ['Micro-actions', 'Consistency', 'Weekly progress'],
      },
      {
        title: 'You track how you feel and recalibrate',
        description:
          'What you do: log your emotion and daily state in seconds. What you get: recommendations adapted to your current moment + continuity in the process.',
        badge: 'Recalibration',
        chips: ['Emotion tracking', 'Adaptive guidance', 'Continuity'],
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

      <PremiumTimeline steps={copy.steps} className="mt-10" />
    </main>
  );
}
