const RHYTHM_CARDS = [
  {
    id: 'low',
    name: 'LOW',
    frequency: '1× / week',
    state: 'Low energy, overloaded, or returning after a break.',
    purpose: 'Rebuild your base with minimum load and protect consistency.',
    examples: ['2 core habits', 'Recovery priority', 'Simple wins'],
    intensity: 25,
  },
  {
    id: 'chill',
    name: 'CHILL',
    frequency: '2× / week',
    state: 'Stable enough to move, but still protecting bandwidth.',
    purpose: 'Keep momentum light with a realistic and steady pace.',
    examples: ['3–4 weekly actions', 'Balanced focus', 'No pressure spikes'],
    intensity: 45,
  },
  {
    id: 'flow',
    name: 'FLOW',
    frequency: '3× / week',
    state: 'Focused and ready for a sustainable push.',
    purpose: 'Drive meaningful progress while keeping your rhythm sustainable.',
    examples: ['Priority blocks', 'Focused execution', 'Weekly review'],
    intensity: 70,
  },
  {
    id: 'evolve',
    name: 'EVOLVE',
    frequency: '4× / week',
    state: 'High intent and ready for more structure this week.',
    purpose: 'Increase load with more structure while protecting balance.',
    examples: ['Structured plan', 'Higher load', 'Consistency guardrails'],
    intensity: 90,
  },
] as const;

export function LabsWeeklyRhythmSystemSection() {
  return (
    <section
      aria-labelledby="labs-weekly-rhythm-title"
      className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(152deg,rgba(255,255,255,0.11),rgba(167,123,245,0.09)_52%,rgba(72,43,126,0.08))] px-6 py-8 shadow-[0_28px_72px_rgba(24,12,52,0.26),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl md:px-9 md:py-10"
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[82%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(176,122,255,0.28),rgba(176,122,255,0.09)_52%,transparent_78%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_14%_20%,rgba(255,255,255,0.16),transparent_58%),radial-gradient(circle_at_84%_82%,rgba(186,161,255,0.1),transparent_58%)]" />

      <div className="relative space-y-7">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Weekly rhythm system</p>
          <h2 id="labs-weekly-rhythm-title" className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            Choose the weekly rhythm you can sustain today
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
            Your rhythm defines how intense your plan should feel this week — from rebuilding your base to moving forward with
            more structure and consistency.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {RHYTHM_CARDS.map((card) => (
            <article
              key={card.id}
              className="group flex h-full flex-col rounded-3xl border border-white/14 bg-[linear-gradient(168deg,rgba(255,255,255,0.08),rgba(15,12,34,0.22))] p-4 shadow-[0_14px_34px_rgba(17,10,37,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 md:p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/65">Rhythm</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white">{card.name}</h3>
                </div>
                <span className="rounded-full border border-white/16 bg-white/8 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/86">
                  {card.frequency}
                </span>
              </div>

              <div className="mb-4 rounded-2xl border border-white/10 bg-white/6 p-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white/60">Weekly load</p>
                <div className="mt-2 h-2 rounded-full bg-white/12">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(191,146,255,0.9),rgba(118,209,255,0.95))]" style={{ width: `${card.intensity}%` }} />
                </div>
              </div>

              <div className="space-y-3 text-sm text-white/84">
                <p>
                  <span className="font-medium text-white">State:</span> {card.state}
                </p>
                <p>
                  <span className="font-medium text-white">This week is for:</span> {card.purpose}
                </p>
              </div>

              <ul className="mt-4 flex flex-wrap gap-2">
                {card.examples.map((example) => (
                  <li
                    key={example}
                    className="rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[0.68rem] font-medium tracking-[0.01em] text-white/86"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-white/68 md:text-sm">
          Rhythm shapes your weekly plan intensity. Avatar identity belongs to a separate product layer.
        </p>
      </div>
    </section>
  );
}
