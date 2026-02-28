interface XpBonusChipProps {
  bonus: number;
  active: boolean;
}

export function XpBonusChip({ bonus, active }: XpBonusChipProps) {
  return (
    <span
      aria-label="Sumás 8 XP si completás este campo"
      className="inline-flex h-6 items-center rounded-full border border-violet-300/30 bg-violet-300/15 px-3 text-xs font-medium text-violet-100"
    >
      +{bonus} XP{active ? ' ✓' : ''}
    </span>
  );
}
