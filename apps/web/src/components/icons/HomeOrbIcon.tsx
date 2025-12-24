import * as React from "react";
import type { IconProps } from "./MissionsIcon";

export const HomeOrbIcon = React.forwardRef<SVGSVGElement, IconProps>(function HomeOrbIcon(
  { width = 24, height = 24, ...props },
  ref
) {
  const id = React.useId();
  const fillId = `${id}-homeOrbFill`;
  const strokeId = `${id}-homeOrbStroke`;
  const glowId = `${id}-homeOrbGlow`;
  const particleGlowId = `${id}-particleGlow`;

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
        <radialGradient
          id={fillId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(12 12) rotate(90) scale(9)"
        >
          <stop offset="0.1" stopColor="#FF8DEB" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#8A7CFF" stopOpacity="0.85" />
          <stop offset="1" stopColor="#3FD8FF" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id={strokeId} x1="5" y1="19" x2="19.5" y2="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFF" />
          <stop offset="0.5" stopColor="#9F7BFF" />
          <stop offset="1" stopColor="#FF7EE2" />
        </linearGradient>
        <filter id={glowId} x="-4" y="-4" width="32" height="32" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.48 0 0 0 0 0.34 0 0 0 0 0.97 0 0 0 0.7 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={particleGlowId} x="0" y="0" width="24" height="24" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="1.4" result="pblur" />
          <feColorMatrix
            in="pblur"
            type="matrix"
            values="0 0 0 0 0.6 0 0 0 0 0.45 0 0 0 0 1 0 0 0 0.6 0"
            result="pcolor"
          />
          <feMerge>
            <feMergeNode in="pcolor" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${glowId})`} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="6.8" fill={`url(#${fillId})`} stroke={`url(#${strokeId})`} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.5" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="0.9" />
      </g>
      <g filter={`url(#${particleGlowId})`} fill="#C8B6FF" fillOpacity="0.85">
        <circle cx="6" cy="10.5" r="0.6" />
        <circle cx="8" cy="6.5" r="0.5" />
        <circle cx="16.8" cy="6.8" r="0.55" />
        <circle cx="18.2" cy="12.2" r="0.7" />
        <circle cx="15" cy="17.1" r="0.5" />
        <circle cx="8.2" cy="17.4" r="0.45" />
        <circle cx="5.8" cy="14.8" r="0.4" />
      </g>
    </svg>
  );
});

HomeOrbIcon.displayName = "HomeOrbIcon";
