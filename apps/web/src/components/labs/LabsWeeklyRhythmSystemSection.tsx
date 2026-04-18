const INNERBLOOM_PREMIUM_GRADIENT =
  'linear-gradient(90deg, rgba(164, 109, 255, 0.98) 0%, rgba(204, 141, 255, 0.97) 52%, rgba(246, 187, 164, 0.96) 100%)';

const RHYTHM_CARDS = [
  {
    id: 'low',
    name: 'LOW',
    frequency: '1× / week',
    micro: 'Lower load',
    pills: ['Core habits', 'Recovery', 'Simple wins'],
    intensity: 24,
    density: 'Minimal structure',
  },
  {
    id: 'chill',
    name: 'CHILL',
    frequency: '2× / week',
    micro: 'Steady pace',
    pills: ['Balanced', 'Light momentum', 'No overload'],
    intensity: 46,
    density: 'Balanced cadence',
  },
  {
    id: 'flow',
    name: 'FLOW',
    frequency: '3× / week',
    micro: 'Focused push',
    pills: ['Priority blocks', 'Execution', 'Momentum'],
    intensity: 72,
    density: 'Higher cadence',
  },
  {
    id: 'evolve',
    name: 'EVOLVE',
    frequency: '4× / week',
    micro: 'More structure',
    pills: ['Higher load', 'Guardrails', 'Progression'],
    intensity: 93,
    density: 'Structured intensity',
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
            Pick the intensity you can sustain this week
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
            Four weekly rhythm levels. Fast scan. Low to high load.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {RHYTHM_CARDS.map((card) => (
            <article
              key={card.id}
              className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-white/14 bg-[linear-gradient(168deg,rgba(255,255,255,0.085),rgba(15,12,34,0.26))] p-4 shadow-[0_14px_34px_rgba(17,10,37,0.22),inset_0_1px_0_rgba(255,255,255,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-white/20 md:p-5"
            >
              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.56),rgba(255,255,255,0))] opacity-70" />

              <div className="space-y-1">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/56">Rhythm</p>
                <h3 className="text-[1.55rem] font-semibold tracking-[-0.03em] text-white">{card.name}</h3>
                <p className="text-[0.73rem] font-semibold uppercase tracking-[0.16em] text-white/78">{card.frequency}</p>
              </div>

              <div className="space-y-2">
                <div className="overflow-hidden rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] p-[3px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]">
                  <div className="relative h-[0.68rem] rounded-full bg-[linear-gradient(180deg,rgba(18,22,59,0.8),rgba(13,16,42,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <div
                      className="absolute inset-y-[1px] left-[1px] rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_14px_rgba(201,150,255,0.42),0_0_26px_rgba(246,187,164,0.24)]"
                      style={{
                        width: `calc(${card.intensity}% - 2px)`,
                        backgroundImage: INNERBLOOM_PREMIUM_GRADIENT,
                      }}
                    >
                      <div className="h-full rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0)_75%)]" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[0.62rem] uppercase tracking-[0.16em] text-white/52">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-white/88">{card.micro}</p>
                <p className="text-[0.67rem] font-medium uppercase tracking-[0.14em] text-white/58">{card.density}</p>
              </div>

              <ul className="mt-auto flex flex-wrap gap-1.5">
                {card.pills.map((pill) => (
                  <li
                    key={pill}
                    className="rounded-full border border-white/12 bg-white/[0.09] px-2.5 py-1 text-[0.64rem] font-medium uppercase tracking-[0.05em] text-white/86"
                  >
                    {pill}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-white/66 md:text-sm">
          Rhythm = weekly intensity. No avatars, no mood storytelling.
        </p>
      </div>
    </section>
  );
}
