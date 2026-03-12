import type { KeyboardEvent, ReactNode } from 'react';
import { useRef } from 'react';

interface SegmentedOption<TValue extends string> {
  value: TValue;
  label: string;
  icon?: ReactNode;
}

interface SegmentedPillControlProps<TValue extends string> {
  ariaLabel: string;
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
}

export function SegmentedPillControl<TValue extends string>({
  ariaLabel,
  options,
  value,
  onChange,
}: SegmentedPillControlProps<TValue>) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusOption = (index: number) => {
    const size = options.length;
    if (size <= 0) {
      return;
    }
    const nextIndex = ((index % size) + size) % size;
    optionRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        focusOption(index + 1);
        return;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        focusOption(index - 1);
        return;
      }
      case 'Home': {
        event.preventDefault();
        focusOption(0);
        return;
      }
      case 'End': {
        event.preventDefault();
        focusOption(options.length - 1);
        return;
      }
      default:
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="mt-2 inline-flex w-full items-stretch rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-slate-900-15)] p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
    >
      {options.map((option, index) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`relative min-h-10 flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-primary)]/40 ${
              isActive
                ? 'border border-white/35 bg-[color:var(--color-surface)] text-[color:var(--color-text-strong)] shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_8px_18px_-12px_rgba(8,12,25,0.85)]'
                : 'border border-transparent text-[color:var(--color-text-faint)] hover:text-[color:var(--color-text)]'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

