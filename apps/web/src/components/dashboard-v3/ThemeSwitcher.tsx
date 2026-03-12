import type { ReactNode } from 'react';
import { useThemePreference } from '../../theme/ThemePreferenceProvider';
import type { ThemePreference } from '../../theme/themePreference';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { SegmentedPillControl } from './SegmentedPillControl';

const OPTIONS: Array<{ value: ThemePreference; label: string; icon?: ReactNode }> = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
      </svg>
    ),
  },
  { value: 'auto', label: 'Auto' },
];

export function ThemeSwitcher() {
  const { preference, setPreference } = useThemePreference();
  const { t } = usePostLoginLanguage();

  const localizedOptions = OPTIONS.map((option) => ({
    ...option,
    label:
      option.value === 'light'
        ? t('dashboard.theme.light')
        : option.value === 'dark'
          ? t('dashboard.theme.dark')
          : t('dashboard.theme.auto'),
  }));

  return (
    <section className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-text-muted)]">
        {t('dashboard.theme.appearance')}
      </p>
      <SegmentedPillControl
        ariaLabel={t('dashboard.theme.appearance')}
        options={localizedOptions}
        value={preference}
        onChange={setPreference}
      />
    </section>
  );
}
