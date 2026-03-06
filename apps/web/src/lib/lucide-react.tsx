import { forwardRef, type SVGProps } from 'react';

type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

type IconNode = Array<['path' | 'circle', Record<string, string>]>

function createIcon(iconNode: IconNode, displayName: string) {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(({ size = 24, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {iconNode.map(([tag, attrs], index) => {
        if (tag === 'circle') {
          return <circle key={`${displayName}-${index}`} {...attrs} />;
        }

        return <path key={`${displayName}-${index}`} {...attrs} />;
      })}
    </svg>
  ));

  Icon.displayName = displayName;
  return Icon;
}

export const Route = createIcon(
  [
    ['circle', { cx: '6', cy: '19', r: '3' }],
    ['path', { d: 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H15' }],
    ['circle', { cx: '18', cy: '5', r: '3' }],
  ],
  'Route',
);

export const RefreshCcwDot = createIcon(
  [
    ['path', { d: 'M3 2v6h6' }],
    ['path', { d: 'M21 12A9 9 0 0 0 6 5.3L3 8' }],
    ['path', { d: 'M21 22v-6h-6' }],
    ['path', { d: 'M3 12a9 9 0 0 0 15 6.7L21 16' }],
    ['circle', { cx: '12', cy: '12', r: '1' }],
  ],
  'RefreshCcwDot',
);

export const FingerprintPattern = createIcon(
  [
    ['path', { d: 'M12 4a8 8 0 0 1 8 8' }],
    ['path', { d: 'M6 12a6 6 0 0 1 12 0' }],
    ['path', { d: 'M8 16a4 4 0 0 1 8 0' }],
    ['path', { d: 'M10 20a2 2 0 0 1 4 0' }],
    ['circle', { cx: '12', cy: '12', r: '1' }],
  ],
  'FingerprintPattern',
);

export const Sparkles = createIcon(
  [
    ['path', { d: 'M12 3l1.9 4.8L19 9.7l-5.1 1.9L12 16.5l-1.9-4.9L5 9.7l5.1-1.9L12 3z' }],
    ['path', { d: 'M5 17l.8 2.2L8 20l-2.2.8L5 23l-.8-2.2L2 20l2.2-.8L5 17z' }],
    ['path', { d: 'M19 14l.6 1.4L21 16l-1.4.6L19 18l-.6-1.4L17 16l1.4-.6L19 14z' }],
  ],
  'Sparkles',
);

export const WandSparkles = createIcon(
  [
    ['path', { d: 'm21 3-5 5' }],
    ['path', { d: 'M15 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z' }],
    ['path', { d: 'M18 12l1 2 2 1-2 1-1 2-1-2-2-1 2-1z' }],
    ['path', { d: 'm3 21 9-9' }],
    ['path', { d: 'm8 21 2-2' }],
  ],
  'WandSparkles',
);
