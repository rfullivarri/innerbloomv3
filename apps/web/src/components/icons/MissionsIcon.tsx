import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement>;

export const MissionsIcon = React.forwardRef<SVGSVGElement, IconProps>(
  function MissionsIcon({ width = 24, height = 24, ...props }, ref) {
    const id = React.useId();
    const gradientId = `${id}-missionsGradient`;
    const glowId = `${id}-missionsGlow`;

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
          <linearGradient id={gradientId} x1="5" y1="19" x2="20" y2="5" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7C5CFF" />
            <stop offset="0.5" stopColor="#9D6CFF" />
            <stop offset="1" stopColor="#FF7EE2" />
          </linearGradient>
          <filter id={glowId} x="0" y="0" width="24" height="24" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.52 0 0 0 0 0.30 0 0 0 0 0.90 0 0 0 0.55 0"
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
          <path d="M5 16.5C7.8 13 10.2 13.5 12.4 12C14.7 10.5 15 8 18.5 7.5C19.7 7.3 20 9 19 10.2C17.5 12 14.9 13.2 12.6 14.5C10.3 15.8 8.7 17 6.8 17.5" />
          <circle cx="9" cy="14" r="1.6" fill="#0D0A16" />
          <circle cx="9" cy="14" r="1.6" stroke={`url(#${gradientId})`} strokeWidth="1.4" />
          <circle cx="15.6" cy="10" r="1.4" fill="#0D0A16" />
          <circle cx="15.6" cy="10" r="1.4" stroke={`url(#${gradientId})`} strokeWidth="1.2" />
        </g>
      </svg>
    );
  }
);

MissionsIcon.displayName = "MissionsIcon";
