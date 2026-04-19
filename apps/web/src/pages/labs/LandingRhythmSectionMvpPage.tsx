import { Link } from 'react-router-dom';
import { BrandWordmark } from '../../components/layout/BrandWordmark';
import { LabsWeeklyRhythmSystemSection } from '../../components/labs/LabsWeeklyRhythmSystemSection';
import { OFFICIAL_DESIGN_TOKENS } from '../../content/officialDesignTokens';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';

const CONTEXT_BLOCKS = {
  before: {
    kicker: 'Context before',
    title: 'Why adaptive planning matters',
    body: 'Most people do not fail because they lack discipline. They fail because their plan ignores weekly fluctuations in energy, time, and mental bandwidth.',
  },
  after: {
    kicker: 'Context after',
    title: 'How rhythm turns into execution',
    body: 'Once your rhythm is defined, Innerbloom translates weekly intensity into realistic tasks, reminders, and progression checks that can evolve over time.',
  },
};

function ContextPreviewCard({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <section className="rounded-[1.75rem] border border-white/12 bg-[linear-gradient(148deg,rgba(255,255,255,0.085),rgba(167,123,245,0.065)_52%,rgba(72,43,126,0.05))] p-6 shadow-[0_18px_40px_rgba(24,12,52,0.2),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-lg md:p-7">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/64">{kicker}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white md:text-[1.75rem]">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 md:text-base">{body}</p>
    </section>
  );
}

export default function LandingRhythmSectionMvpPage() {
  const { language } = usePostLoginLanguage();
  const purpleAfternoon = OFFICIAL_DESIGN_TOKENS.gradients.find((gradient) => gradient.name === 'purple_afternoon');
  const landingBackground = purpleAfternoon
    ? {
        backgroundImage: `linear-gradient(${purpleAfternoon.angle}, ${purpleAfternoon.stops[0]}, ${purpleAfternoon.stops[1]})`,
      }
    : undefined;

  return (
    <main className="min-h-screen text-[color:var(--color-text)]" style={landingBackground}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:gap-10 md:px-6 md:py-10 lg:px-8 lg:py-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <BrandWordmark
            className="text-white/88"
            textClassName="text-[0.72rem] font-semibold tracking-[0.34em] text-white/72 md:text-xs"
            iconClassName="h-[1.65em]"
          />
          <div className="flex items-center gap-2">
            <Link
              to="/labs"
              className="rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/88 transition hover:bg-white/14"
            >
              Labs index
            </Link>
            <Link
              to="/"
              className="rounded-full border border-white/16 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/80 transition hover:bg-white/12"
            >
              Back to landing
            </Link>
          </div>
        </header>

        <section className="rounded-[1.75rem] border border-white/12 bg-black/10 p-5 shadow-[0_14px_32px_rgba(19,10,41,0.2)] backdrop-blur-md md:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-white/66">Landing section MVP · Experiment</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white md:text-[2.3rem]">
            Rhythm Section Narrative Test (Decoupled from Avatar Identity)
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 md:text-base">
            This lab page recreates a realistic landing flow: a short section before, the experimental rhythm module in-context,
            and a short section after. The goal is to evaluate clarity, hierarchy, and message continuity.
          </p>
        </section>

        <ContextPreviewCard {...CONTEXT_BLOCKS.before} />
        <LabsWeeklyRhythmSystemSection language={language} />
        <ContextPreviewCard {...CONTEXT_BLOCKS.after} />
      </div>
    </main>
  );
}
