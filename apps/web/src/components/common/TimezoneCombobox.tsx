import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { TimezoneOption, filterTimezoneOptions } from '../../lib/timezones';

type TimezoneComboboxProps = {
  id: string;
  value: string;
  options: TimezoneOption[];
  onChange: (timezone: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function TimezoneCombobox({
  id,
  value,
  options,
  onChange,
  placeholder = 'Buscar por ciudad o país',
  disabled = false,
}: TimezoneComboboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredOptions = useMemo(
    () => filterTimezoneOptions(options, searchTerm, value),
    [options, searchTerm, value],
  );

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? filteredOptions.find((option) => option.value === value),
    [filteredOptions, options, value],
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) {
      setActiveIndex(Math.max(0, filteredOptions.length - 1));
    }
  }, [activeIndex, filteredOptions.length]);

  const activeOptionId =
    isOpen && filteredOptions.length > 0 && filteredOptions[activeIndex]
      ? `${listboxId}-${filteredOptions[activeIndex].value}`
      : undefined;

  const handleSelect = (timezone: string) => {
    onChange(timezone);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((previous) => Math.min(previous + 1, filteredOptions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((previous) => Math.max(previous - 1, 0));
      return;
    }

    if (event.key === 'Enter' && isOpen && filteredOptions[activeIndex]) {
      event.preventDefault();
      handleSelect(filteredOptions[activeIndex].value);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (containerRef.current?.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setIsOpen(false);
      }}
    >
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        type="text"
        autoComplete="off"
        value={isOpen ? searchTerm : selectedOption?.label ?? ''}
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        onChange={(event) => {
          setSearchTerm(event.target.value);
          setIsOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm ios-touch-input text-white outline-none transition focus:border-white/40"
      />

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-white/10 bg-surface/95 p-1 shadow-lg backdrop-blur"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-subtle">No encontramos resultados.</li>
          ) : (
            filteredOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  id={`${listboxId}-${option.value}`}
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`cursor-pointer rounded-xl px-3 py-2 text-sm transition ${
                    isActive ? 'bg-white/15 text-white' : 'text-text hover:bg-white/10'
                  } ${isSelected ? 'font-semibold' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
