import { type CSSProperties } from 'react';
import { FeatureCard } from './FeatureCard';
import { DailyQuestPreview } from './previews/DailyQuestPreview';
import { EmotionHeatmapPreview } from './previews/EmotionHeatmapPreview';
import { MissionsRewardsPreview } from './previews/MissionsRewardsPreview';
import { WeeklyConsistencyPreview } from './previews/WeeklyConsistencyPreview';
import { XpLevelPreview } from './previews/XpLevelPreview';
import { RemindersPreview } from './previews/RemindersPreview';
import './FeatureShowcase.css';

const FEATURES = [
  {
    title: '📝 Daily Quest',
    description: 'Seguimiento de tareas por pilar y emoción diaria. 100% conectado a tu board.',
    Preview: DailyQuestPreview
  },
  {
    title: '⭐ XP & Nivel',
    description: 'Progreso con datos reales. Barra de nivel y XP faltante al siguiente nivel.',
    Preview: XpLevelPreview
  },
  {
    title: '📆 Constancia semanal',
    description: 'Rachas por tarea: cuántas semanas seguidas mantienes la constancia de tus actividades.',
    Preview: WeeklyConsistencyPreview
  },
  {
    title: '🎯 Misiones & Rewards',
    description: 'Misiones vinculadas a rachas. Bonos de XP al cumplir objetivos.',
    Preview: MissionsRewardsPreview
  },
  {
    title: '🗺️ Emotion Heatmap',
    description: 'Mapa visual de tu estado emocional a lo largo del tiempo.',
    Preview: EmotionHeatmapPreview
  },
  {
    title: '📱 App & Recordatorios',
    description: 'Descarga nuestra app y recibe recordatorios para un mejor seguimiento.',
    Preview: RemindersPreview
  }
];

export function FeatureShowcaseSection() {
  return (
    <section className="feature-showcase section-pad reveal-on-scroll" id="features">
      <div className="container">
        <div className="feature-showcase__intro">
          <h2>Lo que desbloqueás</h2>
          <p className="section-sub">Herramientas que te dan claridad y momentum.</p>
        </div>

        <div className="feature-showcase__grid">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              preview={<feature.Preview />}
              delay={index * 80}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
