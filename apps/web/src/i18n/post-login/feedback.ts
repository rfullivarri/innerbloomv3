import type { PostLoginTranslations } from './types';

export const feedbackTranslations = {
  // Glossary decisions for consistency across Weekly Wrapped and progress popups:
  // - Journey: keep as "Journey" in ES/EN.
  // - Inner Bloom: keep brand as "Inner Bloom" in ES/EN.
  // - dashboard: ES "dashboard" (product term), EN "dashboard".
  // - Streaks: ES formalized as "Rachas" (EN stays "Streaks").
  'feedback.common.close': { es: 'Cerrar', en: 'Close' },
  'feedback.popup.kicker': { es: 'Feedback', en: 'Feedback' },
  'feedback.popup.closeNotificationAria': { es: 'Cerrar notificación', en: 'Close notification' },

  'feedback.weeklyWrapped.intro.label': { es: 'Weekly Wrapped · Preview', en: 'Weekly Wrapped · Preview' },
  'feedback.weeklyWrapped.intro.headline': { es: 'Tus últimos 7 días, en movimiento', en: 'Your last 7 days, in motion' },
  'feedback.weeklyWrapped.intro.fallbackAchievements': {
    es: 'Completaste 0 tareas y sumaste 0 GP en los últimos 7 días.',
    en: 'You completed 0 tasks and earned 0 GP in the last 7 days.',
  },

  'feedback.weeklyWrapped.habits.title': { es: 'Ritmo que se sostiene', en: 'Steady rhythm' },
  'feedback.weeklyWrapped.habits.description': {
    es: 'Estos hábitos aparecieron de forma consistente y mantuvieron tus últimos 7 días en movimiento.',
    en: 'These habits showed up consistently and kept your last 7 days in motion.',
  },
  'feedback.weeklyWrapped.habits.slideLabel': { es: 'CONSTANCIA', en: 'CONSISTENCY' },
  'feedback.weeklyWrapped.habits.headline': { es: 'Constancia', en: 'Consistency' },
  'feedback.weeklyWrapped.habits.subline': {
    es: 'Tus hábitos más firmes sostuvieron el ritmo.',
    en: 'Your strongest habits held the rhythm.',
  },
  'feedback.weeklyWrapped.habits.goalMet': {
    es: 'Meta cumplida {{weeksActive}} de {{weeksSample}} semanas.',
    en: 'Goal met {{weeksActive}} out of {{weeksSample}} weeks.',
  },
  'feedback.weeklyWrapped.habits.empty': {
    es: 'Sin hábitos destacados aún, pero la pista está lista para vos.',
    en: 'No standout habits yet, but your track is ready.',
  },

  'feedback.weeklyWrapped.levelUp.newLabel': { es: 'nuevo', en: 'new' },
  'feedback.weeklyWrapped.levelUp.slideLabel': { es: 'Slide especial · Level Up', en: 'Special slide · Level Up' },
  'feedback.weeklyWrapped.levelUp.headline': { es: 'Subiste a Nivel {{level}}', en: 'You reached Level {{level}}' },
  'feedback.weeklyWrapped.levelUp.mockCopy': {
    es: 'Mock activado para validar la celebración sin afectar métricas.',
    en: 'Mock enabled to validate the celebration without affecting metrics.',
  },
  'feedback.weeklyWrapped.levelUp.realCopy': {
    es: 'Últimos 7 días con salto real: cada misión empujó tu progreso.',
    en: 'The last 7 days show real growth: every mission pushed your progress.',
  },
  'feedback.weeklyWrapped.levelUp.xpChip': { es: 'GP en los últimos 7 días', en: 'GP in the last 7 days' },

  'feedback.weeklyWrapped.metrics.mixedMode': { es: 'modo mixto', en: 'mixed mode' },
  'feedback.weeklyWrapped.metrics.pillarNarrativeMixed': {
    es: 'Tu energía se movió principalmente en modo mixto.',
    en: 'Your energy moved mainly in mixed mode.',
  },
  'feedback.weeklyWrapped.metrics.pillarNarrative': {
    es: 'Tu energía se movió principalmente en el pilar {{pillar}}.',
    en: 'Your energy moved mainly in the {{pillar}} pillar.',
  },
  'feedback.weeklyWrapped.metrics.pillarStatsDetail': {
    es: 'Últimos 7 días: {{xp}} GP · {{completions}} tareas.',
    en: 'Last 7 days: {{xp}} GP · {{completions}} tasks.',
  },
  'feedback.weeklyWrapped.metrics.dominantPillar': { es: 'Pilar dominante', en: 'Dominant pillar' },
  'feedback.weeklyWrapped.metrics.completedTasks': { es: 'Tareas completadas', en: 'Completed tasks' },
  'feedback.weeklyWrapped.metrics.tasksSuffix': { es: 'tareas', en: 'tasks' },
  'feedback.weeklyWrapped.metrics.experience': { es: 'Experiencia', en: 'Experience' },
  'feedback.weeklyWrapped.metrics.experienceSuffix': { es: 'xp', en: 'xp' },

  'feedback.weeklyWrapped.progress.slideLabel': { es: 'PROGRESO Y FOCO', en: 'PROGRESS & FOCUS' },
  'feedback.weeklyWrapped.progress.headline': { es: 'Pequeños avances', en: 'Small wins' },
  'feedback.weeklyWrapped.progress.dailyEnergy': { es: 'Daily Energy', en: 'Daily Energy' },
  'feedback.weeklyWrapped.progress.vsPrevious7Days': { es: 'vs 7 días anteriores', en: 'vs previous 7 days' },
  'feedback.weeklyWrapped.progress.deltaHeadline': {
    es: '{{metric}} {{delta}} vs 7 días anteriores',
    en: '{{metric}} {{delta}} vs previous 7 days',
  },
  'feedback.weeklyWrapped.progress.energyNoData': {
    es: 'Sin datos suficientes para comparar energía con los 7 días anteriores.',
    en: 'Not enough data to compare energy with the previous 7 days.',
  },
  'feedback.weeklyWrapped.progress.energyHighlight': {
    es: 'Energía destacada: {{metric}} ({{current}}%)',
    en: 'Featured energy: {{metric}} ({{current}}%)',
  },
  'feedback.weeklyWrapped.progress.energyFocus.hp': { es: 'tu bienestar físico', en: 'your physical wellbeing' },
  'feedback.weeklyWrapped.progress.energyFocus.focus': { es: 'tu capacidad de enfoque', en: 'your focus capacity' },
  'feedback.weeklyWrapped.progress.energyFocus.mood': { es: 'tu ánimo y bienestar emocional', en: 'your mood and emotional wellbeing' },
  'feedback.weeklyWrapped.progress.energyFocus.story': {
    es: 'En los últimos 7 días tu energía se enfocó en {{area}}; aquí verás cómo evolucionó.',
    en: 'In the last 7 days your energy focused on {{area}}; here you can see how it evolved.',
  },
  'feedback.weeklyWrapped.progress.balanceTitle': { es: 'Balance de esfuerzo', en: 'Effort balance' },
  'feedback.weeklyWrapped.progress.balanceSummary': {
    es: 'Completaste {{total}} tareas, repartidas por dificultad',
    en: 'You completed {{total}} tasks, split by difficulty',
  },
  'feedback.weeklyWrapped.progress.easy': { es: 'Fácil', en: 'Easy' },
  'feedback.weeklyWrapped.progress.medium': { es: 'Media', en: 'Medium' },
  'feedback.weeklyWrapped.progress.hard': { es: 'Difícil', en: 'Hard' },
  'feedback.weeklyWrapped.progress.balanceNoData': { es: 'Sin datos en los últimos 7 días', en: 'No data in the last 7 days' },
  'feedback.weeklyWrapped.progress.balanceStability': {
    es: 'Los últimos 7 días priorizaron estabilidad sobre intensidad',
    en: 'The last 7 days prioritized stability over intensity',
  },
  'feedback.weeklyWrapped.progress.balanceIntensity': {
    es: 'Últimos 7 días de alta exigencia e intensidad',
    en: 'The last 7 days were high-demand and intense',
  },
  'feedback.weeklyWrapped.progress.balanceBalanced': {
    es: 'Buen equilibrio entre constancia e intensidad',
    en: 'Good balance between consistency and intensity',
  },
  'feedback.weeklyWrapped.progress.hardInsightNoData': {
    es: 'Necesitamos más completions en los últimos 7 días para mostrar la dificultad real.',
    en: 'We need more completions in the last 7 days to show real difficulty.',
  },
  'feedback.weeklyWrapped.progress.hardInsightTopTask': {
    es: 'La tarea difícil más repetida fue: {{task}}',
    en: 'The most repeated hard task was: {{task}}',
  },
  'feedback.weeklyWrapped.progress.hardInsightEmpty': {
    es: 'No registraste tareas difíciles en los últimos 7 días.',
    en: 'You did not log hard tasks in the last 7 days.',
  },

  'feedback.weeklyWrapped.emotion.slideLabel': { es: 'EMOCIÓN EN FOCO', en: 'EMOTION IN FOCUS' },
  'feedback.weeklyWrapped.emotion.headline': { es: 'Emoción en foco', en: 'Emotion in focus' },
  'feedback.weeklyWrapped.emotion.description': {
    es: 'Movimiento emocional de los últimos 7 días en un vistazo.',
    en: 'Emotional movement from the last 7 days at a glance.',
  },
  'feedback.weeklyWrapped.emotion.noDominant': { es: 'Sin emoción dominante', en: 'No dominant emotion' },
  'feedback.weeklyWrapped.emotion.weeklyMessageFallback': {
    es: 'Registrá tus emociones para detectar cuál lideró los últimos 7 días.',
    en: 'Log your emotions to detect which one led the last 7 days.',
  },
  'feedback.weeklyWrapped.emotion.biweeklyFallback': { es: 'Seguimos observando', en: 'We are still observing' },
  'feedback.weeklyWrapped.emotion.biweeklyContextFallback': {
    es: 'Con más registros vamos a mostrar la tendencia de los últimos 15 días.',
    en: 'With more logs, we will show the trend for the last 15 days.',
  },
  'feedback.weeklyWrapped.emotion.dominant7Days': { es: 'Emoción dominante (7 días)', en: 'Dominant emotion (7 days)' },
  'feedback.weeklyWrapped.emotion.trend15Days': { es: 'Tendencia emocional (15 días)', en: 'Emotional trend (15 days)' },
  'feedback.weeklyWrapped.emotion.biweeklyTrend': {
    es: 'En los últimos 15 días tu energía se inclinó hacia {{label}}. Aprovechá ese envión.',
    en: 'In the last 15 days your energy leaned toward {{label}}. Use that momentum.',
  },

  'feedback.weeklyWrapped.closing.slideLabel': { es: 'CIERRE', en: 'CLOSING' },
  'feedback.weeklyWrapped.closing.message': {
    es: 'Seguimos sumando: mañana vuelve el Daily Quest.',
    en: 'We keep building: Daily Quest returns tomorrow.',
  },
  'feedback.weeklyWrapped.closing.accent': { es: 'Mañana hay más', en: 'More tomorrow' },
  'feedback.weeklyWrapped.closing.viewAchievements': { es: 'Ver Logros', en: 'View Achievements' },
} satisfies PostLoginTranslations;
