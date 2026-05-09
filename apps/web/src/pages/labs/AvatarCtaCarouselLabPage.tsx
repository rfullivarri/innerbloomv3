import { Link } from 'react-router-dom';
import { BrandWordmark } from '../../components/layout/BrandWordmark';

type AvatarCard = {
  name: string;
  state: string;
  caption: string;
  gradient: string;
  body: string;
  face: string;
  accent: string;
  shape: 'axolotl' | 'owl' | 'cat' | 'bear';
};

const AVATAR_CARDS: AvatarCard[] = [
  {
    name: 'Anfibio',
    state: 'Enfoque',
    caption: 'Cuando tenés claridad para avanzar.',
    gradient: 'from-sky-300 via-cyan-200 to-blue-400',
    body: 'bg-cyan-200',
    face: 'text-sky-950',
    accent: 'bg-sky-400',
    shape: 'axolotl',
  },
  {
    name: 'Búho',
    state: 'Calma',
    caption: 'Cuando necesitás sostener sin presión.',
    gradient: 'from-violet-300 via-purple-300 to-indigo-500',
    body: 'bg-violet-500',
    face: 'text-violet-950',
    accent: 'bg-violet-300',
    shape: 'owl',
  },
  {
    name: 'Gato',
    state: 'Descanso',
    caption: 'Cuando tu energía pide bajar el ritmo.',
    gradient: 'from-rose-300 via-orange-200 to-red-500',
    body: 'bg-red-500',
    face: 'text-red-950',
    accent: 'bg-red-300',
    shape: 'cat',
  },
  {
    name: 'Oso',
    state: 'Alegría',
    caption: 'Cuando hay impulso y ganas de moverte.',
    gradient: 'from-lime-300 via-emerald-200 to-green-500',
    body: 'bg-lime-400',
    face: 'text-green-950',
    accent: 'bg-lime-200',
    shape: 'bear',
  },
];

