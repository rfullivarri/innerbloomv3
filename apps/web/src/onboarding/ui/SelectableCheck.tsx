interface SelectableCheckProps {
  selected?: boolean;
  toneClassName?: string;
  className?: string;
}

export function SelectableCheck({
  selected = false,
  toneClassName = '',
  className = '',
}: SelectableCheckProps) {
  return (
    <span
      data-selected={selected ? 'true' : undefined}
      aria-hidden
      className={`inline-flex aspect-square h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition-colors transition-transform duration-150 ease-out data-[selected=true]:scale-110 ${toneClassName} ${className}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        data-selected={selected ? 'true' : undefined}
        className={`h-[14px] w-[14px] text-current opacity-0 transition-opacity duration-150 data-[selected=true]:opacity-100`}
      >
        <path
          d="M5.33329 9.19995L3.26663 7.13328L4.20996 6.18995L5.33329 7.31328L9.12329 3.52328L10.0666 4.46661L5.33329 9.19995Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
