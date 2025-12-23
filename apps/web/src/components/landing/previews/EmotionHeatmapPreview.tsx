import { useEffect, useMemo, useState } from 'react';

const EMOTION_COLORS: Record<string, string> = {
  Calma: '#2ECC71',
  Felicidad: '#F1C40F',
  Motivación: '#9B59B6',
  Tristeza: '#3498DB',
  Ansiedad: '#E74C3C',
  Frustración: '#8D6E63',
  Cansancio: '#16A085'
};

const GRID_ROWS = 6;
const GRID_COLS = 18;

export function EmotionHeatmapPreview() {
  const [glowIndex, setGlowIndex] = useState<number[]>([5, 28]);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cells = useMemo(() => {
    const emotions = Object.keys(EMOTION_COLORS);
    return Array.from({ length: GRID_ROWS * GRID_COLS }, (_, index) => {
      const emotion = emotions[index % emotions.length];
      return { key: `cell-${index}`, emotion, color: EMOTION_COLORS[emotion] };
    });
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setGlowIndex((current) => {
        const next: number[] = [];
        while (next.length < 2) {
          const random = Math.floor(Math.random() * GRID_ROWS * GRID_COLS);
          if (!next.includes(random)) {
            next.push(random);
          }
        }
        return next;
      });
    }, 4200);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  return (
    <div className="feature-mini-panel heatmap-preview">
      <div className="heatmap-grid" aria-label="Mapa emocional simplificado">
        {cells.map((cell, index) => (
          <span
            key={cell.key}
            className={`heatmap-cell ${glowIndex.includes(index) ? 'glow' : ''}`}
            style={{ backgroundColor: cell.color }}
            aria-hidden
          />
        ))}
      </div>
      <div className="heatmap-legend" aria-label="Leyenda de emociones">
        {Object.entries(EMOTION_COLORS).slice(0, 6).map(([name, color]) => (
          <span key={name} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
