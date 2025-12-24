import * as React from "react";
import type { IconProps } from "./MissionsIcon";

export const EditorIcon = React.forwardRef<SVGSVGElement, IconProps>(function EditorIcon(
  { width = 24, height = 24, ...props },
  ref
) {
  const id = React.useId();
  const gradientId = `${id}-editorGradient`;
  const glowId = `${id}-editorGlow`;

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
        <linearGradient id={gradientId} x1="7" y1="19" x2="17" y2="7" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6DFFA6" />
          <stop offset="0.5" stopColor="#7CE3C6" />
          <stop offset="1" stopColor="#A6FFE0" />
        </linearGradient>
        <filter id={glowId} x="-1" y="-1" width="26" height="26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="2.3" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.35 0 0 0 0 0.77 0 0 0 0 0.58 0 0 0 0.6 0"
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
        <path d="M12 18V12.6C12 10.3 10.4 9.2 9 9.1C7.3 9 6 10.3 6 12C6 14 7.8 14.8 9.5 14.6" />
        <path d="M12 18V12.6C12 10.3 13.6 9.2 15 9.1C16.7 9 18 10.3 18 12C18 14 16.2 14.8 14.5 14.6" />
        <path d="M10.4 9.3C10.6 7.4 11.4 6.2 12 5.5C12.6 6.2 13.4 7.4 13.6 9.3" />
        <path d="M9 18H15" />
      </g>
    </svg>
  );
});

EditorIcon.displayName = "EditorIcon";
