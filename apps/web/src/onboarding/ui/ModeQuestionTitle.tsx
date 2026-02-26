const MODE_TITLE_REGEX = /^(LOW|CHILL|FLOW|EVOLVE)\s*·\s*(.+)$/i;

const MODE_DOT_CLASSNAME: Record<string, string> = {
  LOW: 'bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.78)]',
  CHILL: 'bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.75)]',
  FLOW: 'bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.75)]',
  EVOLVE: 'bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.78)]',
};

type ModeQuestionTitleProps = {
  title: string;
  className?: string;
};

function parseModeTitle(title: string): { mode: string; text: string } | null {
  const match = title.trim().match(MODE_TITLE_REGEX);
  if (!match) {
    return null;
  }

  const mode = match[1].toUpperCase();
  const text = match[2].trim();
  if (!text) {
    return null;
  }

  return { mode, text };
}

export function ModeQuestionTitle({ title, className = 'text-2xl font-semibold text-white' }: ModeQuestionTitleProps) {
  const parsed = parseModeTitle(title);

  if (!parsed) {
    return <h2 className={className}>{title}</h2>;
  }

  const dotClassName = MODE_DOT_CLASSNAME[parsed.mode] ?? 'bg-white/80';

  return (
    <h2 className={className}>
      <span className="inline-flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`inline-block h-[0.9em] w-[0.9em] shrink-0 rounded-full align-middle ${dotClassName}`}
        />
        <span>{parsed.text}</span>
      </span>
    </h2>
  );
}
