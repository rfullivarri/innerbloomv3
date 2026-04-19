const INNERBLOOM_PREMIUM_GRADIENT =
  'linear-gradient(90deg, rgba(164, 109, 255, 0.98) 0%, rgba(204, 141, 255, 0.97) 52%, rgba(246, 187, 164, 0.96) 100%)';

const RHYTHM_CARDS = [
  {
    id: 'low',
    name: 'LOW',
    frequency: '1× / week',
    state: 'low energy, overwhelmed',
    micro: 'Lower load',
    intensity: 26,
    chips: ['BASE REBUILD', 'LIGHTEST LOAD'],
  },
  {
    id: 'chill',
    name: 'CHILL',
    frequency: '2× / week',
    state: 'relaxed and stable',
    micro: 'Steady pace',
    intensity: 48,
    chips: ['STEADY CONSISTENCY', 'LIGHT CADENCE'],
  },
  {
    id: 'flow',
    name: 'FLOW',
    frequency: '3× / week',
    state: 'focused and moving',
    micro: 'Focused push',
    intensity: 72,
    chips: ['CLEAR DIRECTION', 'SUSTAINABLE PUSH'],
  },
  {
    id: 'evolve',
    name: 'EVOLVE',
    frequency: '4× / week',
    state: 'ambitious and determined',
    micro: 'More structure',
    intensity: 92,
    chips: ['HIGHER STRUCTURE', 'MORE INTENSITY'],
  },
] as const;

export function LabsWeeklyRhythmSystemSection() {
  return (
    <section aria-labelledby="labs-weekly-rhythm-title" className="relative py-2">
      <div className="pointer-events-none absolute -top-12 left-1/2 h-36 w-[80%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(176,122,255,0.24),rgba(176,122,255,0.06)_52%,transparent_78%)] blur-2xl" />

      <div className="relative space-y-8">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Weekly rhythm system</p>
          <h2 id="labs-weekly-rhythm-title" className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">
            Pick the intensity you can sustain
          </h2>
          <p className="text-sm leading-relaxed text-white/84 md:text-base">
            Four rhythms, one weekly logic. <span className="text-white/72">Rhythm = weekly intensity linked to sustainable frequency.</span>
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {RHYTHM_CARDS.map((card) => (
            <article
              key={card.id}
              className="group relative flex min-h-[20.5rem] h-full flex-col gap-5 rounded-3xl bg-[linear-gradient(168deg,rgba(255,255,255,0.09),rgba(15,12,34,0.26))] p-5 shadow-[0_16px_36px_rgba(17,10,37,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(17,10,37,0.3),inset_0_1px_0_rgba(255,255,255,0.14)]"
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/56">Rhythm</p>
                  <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                    <h3 className="text-[1.65rem] font-semibold tracking-[-0.03em] text-white">{card.name}</h3>
                    <span className="inline-flex items-center rounded-full bg-[linear-gradient(140deg,rgba(208,154,255,0.42),rgba(244,192,177,0.3))] px-3.5 py-1.5 text-[0.74rem] font-semibold uppercase tracking-[0.14em] text-[#fff6ff] shadow-[0_8px_20px_rgba(176,108,255,0.32)]">
                      {card.frequency}
                    </span>
                  </div>
                </div>

                <div
                  className="h-[1.2rem] overflow-hidden rounded-full bg-white/[0.08]"
                  aria-label={`${card.name} intensity ${card.intensity}%`}
                >
                  <div
                    className="h-full rounded-full shadow-[0_0_16px_rgba(201,150,255,0.36)]"
                    style={{ width: `${card.intensity}%`, backgroundImage: INNERBLOOM_PREMIUM_GRADIENT }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm text-white/74">{card.state}</p>
                <p className="text-base font-medium text-white/94">{card.micro}</p>
              </div>

              <ul className="mt-auto flex flex-wrap gap-1.5">
                {card.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full bg-[linear-gradient(140deg,rgba(177,121,255,0.24),rgba(255,255,255,0.08))] px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-[#f2e4ff]"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
