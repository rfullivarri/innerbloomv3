import { useThemePreference } from '../../theme/ThemePreferenceProvider';
import type { ThemePreference } from '../../theme/themePreference';

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto' },
];

export function ThemeSwitcher() {
  const { preference, setPreference } = useThemePreference();

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-text-muted">Apariencia</p>
      <div className="mt-2 inline-flex w-full rounded-xl border border-white/15 bg-black/25 p-1">
        {OPTIONS.map((option) => {
          const isActive = preference === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'border border-white/35 bg-white/20 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]'
                  : 'border border-transparent text-white/70 hover:bg-white/10 hover:text-white/90'
              }`}
              aria-pressed={isActive}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
