import PremiumTimeline, { type TimelineStep } from '../components/PremiumTimeline';

const TIMELINE_STEPS: TimelineStep[] = [
  {
    title: 'Discovery estratégica',
    description: 'Exploramos tu contexto, objetivos y ritmo para diseñar una base accionable desde el día uno.',
    badge: '2–3 min',
  },
  {
    title: 'Plan en 3 pilares',
    description: 'Recibes un sistema equilibrado entre cuerpo, mente y enfoque con tareas simples y medibles.',
    badge: 'Personalizado',
  },
  {
    title: 'Adaptación dinámica',
    description: 'El timeline se reajusta según tu progreso real para mantener consistencia sin saturarte.',
    badge: '2x por semana',
  },
  {
    title: 'Aplicación diaria guiada',
    description: 'Cada bloque se convierte en micro-hábitos claros para sostener momentum y claridad mental.',
    badge: '5 min / día',
  },
  {
    title: 'Revisión y evolución',
    description: 'Evaluamos resultados y afinamos el plan continuamente para acompañar tu siguiente nivel.',
    badge: 'Ciclo continuo',
  },
];

export default function PremiumTimelineDemoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3358_0%,_#081423_45%,_#04070f_100%)] py-10">
      <div className="mx-auto w-full max-w-6xl px-4 text-center text-white sm:px-6">
        <p className="text-sm uppercase tracking-[0.18em] text-white/65">Premium Scroll Timeline</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Cómo funciona Innerbloom</h1>
        <p className="mx-auto mt-4 max-w-3xl text-base text-slate-200/85 sm:text-xl">
          Una narrativa visual guiada por scroll con línea vectorial animada y tarjetas glassmorphism.
        </p>
      </div>

      <PremiumTimeline steps={TIMELINE_STEPS} className="mt-10" />
    </main>
  );
}
