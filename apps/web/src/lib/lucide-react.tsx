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

export const CircleDot = createIcon(
  [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['circle', { cx: '12', cy: '12', r: '1' }],
  ],
  'CircleDot',
);


export const Target = createIcon(
  [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['circle', { cx: '12', cy: '12', r: '6' }],
    ['circle', { cx: '12', cy: '12', r: '2' }],
  ],
  'Target',
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

export const Check = createIcon(
  [
    ['path', { d: 'M20 6 9 17l-5-5' }],
  ],
  'Check',
);

export const ChevronDown = createIcon(
  [
    ['path', { d: 'm6 9 6 6 6-6' }],
  ],
  'ChevronDown',
);

export const ChevronUp = createIcon(
  [
    ['path', { d: 'm18 15-6-6-6 6' }],
  ],
  'ChevronUp',
);

export const Clock3 = createIcon(
  [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 6v6l4 2' }],
  ],
  'Clock3',
);

export const FileDown = createIcon(
  [
    ['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }],
    ['path', { d: 'M14 2v6h6' }],
    ['path', { d: 'M12 18v-6' }],
    ['path', { d: 'm9 15 3 3 3-3' }],
  ],
  'FileDown',
);

export const ImagePlus = createIcon(
  [
    ['path', { d: 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7' }],
    ['circle', { cx: '9', cy: '9', r: '2' }],
    ['path', { d: 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21' }],
    ['path', { d: 'M16 5h6' }],
    ['path', { d: 'M19 2v6' }],
  ],
  'ImagePlus',
);

export const Pencil = createIcon(
  [
    ['path', { d: 'M21.2 6.8 17.2 2.8a2 2 0 0 0-2.8 0L3 14.2V21h6.8L21.2 9.6a2 2 0 0 0 0-2.8z' }],
    ['path', { d: 'm14 5 5 5' }],
  ],
  'Pencil',
);

export const RotateCcw = createIcon(
  [
    ['path', { d: 'M3 12a9 9 0 1 0 3-6.7L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  'RotateCcw',
);

export const Trash2 = createIcon(
  [
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }],
    ['path', { d: 'M19 6 18 20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }],
    ['path', { d: 'M10 11v6' }],
    ['path', { d: 'M14 11v6' }],
  ],
  'Trash2',
);

export const UploadCloud = createIcon(
  [
    ['path', { d: 'M16 16l-4-4-4 4' }],
    ['path', { d: 'M12 12v9' }],
    ['path', { d: 'M20.4 18.9A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 4 16.3' }],
  ],
  'UploadCloud',
);

export const XCircle = createIcon(
  [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'm15 9-6 6' }],
    ['path', { d: 'm9 9 6 6' }],
  ],
  'XCircle',
);
