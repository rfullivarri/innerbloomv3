import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { DashboardOverview } from './DashboardV3';
import { getDashboardSectionConfig } from './dashboardSections';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { useThemePreference } from '../theme/ThemePreferenceProvider';
import { emitDemoEvent } from '../lib/telemetry';
import { setDashboardDemoModeEnabled } from '../lib/demoMode';

const DEMO_USER_ID = 'demo-public-user';

export default function DemoDashboardPage() {
  const { language, setManualLanguage } = usePostLoginLanguage();
  const { theme, setPreference } = useThemePreference();

  useEffect(() => {
    setDashboardDemoModeEnabled(true);
    emitDemoEvent('demo_opened', { language, theme });

    return () => {
      setDashboardDemoModeEnabled(false);
    };
  }, [language, theme]);

  const overviewSection = getDashboardSectionConfig('dashboard', '/dashboard', language);

  return (
    <div className="min-h-screen bg-transparent" data-light-scope="dashboard-v3">
      <Navbar
        title="Dashboard"
        menuSlot={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-1">
              <button
                type="button"
                onClick={() => setManualLanguage('es')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  language === 'es' ? 'bg-[color:var(--color-overlay-4)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)]'
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => setManualLanguage('en')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                  language === 'en' ? 'bg-[color:var(--color-overlay-4)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-muted)]'
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPreference(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text)]"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link
              to="/"
              onClick={() => emitDemoEvent('demo_exited', { from: '/demo' })}
              className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text)]"
            >
              {language === 'es' ? 'Salir demo' : 'Exit demo'}
            </Link>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-7xl px-3 py-4 md:px-5 md:py-6 lg:px-6 lg:py-8">
        <DashboardOverview
          userId={DEMO_USER_ID}
          gameMode="flow"
          weeklyTarget={3}
          isJourneyGenerating={false}
          showOnboardingGuidance={false}
          section={overviewSection}
          onOpenReminderScheduler={() => undefined}
          onOpenModerationEdit={() => undefined}
          onProfileRefresh={() => undefined}
        />
      </main>
    </div>
  );
}
