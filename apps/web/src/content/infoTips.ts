import type { PostLoginLanguage } from '../i18n/postLoginLanguage';

export type InfoKey =
  | 'xpLevel'
  | 'radar'
  | 'emotion'
  | 'dailyEnergy'
  | 'dailyCultivation'
  | 'streaksGuide'
  | 'scopesGuide';

export type InfoTip = {
  title: string;
  bullets: string[];
};

type LocalizedInfoTip = {
  es: InfoTip;
  en: InfoTip;
};

export const INFO_KEYS: InfoKey[] = ['xpLevel', 'radar', 'emotion', 'dailyEnergy', 'dailyCultivation', 'streaksGuide', 'scopesGuide'];

const localizedInfoTips: Record<InfoKey, LocalizedInfoTip> = {
  xpLevel: {
    es: {
      title: '¿Qué ves acá?',
      bullets: [
        '🏆 **GP** = crecimiento acumulado por tu **constancia diaria**.',
        '🎯 **Level** sube cuando alcanzás el siguiente umbral de **GP**.',
        '📊 La barra muestra cuánto te falta para el próximo nivel.',
        '💡 Cada hábito suma **GP**. La constancia construye tu progreso.',
      ],
    },
    en: {
      title: 'What are you seeing here?',
      bullets: [
        '🏆 **GP** = cumulative growth from your **daily consistency**.',
        '🎯 **Level** increases when you reach the next **GP** threshold.',
        '📊 The bar shows how much is left to reach the next level.',
        '💡 Every habit adds **GP**. Consistency builds your progress.',
      ],
    },
  },
  radar: {
    es: {
      title: '¿Qué es el Equilibrio?',
      bullets: [
        '📊 Muestra cómo se distribuye tu crecimiento entre Body, Mind y Soul.',
        '🎯 La forma del radar refleja los GP acumulados de tus rasgos.',
        '🧭 Los porcentajes indican cuánto aporta cada pilar a tu desarrollo total.',
        '💡 Úsalo para ver si tu progreso está equilibrado o si predomina algún pilar. Toca un pilar para explorar sus rasgos.',
      ],
    },
    en: {
      title: 'What is Balance?',
      bullets: [
        '📊 Shows how your growth is distributed across Body, Mind, and Soul.',
        '🎯 The radar shape reflects accumulated GP from your traits.',
        '🧭 The percentages show how much each pillar contributes to your overall development.',
        '💡 Use it to see whether your growth is balanced or dominated by one pillar. Tap a pillar to explore its traits.',
      ],
    },
  },
  emotion: {
    es: {
      title: '¿Qué es el Emotion Chart?',
      bullets: [
        '💗 Registra tus **emociones diarias**.',
        '📅 Te deja ver cómo fuiste sintiéndote con el tiempo.',
        '💡 Detectar patrones emocionales ayuda a tu Journey.',
      ],
    },
    en: {
      title: 'What is the Emotion Chart?',
      bullets: [
        '💗 It tracks your **daily emotions**.',
        '📅 It helps you see how you have been feeling over time.',
        '💡 Spotting emotional patterns helps your Journey.',
      ],
    },
  },
  dailyEnergy: {
    es: {
      title: 'Daily Energy',
      bullets: [
        '⚡ Es la energía que generás al hacer actividades en cada pilar.',
        '❤️ HP → Body',
        '🌼 Mood → Soul',
        '🧠 Focus → Mind',
        '📈 Las actividades cargan tu energía.',
        '💧 Con el tiempo la energía se drena si no la renovás.',
        '💡 Mantenerla alta facilita sostener hábitos y constancia.',
      ],
    },
    en: {
      title: 'Daily Energy',
      bullets: [
        '⚡ It is the energy you generate by doing activities in each pillar.',
        '❤️ HP → Body',
        '🌼 Mood → Soul',
        '🧠 Focus → Mind',
        '📈 Activities charge your energy.',
        '💧 Over time, energy drains if you do not renew it.',
        '💡 Keeping it high makes it easier to sustain habits and consistency.',
      ],
    },
  },
  dailyCultivation: {
    es: {
      title: '¿Qué es Daily Cultivation?',
      bullets: [
        '📈 Muestra los **GP** que ganaste cada día del mes.',
        '📊 El progreso **no siempre es lineal** (y está bien).',
        '💡 Mirá tendencias y celebrá la constancia.',
      ],
    },
    en: {
      title: 'What is Daily Cultivation?',
      bullets: [
        '📈 It shows the **GP** you earned each day of the month.',
        '📊 Progress is **not always linear** (and that is okay).',
        '💡 Watch trends and celebrate consistency.',
      ],
    },
  },
  streaksGuide: {
    es: {
      title: '¿Cómo leer “Rachas”?',
      bullets: [
        '🟣 Barra lila: progreso de la **semana actual** vs objetivo (**N×/sem** según el game mode).',
        '✅ **✓×N** y **+GP**: totales en el **scope** seleccionado (Sem, Mes, 3M).',
        '🔥 **Racha diaria**: días consecutivos sin cortar.',
        '🟩 Mini barras verdes (Top-3): semanas del **mes actual** vs objetivo.',
        '🟩 Barras verdes por tarea: Mes → 4–5 columnas (semanas). Verde si esa semana alcanzó el objetivo; 3M → 3 columnas (meses). Verde “llena” si todas las semanas cumplieron.',
        '🏷️ **Etiquetas**: **1..5** = semanas; **J/A/S** = meses (derecha = mes actual).',
      ],
    },
    en: {
      title: 'How to read “Streaks”?',
      bullets: [
        '🟣 Purple bar: progress for the **current week** vs target (**N×/week** based on game mode).',
        '✅ **✓×N** and **+GP**: totals in the selected **scope** (Week, Month, 3M).',
        '🔥 **Daily streak**: consecutive days without breaks.',
        '🟩 Green mini bars (Top-3): weeks in the **current month** vs target.',
        '🟩 Green bars per task: Month → 4–5 columns (weeks). Green if that week hit target; 3M → 3 columns (months). Solid green if all weeks hit target.',
        '🏷️ **Labels**: **1..5** = weeks; **J/A/S** = months (right = current month).',
      ],
    },
  },
  scopesGuide: {
    es: {
      title: 'Scopes: Sem / Mes / 3M',
      bullets: [
        '**Sem**: todo refleja SOLO la semana actual (la lila siempre es semanal).',
        '**Mes**: chips agregan el mes; barras verdes = semanas **1..N**.',
        '**3M**: chips agregan 90 días; barras verdes = meses **J A S** (derecha = mes actual).',
      ],
    },
    en: {
      title: 'Scopes: Week / Month / 3M',
      bullets: [
        '**Week**: everything reflects ONLY the current week (purple bar is always weekly).',
        '**Month**: chips aggregate the month; green bars = weeks **1..N**.',
        '**3M**: chips aggregate 90 days; green bars = months **J A S** (right = current month).',
      ],
    },
  },
};

export function getInfoTips(language: PostLoginLanguage): Record<InfoKey, InfoTip> {
  const entries = Object.entries(localizedInfoTips).map(([key, value]) => [key, value[language]] as const);
  return Object.fromEntries(entries) as Record<InfoKey, InfoTip>;
}
