import { useEffect, useMemo, useRef, useState } from 'react';

type GradientOption = {
  id: GradientId;
  label: string;
  a: string;
  b: string;
};

type GradientId = 'curiosity' | 'endless' | 'amethyst' | 'dirty';

const STORAGE_KEY = 'ib:gradient';
const DEFAULT_ANGLE = '135deg';

const GRADIENT_OPTIONS: GradientOption[] = [
  { id: 'curiosity', label: 'Curiosity blue', a: '#525252', b: '#3D72B4' },
  { id: 'endless', label: 'Endless River', a: '#43CEA2', b: '#185A9D' },
  { id: 'amethyst', label: 'Amethyst', a: '#9D50BB', b: '#6E48AA' },
  { id: 'dirty', label: 'Dirty Fog', a: '#B993D6', b: '#8CA6DB' }
];

function applyGradient(option: GradientOption, angle = DEFAULT_ANGLE) {
  document.documentElement.style.setProperty('--bg-angle', angle);
  document.documentElement.style.setProperty('--bg-a', option.a);
  document.documentElement.style.setProperty('--bg-b', option.b);
}

function readStoredGradient(): { id: GradientId; angle: string } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { id?: GradientId; angle?: string };
    const isValid = GRADIENT_OPTIONS.some((option) => option.id === parsed.id);

    if (!isValid || !parsed.id) return null;

    return {
      id: parsed.id,
      angle: typeof parsed.angle === 'string' ? parsed.angle : DEFAULT_ANGLE
    };
  } catch {
    return null;
  }
}

export default function GradientSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<GradientId>(() => readStoredGradient()?.id ?? 'curiosity');
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selectedIndex = useMemo(
    () => Math.max(0, GRADIENT_OPTIONS.findIndex((option) => option.id === selectedId)),
    [selectedId],
  );

  useEffect(() => {
    const stored = readStoredGradient();
    const option = GRADIENT_OPTIONS.find((item) => item.id === (stored?.id ?? selectedId));

    if (!option) return;

    applyGradient(option, stored?.angle ?? DEFAULT_ANGLE);
  }, [selectedId]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectGradient = (option: GradientOption) => {
    setSelectedId(option.id);
    applyGradient(option);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: option.id,
        angle: DEFAULT_ANGLE
      }),
    );
  };

  const goNext = () => {
    const nextIndex = (selectedIndex + 1) % GRADIENT_OPTIONS.length;
    selectGradient(GRADIENT_OPTIONS[nextIndex]);
  };

  return (
    <div className="gradient-switcher" ref={panelRef}>
      <button
        type="button"
        className="gradient-switcher-toggle"
        aria-label="Background selector"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        Background
      </button>

      {isOpen ? (
        <div className="gradient-switcher-panel" role="dialog" aria-label="Gradient background selector">
          <fieldset className="gradient-switcher-options" aria-label="Gradient options">
            <legend className="gradient-switcher-title">Choose gradient</legend>
            {GRADIENT_OPTIONS.map((option) => {
              const checked = option.id === selectedId;
              return (
                <label key={option.id} className="gradient-switcher-option">
                  <input
                    type="radio"
                    name="landing-gradient"
                    value={option.id}
                    checked={checked}
                    aria-label={`Use ${option.label} background`}
                    onChange={() => selectGradient(option)}
                  />
                  <span className="gradient-switcher-label">{option.label}</span>
                  <span
                    className="gradient-switcher-preview"
                    aria-hidden="true"
                    style={{
                      background: `linear-gradient(${DEFAULT_ANGLE}, ${option.a}, ${option.b})`
                    }}
                  />
                </label>
              );
            })}
          </fieldset>
          <button type="button" className="gradient-switcher-next" aria-label="Next gradient" onClick={goNext}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
