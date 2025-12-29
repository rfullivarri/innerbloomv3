import type { ReactElement } from 'react';
import { FeatureCard } from './FeatureCard';
import { DailyQuestPreview } from './previews/DailyQuestPreview';
import { EmotionHeatmapPreview } from './previews/EmotionHeatmapPreview';
import { MissionsRewardsPreview } from './previews/MissionsRewardsPreview';
import { WeeklyConsistencyPreview } from './previews/WeeklyConsistencyPreview';
import { XpLevelPreview } from './previews/XpLevelPreview';
import { RemindersPreview } from './previews/RemindersPreview';
import './FeatureShowcase.css';

type Language = 'es' | 'en';
type FeatureId = 'daily' | 'xp' | 'consistency' | 'missions' | 'heatmap' | 'reminders';
type FeatureCopy = { id: FeatureId; title: string; description: string };
type PreviewComponent = (props: { language?: Language }) => ReactElement;

const FEATURE_PREVIEWS: Record<FeatureId, PreviewComponent> = {
  daily: DailyQuestPreview,
  xp: XpLevelPreview,
  consistency: WeeklyConsistencyPreview,
  missions: MissionsRewardsPreview,
  heatmap: EmotionHeatmapPreview,
  reminders: RemindersPreview
};

const FEATURE_CONTENT: Record<Language, { title: string; subtitle: string; items: FeatureCopy[] }> = {
  es: {
    title: 'Lo que desbloqueás',
    subtitle: 'Herramientas que te dan claridad y momentum.',
    items: [
      {
        id: 'daily',
        title: '📝 Daily Quest',
        description: 'Seguimiento de tareas por pilar y emoción diaria. 100% conectado a tu board.'
      },
      {
        id: 'xp',
        title: '⭐ XP & Nivel',
        description: 'Progreso con datos reales. Barra de nivel y XP faltante al siguiente nivel.'
      },
      {
        id: 'consistency',
        title: '📆 Constancia semanal',
        description: 'Rachas por tarea: cuántas semanas seguidas mantienes la constancia de tus actividades.'
      },
      {
        id: 'missions',
        title: '🎯 Misiones & Rewards',
        description: 'Misiones vinculadas a rachas. Bonos de XP al cumplir objetivos.'
      },
      {
        id: 'heatmap',
        title: '🗺️ Emotion Heatmap',
        description: 'Mapa visual de tu estado emocional a lo largo del tiempo.'
      },
      {
        id: 'reminders',
        title: '📱 App & Recordatorios',
        description: 'Descarga nuestra app y recibe recordatorios para un mejor seguimiento.'
      }
    ]
  },
  en: {
    title: 'What you unlock',
    subtitle: 'Tools that give you clarity and momentum.',
    items: [
      {
        id: 'daily',
        title: '📝 Daily Quest',
        description: 'Task tracking by pillar with daily emotion check-ins. Fully connected to your board.'
      },
      {
        id: 'xp',
        title: '⭐ XP & Level',
        description: 'Progress with real data. Level bar and XP missing to the next level.'
      },
      {
        id: 'consistency',
        title: '📆 Weekly consistency',
        description: 'Task streaks: how many consecutive weeks you keep each activity.'
      },
      {
        id: 'missions',
        title: '🎯 Missions & Rewards',
        description: 'Missions tied to streaks. XP bonuses when you hit your goals.'
      },
      {
        id: 'heatmap',
        title: '🗺️ Emotion Heatmap',
        description: 'Visual map of your emotional state over time.'
      },
      {
        id: 'reminders',
        title: '📱 App & Reminders',
        description: 'Download the app and get reminders to keep tracking without friction.'
      }
    ]
  }
};

export function FeatureShowcaseSection({ language = 'es' }: { language?: Language }) {
  const copy = FEATURE_CONTENT[language];

  return (
    <section className="feature-showcase section-pad reveal-on-scroll" id="features">
      <div className="container">
        <div className="feature-showcase__intro">
          <h2>{copy.title}</h2>
          <p className="section-sub">{copy.subtitle}</p>
        </div>

        <div className="feature-showcase__grid">
          {copy.items.map((feature, index) => {
            const Preview = FEATURE_PREVIEWS[feature.id];

            return (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              preview={<Preview language={language} />}
              delay={index * 80}
            />
            );
          })}
        </div>
      </div>
    </section>
  );
}
