const MODE_TITLE_REGEX = /^(LOW|CHILL|FLOW|EVOLVE)\s*·\s*(.+)$/i;

type ModeQuestionTitleProps = {
  title: string;
  className?: string;
};

function parseModeTitle(title: string): string | null {
  const match = title.trim().match(MODE_TITLE_REGEX);
  if (!match) {
    return null;
  }

  const text = match[2].trim();
  if (!text) {
    return null;
  }

  return text;
}

export function ModeQuestionTitle({ title, className = 'text-2xl font-semibold text-white' }: ModeQuestionTitleProps) {
  const parsedText = parseModeTitle(title);
  return <h2 className={className}>{parsedText ?? title}</h2>;
}
