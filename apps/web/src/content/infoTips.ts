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

export const infoTips: Record<InfoKey, InfoTip> = {
  xpLevel: {
    title: '¿Qué ves acá?',
    bullets: [
      '🏆 **GP** = experiencia total acumulada.',
      '🎯 **Level** sube al alcanzar el umbral de GP.',
      '📊 La barra muestra el **progreso al próximo nivel**.',
      '💡 Cada hábito suma GP: pequeños pasos, gran avance.',
    ],
  },
  radar: {
    title: '¿Qué es el Radar Chart?',
    bullets: [
      '📊 Muestra tus **rasgos principales** en Body/Mind/Soul.',
      '🧭 Cada punto refleja GP acumulada en ese rasgo.',
      '💡 Útil para ver **balance** y detectar desequilibrios.',
    ],
  },
  emotion: {
    title: '¿Qué es el Emotion Chart?',
    bullets: [
      '💗 Registra tus **emociones diarias**.',
      '📅 Te deja ver cómo fuiste sintiéndote con el tiempo.',
      '💡 Detectar patrones emocionales ayuda a tu Journey.',
    ],
  },
  dailyEnergy: {
    title: '¿Qué es Daily Energy?',
    bullets: [
      '🫀 **HP** → ligado a **Body**.',
      '🏵️ **Mood** → ligado a **Soul**.',
      '🧠 **Focus** → ligado a **Mind**.',
      '🔋 Se cargan con tus actividades (últimos 7 días).',
      '💡 Mantenerlas altas te da motivación y constancia.',
    ],
  },
  dailyCultivation: {
    title: '¿Qué es Daily Cultivation?',
    bullets: [
      '📈 Muestra los **GP** que ganaste cada día del mes.',
      '📊 El progreso **no siempre es lineal** (y está bien).',
      '💡 Mirá tendencias y celebrá la constancia.',
    ],
  },
  streaksGuide: {
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
  scopesGuide: {
    title: 'Scopes: Sem / Mes / 3M',
    bullets: [
      '**Sem**: todo refleja SOLO la semana actual (la lila siempre es semanal).',
      '**Mes**: chips agregan el mes; barras verdes = semanas **1..N**.',
      '**3M**: chips agregan 90 días; barras verdes = meses **J A S** (derecha = mes actual).',
    ],
  },
};
