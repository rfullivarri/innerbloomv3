const INNERBLOOM_PREMIUM_GRADIENT =
  'linear-gradient(90deg, rgba(164, 109, 255, 0.98) 0%, rgba(204, 141, 255, 0.97) 52%, rgba(246, 187, 164, 0.96) 100%)';

const RHYTHM_CARDS = [
  {
    id: 'low',
    name: 'LOW',
    frequency: '1× / week',
    micro: 'Lower load',
    intensity: 26,
    chips: ['BASE REBUILD', 'LIGHTEST LOAD'],
  },
  {
    id: 'chill',
    name: 'CHILL',
    frequency: '2× / week',
    micro: 'Steady pace',
    intensity: 48,
    chips: ['STEADY CONSISTENCY', 'LIGHT CADENCE'],
  },
  {
    id: 'flow',
    name: 'FLOW',
    frequency: '3× / week',
    micro: 'Focused push',
    intensity: 72,
    chips: ['CLEAR DIRECTION', 'SUSTAINABLE PUSH'],
  },
  {
    id: 'evolve',
    name: 'EVOLVE',
    frequency: '4× / week',
    micro: 'More structure',
    intensity: 92,
    chips: ['HIGHER STRUCTURE', 'MORE INTENSITY'],
  },
] as const;

export function LabsWeeklyRhythmSystemSection() {
  return (
    <section
      aria-labelledby="labs-weekly-rhythm-title"
      className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[linear-gradient(152deg,rgba(255,255,255,0.11),rgba(167,123,245,0.09)_52%,rgba(72,43,126,0.08))] px-6 py-8 shadow-[0_28px_72px_rgba(24,12,52,0.26),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl md:px-9 md:py-10"
    >
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[82%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(176,122,255,0.24),rgba(176,122,255,0.06)_52%,transparent_78%)] blur-2xl" />

      <div className="relative space-y-7">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Weekly rhythm system</p>
          <h2 id="labs-weekly-rhythm-title" className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            Pick the intensity you can sustain
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
            Four rhythms, one weekly logic.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {RHYTHM_CARDS.map((card) => (
            <article
              key={card.id}
              className="group relative flex h-full flex-col gap-5 rounded-3xl border border-white/14 bg-[linear-gradient(168deg,rgba(255,255,255,0.08),rgba(15,12,34,0.22))] p-5 shadow-[0_14px_34px_rgba(17,10,37,0.2),inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/56">Rhythm</p>
                  <h3 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-white">{card.name}</h3>
                </div>
                <span className="inline-flex items-center rounded-full border border-[#f0ddff]/28 bg-[linear-gradient(140deg,rgba(206,146,255,0.28),rgba(255,255,255,0.08))] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#f3e6ff] shadow-[0_6px_16px_rgba(162,96,245,0.24)]">
                  {card.frequency}
                </span>
              </div>

              <div
                className="h-[1.14rem] overflow-hidden rounded-full bg-white/[0.07]"
                aria-label={`${card.name} intensity ${card.intensity}%`}
              >
                <div
                  className="h-full rounded-full shadow-[0_0_16px_rgba(201,150,255,0.36)]"
                  style={{ width: `${card.intensity}%`, backgroundImage: INNERBLOOM_PREMIUM_GRADIENT }}
                />
              </div>

              <p className="text-sm font-medium text-white/90">{card.micro}</p>

              <ul className="mt-auto flex flex-wrap gap-1.5">
                {card.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-[#f0ddff]/16 bg-[linear-gradient(140deg,rgba(177,121,255,0.2),rgba(255,255,255,0.06))] px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[#f2e4ff]"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-white/66 md:text-sm">Rhythm = weekly intensity linked to sustainable frequency.</p>
      </div>
    </section>
  );
}
