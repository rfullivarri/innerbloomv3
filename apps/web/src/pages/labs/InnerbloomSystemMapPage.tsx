import { OFFICIAL_DESIGN_TOKENS } from '../../content/officialDesignTokens';

const INPUTS = [
  {
    title: 'User decisions',
    description: 'Onboarding answers · selected rhythm · goals · pillars',
  },
  {
    title: 'Real progress',
    description: 'Completed tasks · GP · streaks · weekly consistency',
  },
  {
    title: 'State signals',
    description: 'Energy · emotion check-ins · friction · task history',
  },
];

const OUTPUTS = [
  {
    title: 'Next best step',
    description: 'What to do next',
  },
  {
    title: 'Right intensity',
    description: 'When to increase or lower rhythm',
  },
  {
    title: 'Sustainable tasks',
    description: 'Tasks that match current capacity',
  },
  {
    title: 'Achieved habits',
    description: 'Habits that become part of the user’s life',
  },
];

const ENGINES = [
  {
    title: 'Journey Setup Engine',
    description: 'Creates your first sustainable habit base from your onboarding decisions.',
  },
  {
    title: 'Weekly Progress Loop',
    description: 'Turns completed tasks, GP, streaks, and check-ins into progress signals.',
  },
  {
    title: 'Growth Calibration Engine',
    description: 'Adjusts difficulty and rhythm when your consistency changes.',
    subNode: 'Rhythm Upgrade Engine: Suggests a higher rhythm when your progress is solid.',
  },
  {
    title: 'Habit Achievement Engine',
    description: 'Detects when a task becomes a consolidated habit.',
  },
];

export default function InnerbloomSystemMapPage() {
  const purpleAfternoon = OFFICIAL_DESIGN_TOKENS.gradients.find((gradient) => gradient.name === 'purple_afternoon');
  const pageBackground = purpleAfternoon
    ? {
        backgroundImage: `linear-gradient(${purpleAfternoon.angle}, ${purpleAfternoon.stops[0]}, ${purpleAfternoon.stops[1]})`,
      }
    : undefined;

  return (
    <main className="min-h-screen px-4 py-8 text-[color:var(--color-text)] md:px-6 md:py-12" style={pageBackground}>
      <section className="mx-auto w-full max-w-7xl rounded-[2rem] border border-white/14 bg-white/10 p-6 shadow-[0_24px_50px_rgba(25,14,51,0.28)] backdrop-blur-xl md:p-10">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Innerbloom System Map</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white md:text-[2.4rem]">How Innerbloom adapts to your progress</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/82 md:text-base">
            Innerbloom uses your decisions and real progress to decide when to increase intensity, when to lower it,
            and what your next step should be.
          </p>
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1.7fr_1fr]">
          <aside aria-labelledby="inputs-heading" className="rounded-3xl bg-white/8 p-4 backdrop-blur-md md:p-5">
            <h2 id="inputs-heading" className="text-lg font-semibold text-white">Inputs</h2>
            <ul className="mt-4 space-y-3">
              {INPUTS.map((item) => (
                <li key={item.title} className="rounded-2xl bg-white/12 p-3">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/78 md:text-sm">{item.description}</p>
                </li>
              ))}
            </ul>
          </aside>

          <section aria-labelledby="diagram-heading" className="relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.24),rgba(255,255,255,0.06)_58%,rgba(14,10,35,0.2)_100%)] p-4 md:p-8">
            <h2 id="diagram-heading" className="sr-only">Innerbloom adaptive system diagram</h2>
            <div className="pointer-events-none absolute inset-[10%] rounded-full border border-white/20" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/14" aria-hidden="true" />

            <div className="relative mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
              {ENGINES.map((engine) => (
                <article key={engine.title} className="rounded-2xl border border-white/16 bg-white/14 p-4 shadow-[0_12px_22px_rgba(21,11,45,0.2)]">
                  <h3 className="text-sm font-semibold text-white md:text-base">{engine.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/82 md:text-sm">{engine.description}</p>
                  {engine.subNode ? (
                    <p className="mt-2 rounded-xl bg-white/14 px-2.5 py-2 text-[0.69rem] leading-relaxed text-white/80 md:text-xs">{engine.subNode}</p>
                  ) : null}
                </article>
              ))}
            </div>

            <div className="relative z-10 mx-auto mt-5 flex h-44 w-44 items-center justify-center rounded-full border border-white/30 bg-[linear-gradient(150deg,rgba(255,255,255,0.34),rgba(255,255,255,0.14))] text-center shadow-[0_16px_30px_rgba(25,13,52,0.3)] md:-mt-44 md:h-56 md:w-56 animate-pulse">
              <div>
                <p className="text-sm font-semibold tracking-[0.18em] text-white">INNERBLOOM</p>
                <p className="mt-2 text-xs leading-relaxed text-white/84 md:text-sm">Adaptive Habit System</p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs font-medium tracking-[0.08em] text-white/85 md:text-sm">
              Decisions → Progress → Analysis → Adjustment → Next step
            </p>
          </section>

          <aside aria-labelledby="outputs-heading" className="rounded-3xl bg-white/8 p-4 backdrop-blur-md md:p-5">
            <h2 id="outputs-heading" className="text-lg font-semibold text-white">Outputs</h2>
            <ul className="mt-4 space-y-3">
              {OUTPUTS.map((item) => (
                <li key={item.title} className="rounded-2xl bg-white/12 p-3">
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/78 md:text-sm">{item.description}</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        <section className="mt-8 rounded-3xl border border-white/16 bg-white/12 p-5 text-center md:p-7">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-white">Not a tracker. A system that adapts to your progress.</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-white/82 md:text-base">
            A tracker shows what you did. Innerbloom uses your progress to decide what should happen next.
          </p>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-white/72 md:text-base">
            Un tracker registra comportamiento. Innerbloom usa tu progreso para adaptar el sistema.
          </p>
        </section>
      </section>
    </main>
  );
}
