import type { UserTask } from '../../lib/api';

export type MobilePremiumMetric = {
  label: string;
  value: string;
  detail: string;
  trend: string;
};

export type MobilePremiumQuest = {
  title: string;
  tag: string;
  progress: number;
  tone: 'mint' | 'sky' | 'rose';
};

export type MobilePremiumAchievement = {
  title: string;
  detail: string;
  state: 'earned' | 'close' | 'locked';
};

export type MobilePremiumEmotionPoint = {
  label: string;
  calm: number;
  focus: number;
  energy: number;
};

const now = new Date('2026-05-20T09:00:00.000Z').toISOString();

export const mobilePremiumDemoTasks: UserTask[] = [
  {
    id: 'mobile-premium-demo-task-1',
    title: 'Respirar 4 minutos antes de empezar el bloque profundo',
    pillarId: 'mind',
    traitId: 'focus',
    statId: 'clarity',
    difficultyId: 'soft',
    isActive: true,
    xp: 35,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
  },
  {
    id: 'mobile-premium-demo-task-2',
    title: 'Cerrar una tarea pequeña que lleva más de 48 horas abierta',
    pillarId: 'body',
    traitId: 'momentum',
    statId: 'activation',
    difficultyId: 'medium',
    isActive: true,
    xp: 55,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
  },
  {
    id: 'mobile-premium-demo-task-3',
    title: 'Escribir una línea honesta sobre cómo llegó tu energía hoy',
    pillarId: 'soul',
    traitId: 'reflection',
    statId: 'presence',
    difficultyId: 'soft',
    isActive: true,
    xp: 25,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    archivedAt: null,
  },
];

export const mobilePremiumDemoMetrics: MobilePremiumMetric[] = [
  { label: 'Balance', value: '82', detail: 'Ritmo estable', trend: '+6%' },
  { label: 'Energía', value: '68', detail: 'Sube al mediodía', trend: '+12' },
  { label: 'Focus', value: '74', detail: '2 bloques listos', trend: '+9' },
];

export const mobilePremiumDemoQuests: MobilePremiumQuest[] = [
  { title: 'Skill Route · Focus Flow', tag: '3 nodos', progress: 72, tone: 'sky' },
  { title: 'Daily Quest', tag: 'Hoy', progress: 48, tone: 'mint' },
  { title: 'Reset emocional', tag: 'Suave', progress: 28, tone: 'rose' },
];

export const mobilePremiumDemoAchievements: MobilePremiumAchievement[] = [
  { title: 'Racha consciente', detail: '5 dias activos', state: 'earned' },
  { title: 'Focus Builder', detail: '2 tareas para desbloquear', state: 'close' },
  { title: 'Balance semanal', detail: 'Disponible al cerrar la semana', state: 'locked' },
];

export const mobilePremiumDemoEmotionPoints: MobilePremiumEmotionPoint[] = [
  { label: 'L', calm: 42, focus: 48, energy: 35 },
  { label: 'M', calm: 58, focus: 54, energy: 49 },
  { label: 'X', calm: 51, focus: 68, energy: 57 },
  { label: 'J', calm: 64, focus: 61, energy: 72 },
  { label: 'V', calm: 70, focus: 74, energy: 63 },
  { label: 'S', calm: 76, focus: 52, energy: 58 },
  { label: 'D', calm: 82, focus: 67, energy: 69 },
];
