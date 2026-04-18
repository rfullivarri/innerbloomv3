import { Link } from 'react-router-dom';
import { BrandWordmark } from '../../components/layout/BrandWordmark';
import { OFFICIAL_DESIGN_TOKENS } from '../../content/officialDesignTokens';

const LAB_EXPERIMENTS = [
  {
    title: 'Landing Rhythm Section MVP',
    description: 'Experimental landing section focused on weekly rhythm intensity (decoupled from avatar identity).',
    href: '/labs/landing-rhythm-section',
  },
  {
    title: 'Demo Mode Select',
    description: 'Legacy labs route for selecting LOW / CHILL / FLOW / EVOLVE before opening demo.',
    href: '/labs/demo-mode-select',
  },
  {
    title: 'Logros Demo',
    description: 'Guided preview of the Achievements module for dashboard exploration.',
    href: '/labs/logros',
  },
];

export default function LabsIndexPage() {
  const purpleAfternoon = OFFICIAL_DESIGN_TOKENS.gradients.find((gradient) => gradient.name === 'purple_afternoon');
  const landingBackground = purpleAfternoon
    ? {
        backgroundImage: `linear-gradient(${purpleAfternoon.angle}, ${purpleAfternoon.stops[0]}, ${purpleAfternoon.stops[1]})`,
      }
    : undefined;

  return (
    <main className="min-h-screen text-[color:var(--color-text)]" style={landingBackground}>
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
        <header className="mb-6 rounded-[1.8rem] border border-white/14 bg-white/10 p-6 shadow-[0_20px_44px_rgba(21,11,45,0.22)] backdrop-blur-xl md:mb-8 md:p-7">
          <BrandWordmark
            className="text-white/88"
            textClassName="text-[0.72rem] font-semibold tracking-[0.34em] text-white/72 md:text-xs"
            iconClassName="h-[1.65em]"
          />
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white md:text-[2.2rem]">Innerbloom Labs</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/78 md:text-base">
            Internal experiments and concept validations. Use these routes to evaluate messaging, layout, and product narratives before official rollout.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {LAB_EXPERIMENTS.map((experiment) => (
            <Link
              key={experiment.href}
              to={experiment.href}
              className="group rounded-[1.35rem] border border-white/12 bg-[linear-gradient(158deg,rgba(255,255,255,0.09),rgba(15,12,34,0.22))] p-5 shadow-[0_14px_32px_rgba(18,10,39,0.2)] transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[linear-gradient(158deg,rgba(255,255,255,0.12),rgba(15,12,34,0.24))]"
            >
              <p className="text-[0.66rem] uppercase tracking-[0.18em] text-white/62">Experiment</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white group-hover:text-white">{experiment.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/78">{experiment.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
