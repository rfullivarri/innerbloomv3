import { AvatarCtaBanner } from "../../components/landing/AvatarCtaBanner";
import { buildOnboardingPath } from "../../onboarding/i18n";

export default function AvatarCtaCarouselLabPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ff] px-4 py-8 text-[#171426] md:px-8 md:py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-500">Innerbloom Labs</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[0em] md:text-5xl">Avatar CTA Banner</h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Landing-ready CTA using the existing avatar preview assets from the public catalog.
          </p>
        </header>

        <AvatarCtaBanner
          language="es"
          startHref={buildOnboardingPath("es")}
        />

        <div className="rounded-[1.4rem] bg-[linear-gradient(135deg,#0d1020,#211633_58%,#351f63)] px-6 py-8 md:px-10">
          <AvatarCtaBanner
            language="en"
            startHref={buildOnboardingPath("en")}
            className="avatar-cta-banner--lab-dark"
          />
        </div>
      </div>
    </main>
  );
}
