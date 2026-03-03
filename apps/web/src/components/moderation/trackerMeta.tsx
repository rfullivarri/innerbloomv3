import type { ReactNode } from "react";
import type { ModerationTrackerType } from "../../lib/api";

export const moderationTrackerMeta: Record<
  ModerationTrackerType,
  { label: string; hint?: string }
> = {
  alcohol: { label: "Alcohol" },
  tobacco: { label: "Tabaco" },
  sugar: { label: "Azúcar", hint: "azúcar añadido" },
};

export function ModerationTrackerIcon({
  type,
  className = "h-5 w-5",
}: {
  type: ModerationTrackerType;
  className?: string;
}): ReactNode {
  if (type === "alcohol") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 3h6" />
        <path d="M10 3v3" />
        <path d="M14 3v3" />
        <path d="M10 6h4" />
        <rect x="8" y="6" width="8" height="15" rx="2" />
      </svg>
    );
  }

  if (type === "tobacco") {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="13" height="3" rx="1.2" />
        <path d="M16 11h3" />
        <path d="M19 8c1 .9 1.1 2.1.2 3" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z" />
      <path d="m5 7 7 4 7-4" />
      <path d="M12 11v10" />
    </svg>
  );
}
