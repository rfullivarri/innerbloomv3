import { useEffect, useMemo, useState } from 'react';

type Language = 'es' | 'en';

const EMOTIONS = [
  { id: 'calm', color: '#2ECC71', labels: { es: 'Calma', en: 'Calm' } },
  { id: 'joy', color: '#F1C40F', labels: { es: 'Felicidad', en: 'Happiness' } },
  { id: 'motivation', color: '#9B59B6', labels: { es: 'Motivación', en: 'Motivation' } },
  { id: 'sadness', color: '#3498DB', labels: { es: 'Tristeza', en: 'Sadness' } },
  { id: 'anxiety', color: '#E74C3C', labels: { es: 'Ansiedad', en: 'Anxiety' } },
  { id: 'frustration', color: '#8D6E63', labels: { es: 'Frustración', en: 'Frustration' } },
  { id: 'fatigue', color: '#16A085', labels: { es: 'Cansancio', en: 'Fatigue' } }
];

const GRID_ROWS = 6;
const GRID_COLS = 18;

export function EmotionHeatmapPreview({ language = 'es' }: { language?: Language }) {
  const [glowIndex, setGlowIndex] = useState<number[]>([5, 28]);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cells = useMemo(
    () =>
      Array.from({ length: GRID_ROWS * GRID_COLS }, (_, index) => {
        const emotion = EMOTIONS[index % EMOTIONS.length];
        return { key: `cell-${index}`, emotion: emotion.id, color: emotion.color };
      }),
    []
  );

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

  const gridLabel = language === 'es' ? 'Mapa emocional simplificado' : 'Simplified emotion map';
  const legendLabel = language === 'es' ? 'Leyenda de emociones' : 'Emotion legend';

  return (
    <div className="feature-mini-panel heatmap-preview">
      <div className="heatmap-grid" aria-label={gridLabel}>
        {cells.map((cell, index) => (
          <span
            key={cell.key}
            className={`heatmap-cell ${glowIndex.includes(index) ? 'glow' : ''}`}
            style={{ backgroundColor: cell.color }}
            aria-hidden
          />
        ))}
      </div>
      <div className="heatmap-legend" aria-label={legendLabel}>
        {EMOTIONS.slice(0, 6).map((emotion) => (
          <span key={emotion.id} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: emotion.color }} />
            {emotion.labels[language]}
          </span>
        ))}
      </div>
    </div>
  );
}
