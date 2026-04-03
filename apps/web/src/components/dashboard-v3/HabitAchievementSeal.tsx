import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { resolveHabitAchievementSealCandidates } from '../../lib/habitAchievementSeals';

type HabitAchievementSealProps = {
  pillar?: string | null;
  traitCode?: string | null;
  traitName?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  disabled?: boolean;
  fallback: ReactNode;
};

export function HabitAchievementSeal({
  pillar,
  traitCode,
  traitName,
  alt,
  className,
  imgClassName,
  disabled = false,
  fallback,
}: HabitAchievementSealProps) {
  const candidates = useMemo(
    () => resolveHabitAchievementSealCandidates({ pillar, traitCode, traitName }),
    [pillar, traitCode, traitName],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidates]);

  const src = candidates[index] ?? null;
  const disabledClasses = disabled ? 'grayscale opacity-60 saturate-0' : '';

  if (!src) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <img
        src={src}
        alt={alt}
        className={[imgClassName, disabledClasses].filter(Boolean).join(' ')}
        loading="lazy"
        onError={() => {
          setIndex((current) => current + 1);
        }}
      />
    </div>
  );
}