export default function AvatarCtaCarouselLabPage() {
  return (
    <main className="min-h-screen bg-[#070714] text-white">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_76%_12%,rgba(139,92,246,0.22),transparent_34%),linear-gradient(180deg,#fbf9ff_0%,#edf3ff_100%)] px-4 py-8 text-[#191726] md:px-8 md:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(circle_at_28%_80%,rgba(111,193,255,0.25),transparent_28%),radial-gradient(circle_at_78%_68%,rgba(190,133,255,0.18),transparent_30%)]" />
        <div className="pointer-events-none absolute -left-20 top-20 h-24 w-[46rem] rotate-[-18deg] rounded-full bg-violet-300/10 blur-xl" />
        <div className="pointer-events-none absolute right-0 top-44 h-28 w-[54rem] rotate-[-20deg] rounded-full bg-sky-300/14 blur-xl" />
        <LabShell theme="light" />
      </section>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_76%_15%,rgba(124,58,237,0.34),transparent_34%),radial-gradient(circle_at_35%_85%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(180deg,#050711_0%,#101827_100%)] px-4 py-8 md:px-8 md:py-12">
        <div className="pointer-events-none absolute -left-24 top-24 h-24 w-[50rem] rotate-[-18deg] rounded-full bg-violet-200/8 blur-xl" />
        <div className="pointer-events-none absolute right-[-10rem] top-48 h-28 w-[54rem] rotate-[-20deg] rounded-full bg-cyan-300/8 blur-xl" />
        <LabShell theme="dark" />
      </section>
    </main>
  );
}

function LabShell({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';

  return (
    <div
      className={[
        'relative mx-auto grid min-h-[720px] w-full max-w-7xl items-center gap-10 rounded-[2.2rem] border px-5 py-8 shadow-[0_34px_90px_rgba(23,16,51,0.22)] backdrop-blur-xl md:grid-cols-[0.9fr_1.1fr] md:px-12 md:py-12 lg:px-16',
        isDark
          ? 'border-white/10 bg-white/[0.035] text-white'
          : 'border-white/70 bg-white/45 text-[#191726]',
      ].join(' ')}
    >
      <div className="absolute left-6 top-6 md:left-10 md:top-8">
        <BrandWordmark
          className={isDark ? 'text-white/90' : 'text-[#1f1c31]'}
          textClassName={[
            'text-[0.62rem] font-semibold tracking-[0.34em] md:text-[0.72rem]',
            isDark ? 'text-white/72' : 'text-[#272337]/72',
          ].join(' ')}
          iconClassName="h-[1.65em]"
        />
      </div>

      <div className="relative z-10 pt-20 md:pt-10">
        <p className={['mb-4 text-xs font-semibold uppercase tracking-[0.24em]', isDark ? 'text-violet-200/70' : 'text-violet-600/70'].join(' ')}>
          Avatar adaptive entry
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-[0.96] tracking-[-0.055em] md:text-6xl lg:text-7xl">
          Tu plan debería{' '}
          <span className="bg-[linear-gradient(100deg,#8b5cf6_0%,#c084fc_48%,#f6a8a8_100%)] bg-clip-text text-transparent">
            cambiar con vos.
          </span>
        </h1>
        <p className={['mt-6 max-w-xl text-base leading-8 md:text-xl', isDark ? 'text-white/68' : 'text-[#4f4a64]/82'].join(' ')}>
          Elegí cómo estás hoy. Innerbloom ajusta el ritmo, la dificultad y el próximo paso para que tus hábitos avancen sin forzarte.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/onboarding"
            className="inline-flex items-center justify-center rounded-full bg-[#8b5cf6] px-7 py-4 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(139,92,246,0.34)] transition hover:-translate-y-0.5 hover:bg-[#7c3aed]"
          >
            Crear mi plan adaptativo
          </Link>
          <Link
            to="/demo-mode-select"
            className={[
              'inline-flex items-center justify-center rounded-full border px-7 py-4 text-sm font-semibold transition hover:-translate-y-0.5',
              isDark ? 'border-white/18 bg-white/5 text-white hover:bg-white/10' : 'border-violet-200 bg-white/70 text-[#31284c] hover:bg-white',
            ].join(' ')}
          >
            Ver demo
          </Link>
        </div>

        <p className={['mt-4 text-sm', isDark ? 'text-white/48' : 'text-[#5f5873]/72'].join(' ')}>
          Ritmo adaptable · progreso visible · cero presión de racha perfecta
        </p>
      </div>

      <div className="relative z-10 min-h-[560px] md:min-h-[650px]">
        <div className="absolute left-1/2 top-1/2 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute inset-x-0 bottom-5 mx-auto h-24 w-[80%] rounded-full bg-black/20 blur-3xl" />

        <div className="absolute left-[8%] top-[12%] rotate-[-9deg] opacity-90 md:left-[4%] md:top-[18%]">
          <AvatarCardView avatar={AVATAR_CARDS[2]} theme={theme} size="secondary" />
        </div>
        <div className="absolute right-[2%] top-[10%] rotate-[8deg] opacity-95 md:right-[0%] md:top-[16%]">
          <AvatarCardView avatar={AVATAR_CARDS[1]} theme={theme} size="secondary" />
        </div>
        <div className="absolute bottom-[6%] right-[8%] rotate-[9deg] opacity-95 md:right-[2%]">
          <AvatarCardView avatar={AVATAR_CARDS[3]} theme={theme} size="secondary" />
        </div>
        <div className="absolute left-1/2 top-[6%] z-20 -translate-x-1/2 rotate-[-2deg] md:top-[8%]">
          <AvatarCardView avatar={AVATAR_CARDS[0]} theme={theme} size="primary" />
        </div>

        <div className="absolute bottom-1 left-1/2 z-30 flex -translate-x-1/2 gap-2">
          {AVATAR_CARDS.map((avatar, index) => (
            <span
              key={avatar.name}
              className={[
                'h-2.5 rounded-full transition-all',
                index === 0 ? 'w-8 bg-[#8b5cf6]' : isDark ? 'w-2.5 bg-white/24' : 'w-2.5 bg-[#8f83aa]/40',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AvatarCardView({
  avatar,
  theme,
  size,
}: {
  avatar: AvatarCard;
  theme: 'light' | 'dark';
  size: 'primary' | 'secondary';
}) {
  const isPrimary = size === 'primary';
  const isDark = theme === 'dark';

  return (
    <article
      className={[
        'overflow-hidden rounded-[2rem] border shadow-[0_28px_70px_rgba(10,8,28,0.34)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1',
        isPrimary ? 'w-[18.5rem] md:w-[21.5rem]' : 'w-[13.5rem] md:w-[16rem]',
        isDark ? 'border-white/14 bg-[#111528]/92' : 'border-white/80 bg-white/86',
      ].join(' ')}
    >
      <div className={['m-3 overflow-hidden rounded-[1.45rem] bg-gradient-to-br p-[1px]', avatar.gradient].join(' ')}>
        <div className="overflow-hidden rounded-[1.4rem]">
          <AvatarIllustration avatar={avatar} isPrimary={isPrimary} />
        </div>
      </div>

      <div className={isPrimary ? 'px-5 pb-5 pt-1' : 'px-4 pb-4 pt-0'}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className={['font-semibold tracking-[-0.03em]', isPrimary ? 'text-2xl' : 'text-lg', isDark ? 'text-white' : 'text-[#211d31]'].join(' ')}>
            {avatar.name}
          </h2>
          <p className={['shrink-0 text-sm font-semibold', isDark ? 'text-violet-200/80' : 'text-violet-600/78'].join(' ')}>
            {avatar.state}
          </p>
        </div>
        <p className={['mt-2 leading-relaxed', isPrimary ? 'text-sm' : 'text-xs', isDark ? 'text-white/58' : 'text-[#5d5770]/78'].join(' ')}>
          {avatar.caption}
        </p>
      </div>
    </article>
  );
}

function AvatarIllustration({ avatar, isPrimary }: { avatar: AvatarCard; isPrimary: boolean }) {
  return (
    <div className={['relative flex items-end justify-center overflow-hidden bg-gradient-to-br', avatar.gradient, isPrimary ? 'h-[22rem] md:h-[25rem]' : 'h-[16rem] md:h-[18.5rem]'].join(' ')}>
      <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.72),transparent_18%),radial-gradient(circle_at_72%_70%,rgba(255,255,255,0.24),transparent_22%)]" />
      <div className="absolute -left-10 top-12 h-10 w-72 rotate-[-18deg] rounded-full bg-white/18 blur-md" />
      <div className="absolute right-[-4rem] top-28 h-12 w-80 rotate-[-22deg] rounded-full bg-white/14 blur-md" />
      <div className="absolute right-5 top-12 h-8 w-8 rotate-45 rounded-[0.55rem] bg-white/50 shadow-[0_0_22px_rgba(255,255,255,0.52)]" />

      <div className={['relative mb-7 flex flex-col items-center drop-shadow-[0_20px_28px_rgba(0,0,0,0.22)]', isPrimary ? 'scale-100' : 'scale-[0.78]'].join(' ')}>
        {avatar.shape === 'owl' ? <OwlAvatar avatar={avatar} /> : null}
        {avatar.shape === 'cat' ? <CatAvatar avatar={avatar} /> : null}
        {avatar.shape === 'bear' ? <BearAvatar avatar={avatar} /> : null}
        {avatar.shape === 'axolotl' ? <AxolotlAvatar avatar={avatar} /> : null}
      </div>
    </div>
  );
}

function AxolotlAvatar({ avatar }: { avatar: AvatarCard }) {
  return (
    <div className="relative h-64 w-56">
      <span className={[avatar.body, 'absolute left-10 top-12 h-36 w-36 rounded-[48%] shadow-inner'].join(' ')} />
      <span className={[avatar.body, 'absolute left-[4.2rem] top-[11.2rem] h-28 w-24 rounded-full shadow-inner'].join(' ')} />
      {[-18, 0, 18].map((angle, index) => (
        <span key={`left-${angle}`} className={[avatar.body, 'absolute left-0 top-16 h-16 w-8 origin-bottom rounded-full'].join(' ')} style={{ transform: `rotate(${angle - 38}deg) translateY(${index * 7}px)` }} />
      ))}
      {[-18, 0, 18].map((angle, index) => (
        <span key={`right-${angle}`} className={[avatar.body, 'absolute right-0 top-16 h-16 w-8 origin-bottom rounded-full'].join(' ')} style={{ transform: `rotate(${38 - angle}deg) translateY(${index * 7}px)` }} />
      ))}
      <span className={[avatar.body, 'absolute left-[5.4rem] top-2 h-16 w-8 rotate-[-12deg] rounded-full'].join(' ')} />
      <span className="absolute left-[5rem] top-[5.4rem] h-7 w-7 rounded-full bg-slate-950 shadow-[inset_4px_-4px_0_rgba(14,165,233,0.45)]" />
      <span className="absolute right-[5rem] top-[5.4rem] h-7 w-7 rounded-full bg-slate-950 shadow-[inset_4px_-4px_0_rgba(14,165,233,0.45)]" />
      <span className="absolute left-[5.35rem] top-[5.75rem] h-2.5 w-2.5 rounded-full bg-white" />
      <span className="absolute right-[5.35rem] top-[5.75rem] h-2.5 w-2.5 rounded-full bg-white" />
      <span className="absolute left-[4.8rem] top-[4.8rem] h-2 w-12 rotate-[-10deg] rounded-full bg-sky-900/55" />
      <span className="absolute right-[4.8rem] top-[4.8rem] h-2 w-12 rotate-[10deg] rounded-full bg-sky-900/55" />
      <span className="absolute left-[5.6rem] top-[8.4rem] h-4 w-20 rounded-b-full border-b-[3px] border-sky-950/55" />
      <span className={[avatar.body, 'absolute bottom-4 left-2 h-16 w-20 -rotate-45 rounded-[100%_20%_80%_20%] opacity-80'].join(' ')} />
      <span className={[avatar.body, 'absolute bottom-0 left-[4.3rem] h-16 w-8 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute bottom-0 right-[4.3rem] h-16 w-8 rounded-full'].join(' ')} />
    </div>
  );
}

function OwlAvatar({ avatar }: { avatar: AvatarCard }) {
  return (
    <div className="relative h-64 w-56">
      <span className={[avatar.body, 'absolute left-8 top-8 h-44 w-40 rounded-[48%] shadow-inner'].join(' ')} />
      <span className={[avatar.body, 'absolute left-5 top-4 h-28 w-10 -rotate-12 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute right-5 top-4 h-28 w-10 rotate-12 rounded-full'].join(' ')} />
      <span className="absolute left-[4.55rem] top-[4.6rem] h-9 w-9 rounded-full bg-violet-300/70" />
      <span className="absolute right-[4.55rem] top-[4.6rem] h-9 w-9 rounded-full bg-violet-300/70" />
      <span className="absolute left-[4.7rem] top-[6.2rem] h-7 w-16 rounded-b-full border-b-[4px] border-violet-950/65" />
      <span className="absolute right-[4.7rem] top-[6.2rem] h-7 w-16 rounded-b-full border-b-[4px] border-violet-950/65" />
      <span className="absolute left-[6.3rem] top-[6.4rem] h-8 w-6 rounded-[45%] bg-violet-900/70" />
      <span className="absolute left-[5.2rem] top-[12.3rem] h-12 w-8 rounded-full bg-violet-600" />
      <span className="absolute right-[5.2rem] top-[12.3rem] h-12 w-8 rounded-full bg-violet-600" />
      <span className="absolute bottom-3 left-[4.2rem] h-5 w-12 rounded-full bg-violet-700" />
      <span className="absolute bottom-3 right-[4.2rem] h-5 w-12 rounded-full bg-violet-700" />
    </div>
  );
}

function CatAvatar({ avatar }: { avatar: AvatarCard }) {
  return (
    <div className="relative h-64 w-56">
      <span className={[avatar.body, 'absolute left-8 top-12 h-36 w-40 rounded-[48%] shadow-inner'].join(' ')} />
      <span className={[avatar.body, 'absolute left-10 top-8 h-20 w-16 rotate-[-28deg] rounded-[0.8rem]'].join(' ')} />
      <span className={[avatar.body, 'absolute right-10 top-8 h-20 w-16 rotate-[28deg] rounded-[0.8rem]'].join(' ')} />
      <span className={[avatar.body, 'absolute left-[4.6rem] top-[11.2rem] h-28 w-24 rounded-full'].join(' ')} />
      <span className="absolute left-[4.8rem] top-[6.3rem] h-8 w-14 rounded-b-full border-b-[5px] border-red-950/55" />
      <span className="absolute right-[4.8rem] top-[6.3rem] h-8 w-14 rounded-b-full border-b-[5px] border-red-950/55" />
      <span className="absolute left-[6.3rem] top-[8.1rem] h-4 w-5 rounded-full bg-red-950/70" />
      <span className="absolute left-[5.35rem] top-[8.7rem] h-7 w-20 rounded-b-full border-b-[4px] border-red-950/55" />
      <span className={[avatar.body, 'absolute bottom-8 left-1 h-12 w-24 rotate-[-38deg] rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute bottom-0 left-[4.3rem] h-16 w-8 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute bottom-0 right-[4.3rem] h-16 w-8 rounded-full'].join(' ')} />
    </div>
  );
}

function BearAvatar({ avatar }: { avatar: AvatarCard }) {
  return (
    <div className="relative h-64 w-56">
      <span className={[avatar.body, 'absolute left-4 top-20 h-20 w-10 -rotate-45 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute right-4 top-20 h-20 w-10 rotate-45 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute left-8 top-10 h-36 w-40 rounded-[48%] shadow-inner'].join(' ')} />
      <span className={[avatar.body, 'absolute left-[3.1rem] top-8 h-10 w-10 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute right-[3.1rem] top-8 h-10 w-10 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute left-[4.6rem] top-[11.2rem] h-28 w-24 rounded-full'].join(' ')} />
      <span className="absolute left-[4.7rem] top-[5.9rem] h-8 w-12 rounded-b-full border-b-[5px] border-green-950/50" />
      <span className="absolute right-[4.7rem] top-[5.9rem] h-8 w-12 rounded-b-full border-b-[5px] border-green-950/50" />
      <span className="absolute left-[5.2rem] top-[7.2rem] h-10 w-24 rounded-b-full border-b-[10px] border-green-950/60" />
      <span className="absolute left-[6.5rem] top-[9rem] h-5 w-10 rounded-full bg-orange-300/80" />
      <span className={[avatar.accent, 'absolute left-[5.4rem] top-[9.6rem] h-20 w-20 rounded-full opacity-65'].join(' ')} />
      <span className={[avatar.body, 'absolute bottom-0 left-[4.3rem] h-16 w-8 rounded-full'].join(' ')} />
      <span className={[avatar.body, 'absolute bottom-0 right-[4.3rem] h-16 w-8 rounded-full'].join(' ')} />
    </div>
  );
}
