# Neon Glow Icon Set

This folder exposes a small set of neon-style SVG icons plus matching React TSX components ready for Next.js/React.

## Files
- SVG sources: `apps/web/src/assets/icons/*.svg`
- React components: `apps/web/src/components/icons/*.tsx`

## Usage in Next.js
```tsx
import { MissionsIcon, DQuestIcon, HomeOrbIcon, RewardsIcon, EditorIcon } from "@/components/icons";

export default function Navbar() {
  return (
    <nav className="flex gap-4 bg-slate-900/70 px-4 py-3">
      <MissionsIcon />
      <DQuestIcon />
      <HomeOrbIcon width={28} height={28} />
      <RewardsIcon />
      <EditorIcon />
    </nav>
  );
}
```

Each component forwards props to the underlying `<svg>` so you can pass `className`, `aria-label`, or custom `width`/`height`.

## Tweaking the glow
Every icon defines its glow in the internal `<filter>` node. Two easy knobs:
- **Blur radius:** change `stdDeviation` on the `feGaussianBlur` inside the filter to soften or sharpen the halo.
- **Intensity/opacity:** adjust the last column values in the `feColorMatrix` (typically `0.55–0.70`). Lower values reduce brightness; higher values intensify the glow.

Because the gradients and filters use `React.useId()`, multiple icons can render on the same page without ID collisions.
