import type { AdminInsights, AdminLogRow } from './types';
import { fetchAdminInsights, fetchAdminLogs } from './adminApi';
import { logApiError } from './logger';

export type WeeklyWrappedSection = {
  key: string;
  title: string;
  body: string;
  accent?: string;
  items?: { title: string; body: string; badge?: string }[];
};

export type WeeklyWrappedPayload = {
  mode: 'preview';
  dataSource: 'real' | 'mock';
  variant: 'full' | 'light';
  weekRange: { start: string; end: string };
  summary: {
    pillarDominant: string | null;
    highlight: string | null;
  };
  sections: WeeklyWrappedSection[];
};

type BuildOptions = {
  userId: string;
  dataSource: 'real' | 'mock';
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

export async function buildWeeklyWrappedPreviewPayload(
  options: BuildOptions,
): Promise<WeeklyWrappedPayload> {
  if (options.dataSource === 'mock') {
    return buildMockWeeklyWrapped();
  }

  const [insights, logs] = await Promise.all([
    fetchAdminInsights(options.userId),
    fetchAdminLogs(options.userId, {
      from: toDateInput(daysAgo(6)),
      to: toDateInput(new Date()),
      pageSize: 200,
    }),
  ]);

  return buildWeeklyWrappedFromData(insights, logs.items ?? []);
}

function buildWeeklyWrappedFromData(
  insights: AdminInsights,
  logs: AdminLogRow[],
): WeeklyWrappedPayload {
  const normalizedLogs = logs.map((log) => ({ ...log, parsedDate: new Date(`${log.date}T00:00:00Z`) }));
  const latestLog = normalizedLogs.reduce<Date | null>((latest, log) => {
    if (!latest || log.parsedDate > latest) {
      return log.parsedDate;
    }
    return latest;
  }, null);

  const endDate = latestLog ?? new Date();
  const startDate = daysAgoFrom(endDate, 6);
  const periodLabel = `${formatDate(startDate)} – ${formatDate(endDate)}`;

  const meaningfulLogs = normalizedLogs.filter((log) => (log.state ?? '').toLowerCase() !== 'red');
  const completions = meaningfulLogs.length;
  const xpTotal = meaningfulLogs.reduce((acc, log) => acc + Math.max(0, Number(log.xp ?? 0)), 0);

  const habitCounts = aggregateHabits(meaningfulLogs);
  const topHabits = habitCounts.slice(0, 3);
  const pillarDominant = dominantPillar(insights) ?? null;
  const variant: WeeklyWrappedPayload['variant'] = completions >= 3 ? 'full' : 'light';
  const highlight = topHabits[0]?.title ?? null;

  const sections: WeeklyWrappedSection[] = [
    {
      key: 'intro',
      title: 'Weekly Wrapped',
      body: `Tu semana (${periodLabel}) está lista. Respirá y recorré tus logros.`,
      accent: 'Celebrá el recorrido',
    },
    {
      key: 'achievements',
      title: 'Logros principales',
      body:
        completions > 0
          ? `Completaste ${completions} misiones y hábitos, sumando ${xpTotal.toLocaleString('es-AR')} XP.`
          : 'Semana tranquila: sin registros fuertes, pero el reset también suma.',
      accent: completions > 0 ? 'Impulso sostenido' : 'Ritmo liviano',
    },
    {
      key: 'habits',
      title: 'Hábitos constantes',
      body:
        topHabits.length > 0
          ? 'Estos hábitos marcaron tu ritmo y mantuvieron la semana en movimiento.'
          : 'Aún no registramos hábitos destacados esta semana, pero estás a un clic de retomarlos.',
      items:
        topHabits.length > 0
          ? topHabits.map((habit) => ({
              title: habit.title,
              body: `${habit.count}/7 días en marcha. ${habit.pillar ? `${habit.pillar} te acompañó.` : 'Constancia pura.'}`,
              badge: habit.badge,
            }))
          : undefined,
    },
    {
      key: 'improvement',
      title: 'Movimiento y mejoras',
      body:
        highlight
          ? `${highlight} tuvo su mini salto esta semana. Pequeñas mejoras que sostienen el largo plazo.`
          : 'No vimos mejoras claras, así que priorizamos el descanso y volvemos a empujar mañana.',
      accent: highlight ? 'Nivel up suave' : 'Preparando la próxima racha',
    },
    {
      key: 'pillar',
      title: 'Pilar dominante',
      body:
        pillarDominant
          ? `${pillarDominant} lideró tu energía estos días. Seguí apoyándote en ese foco.`
          : 'Sin un pilar dominante esta semana: espacio abierto para explorar Body, Mind o Soul.',
      accent: pillarDominant ?? 'Balanceado',
    },
    {
      key: 'highlight',
      title: 'Highlight de la semana',
      body:
        highlight
          ? `Tu momento destacado: ${highlight}. Guardá ese recuerdo para arrancar la próxima misión.`
          : 'Todavía no hay un highlight definido, pero ya tenemos el lienzo listo para el próximo.',
      accent: highlight ? '🔥 Momentum' : 'Listo para despegar',
    },
    {
      key: 'closing',
      title: 'Cierre',
      body: 'Seguimos. Mañana vuelve el Daily Quest para sumar más.',
      accent: 'Mañana hay más',
    },
  ];

  return {
    mode: 'preview',
    dataSource: 'real',
    variant,
    weekRange: { start: startDate.toISOString(), end: endDate.toISOString() },
    summary: { pillarDominant, highlight },
    sections,
  };
}

function aggregateHabits(logs: (AdminLogRow & { parsedDate: Date })[]) {
  const map = new Map<
    string,
    { title: string; count: number; pillar: string | null; badge: string | undefined }
  >();

  for (const log of logs) {
    const key = log.taskName || log.taskId;
    if (!key) {
      continue;
    }
    const current = map.get(key) ?? {
      title: log.taskName || 'Hábito sin nombre',
      count: 0,
      pillar: log.pillar ?? null,
      badge: undefined,
    };
    current.count += 1;
    if (!current.badge && current.count >= 5) {
      current.badge = 'racha activa';
    }
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function dominantPillar(insights: AdminInsights): string | undefined {
  const entries: { code: string; value: number }[] = [
    { code: 'Body', value: insights.constancyWeekly.body ?? 0 },
    { code: 'Mind', value: insights.constancyWeekly.mind ?? 0 },
    { code: 'Soul', value: insights.constancyWeekly.soul ?? 0 },
  ];
  const top = entries.sort((a, b) => b.value - a.value)[0];
  if (!top || top.value <= 0) {
    return undefined;
  }
  return top.code;
}

function buildMockWeeklyWrapped(): WeeklyWrappedPayload {
  const start = daysAgo(6);
  const end = new Date();

  return {
    mode: 'preview',
    dataSource: 'mock',
    variant: 'full',
    weekRange: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      pillarDominant: 'Mind',
      highlight: 'Meditación al amanecer',
    },
    sections: [
      {
        key: 'intro',
        title: 'Weekly Wrapped',
        body: `Tu semana (${formatDate(start)} – ${formatDate(end)}) está lista. Respirá y recorré tus logros.`,
        accent: 'Vista previa mock',
      },
      {
        key: 'achievements',
        title: 'Logros principales',
        body: '3 misiones completadas y +320 XP. Cerraste la semana con energía.',
        accent: 'Impulso sostenido',
      },
      {
        key: 'habits',
        title: 'Hábitos constantes',
        body: 'Estos hábitos mantuvieron la llama encendida.',
        items: [
          { title: 'Respiración consciente', body: '7/7 días. Ritmo impecable.', badge: 'racha activa' },
          { title: 'Hidratación', body: '5/7 días. Más energía durante el día.' },
          { title: 'Stretch ligero', body: '4/7 días. Tu cuerpo lo agradece.' },
        ],
      },
      {
        key: 'improvement',
        title: 'Movimiento y mejoras',
        body: 'Sumaste una mejora: le diste forma a “Cierre digital” y lo repetiste 3 veces.',
        accent: 'Nivel up suave',
      },
      {
        key: 'pillar',
        title: 'Pilar dominante',
        body: 'Mind dominó tu semana: más foco, menos ruido.',
        accent: 'Mind',
      },
      {
        key: 'highlight',
        title: 'Highlight de la semana',
        body: 'Rompiste la barrera: 5 días seguidos meditando. Tu constancia ya es un hábito.',
        accent: '🔥 Momentum',
      },
      {
        key: 'closing',
        title: 'Cierre',
        body: 'Seguimos. Mañana vuelve el Daily Quest para sumar más.',
        accent: 'Mañana hay más',
      },
    ],
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', DATE_FORMAT);
}

function toDateInput(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function daysAgo(days: number): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - days);
  return now;
}

function daysAgoFrom(reference: Date, days: number): Date {
  const copy = new Date(reference);
  copy.setDate(copy.getDate() - days);
  return copy;
}

export function logWeeklyWrappedError(error: unknown) {
  logApiError('[admin][weekly-wrapped] failed to build preview', { error });
}
