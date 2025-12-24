import { type SVGProps } from 'react';

const baseIconProps: Partial<SVGProps<SVGSVGElement>> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function CircleDot(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseIconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function Route(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M4 18c4 0 4-12 8-12s4 12 8 12" />
      <circle cx="4" cy="18" r="2" />
      <circle cx="20" cy="18" r="2" />
      <circle cx="12" cy="6" r="2" />
    </svg>
  );
}

export function Flame(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-3-3-4-4-7Z" />
      <path d="M8 14a4 4 0 1 0 8 0 6 6 0 0 0-2-4" />
    </svg>
  );
}

export function Sparkles(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M12 4l1.5 3.5L17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5Z" />
      <path d="M6 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />
      <path d="M18 14l.75 1.5L20 16l-1.25.5L18 18l-.75-1.5L16 16l1.25-.5Z" />
    </svg>
  );
}

export function Sprout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M12 22v-6" />
      <path d="M16 10c0 2-1.79 4-4 4s-4-2-4-4a4 4 0 0 1 4-4c2.21 0 4 2 4 4Z" />
      <path d="M9 9C9 6 7 4 4 4c0 3 2 5 5 5Z" />
      <path d="M15 9c0-3 2-5 5-5 0 3-2 5-5 5Z" />
    </svg>
  );
}

