import * as React from "react";
import type { IconProps } from "./MissionsIcon";

export const DQuestIcon = React.forwardRef<SVGSVGElement, IconProps>(function DQuestIcon(
  { width = 24, height = 24, ...props },
  ref
) {
  const id = React.useId();
  const gradientId = `${id}-dquestGradient`;
  const glowId = `${id}-dquestGlow`;

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="6" y1="20" x2="18" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5DE0FF" />
          <stop offset="0.5" stopColor="#7E7CFF" />
          <stop offset="1" stopColor="#FF7EE2" />
        </linearGradient>
        <filter id={glowId} x="0" y="0" width="24" height="24" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.40 0 0 0 0 0.55 0 0 0 0 0.98 0 0 0 0.6 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        filter={`url(#${glowId})`}
        stroke={`url(#${gradientId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4.5C13.4 6.2 14.8 7.7 14.6 10.2C14.5 11.8 13.4 12.9 12.7 14.1C12.3 14.9 12.2 15.9 12 17.2" />
        <path d="M12 4.5C9.6 7 8.1 8.9 8.1 11.5C8.1 14.8 10.3 17 12 17C13.7 17 15.9 15.2 15.9 12.5C15.9 10.3 14.7 9.1 13.9 8.2" />
        <path d="M10.4 13.6C10.8 14.8 11.2 15.2 12.1 15.6C13.6 16.2 14.9 15.2 14.8 13.7" />
      </g>
    </svg>
  );
});

DQuestIcon.displayName = "DQuestIcon";
