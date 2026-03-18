import type { OnboardingLanguage } from './constants';
import type { GameMode, Pillar } from './state';

export type ModerationOption = 'sugar' | 'tobacco' | 'alcohol';

export interface QuickStartTask {
  id: string;
  trait: string;
  text: string;
  inputBefore?: string;
  inputAfter?: string;
  helper?: string;
  suggestions?: string[];
}

export const QUICK_START_MINIMUMS: Record<GameMode, number> = {
  LOW: 1,
  CHILL: 2,
  FLOW: 3,
  EVOLVE: 3,
};

export const QUICK_START_TASKS: Record<OnboardingLanguage, Record<Pillar, QuickStartTask[]>> = {
  es: {
    Body: [
      { id: 'ENERGIA', trait: 'ENERGIA', text: 'Caminar durante', inputAfter: 'minutos' },
      { id: 'NUTRICION', trait: 'NUTRICION', text: 'Hacer', inputAfter: 'comida(s) equilibrada(s) al día' },
      { id: 'SUENO', trait: 'SUENO', text: 'Dormir al menos', inputAfter: 'horas por noche' },
      {
        id: 'RECUPERACION',
        trait: 'RECUPERACION',
        text: 'Hacer una pausa de recuperación durante el día',
        suggestions: ['frenar unos minutos', 'cerrar los ojos', 'respirar', 'bajar estímulos', 'estirar un poco'],
      },
      { id: 'HIDRATACION', trait: 'HIDRATACION', text: 'Tomar', inputAfter: 'vaso(s) de agua al día' },
      {
        id: 'HIGIENE',
        trait: 'HIGIENE',
        text: 'Completar mi rutina de higiene personal',
        suggestions: ['lavarme la cara', 'bañarme', 'lavarme los dientes', 'ponerme crema', 'ordenar mi cuidado básico'],
      },
      {
        id: 'VITALIDAD',
        trait: 'VITALIDAD',
        text: 'Empezar el día con una rutina activadora',
        suggestions: ['abrir la ventana', 'mover el cuerpo', 'tomar agua', 'estirarme', 'evitar arrancar con el móvil'],
      },
      {
        id: 'POSTURA',
        trait: 'POSTURA',
        text: 'Cuidar mi postura o ergonomía',
        suggestions: ['sentarme mejor', 'ajustar la pantalla', 'apoyar bien la espalda', 'cambiar de posición', 'revisar cómo trabajo'],
      },
      { id: 'MOVILIDAD', trait: 'MOVILIDAD', text: 'Hacer movilidad o estiramientos durante', inputAfter: 'minutos' },
      { id: 'MODERACION', trait: 'MODERACION', text: 'Mejorar mi relación con ciertos consumos o excesos' },
    ],
    Mind: [
      { id: 'ENFOQUE', trait: 'ENFOQUE', text: 'Trabajar con foco profundo durante', inputAfter: 'minutos' },
      { id: 'APRENDIZAJE', trait: 'APRENDIZAJE', text: 'Leer, estudiar o aprender durante', inputAfter: 'minutos' },
      { id: 'CREATIVIDAD', trait: 'CREATIVIDAD', text: 'Dedicar', inputAfter: 'minutos a crear, escribir o idear' },
      {
        id: 'GESTION',
        trait: 'GESTION',
        text: 'Tomarme un momento para respirar, bajar revoluciones o regularme',
        suggestions: ['respirar profundo', 'salir del ruido', 'pausar', 'soltar tensión', 'bajar ansiedad'],
      },
      {
        id: 'AUTOCONTROL',
        trait: 'AUTOCONTROL',
        text: 'Prestar atención a mis acciones impulsivas',
        suggestions: ['notar cuándo reacciono rápido', 'observar impulsos', 'frenar antes de responder', 'detectar automatismos'],
      },
      {
        id: 'RESILIENCIA',
        trait: 'RESILIENCIA',
        text: 'Hacer algo que me desafíe o me saque de mi zona de confort',
        suggestions: ['iniciar una conversación difícil', 'probar algo nuevo', 'hacer algo que vengo evitando', 'sostener una incomodidad útil'],
      },
      {
        id: 'ORDEN',
        trait: 'ORDEN',
        text: 'Ordenar mi espacio, mis tareas o mi mente',
        suggestions: ['ordenar el escritorio', 'vaciar pendientes mentales', 'limpiar una superficie', 'reorganizar tareas', 'poner algo en su lugar'],
      },
      {
        id: 'PROYECCION',
        trait: 'PROYECCION',
        text: 'Dar un paso hacia una meta personal o profesional',
        suggestions: ['enviar un mensaje importante', 'avanzar una idea', 'actualizar CV o portfolio', 'terminar una tarea clave', 'mover una meta un paso'],
      },
      {
        id: 'FINANZAS',
        trait: 'FINANZAS',
        text: 'Revisar mis gastos, ahorro o presupuesto',
        suggestions: ['mirar movimientos', 'registrar gastos', 'revisar presupuesto', 'controlar suscripciones', 'ver cuánto ahorré'],
      },
      { id: 'AGILIDAD', trait: 'AGILIDAD', text: 'Entrenar mi memoria o agilidad mental durante', inputAfter: 'minutos' },
    ],
    Soul: [
      { id: 'CONEXION', trait: 'CONEXION', text: 'Hablar con', inputAfter: 'persona(s) con presencia real' },
      { id: 'ESPIRITUALIDAD', trait: 'ESPIRITUALIDAD', text: 'Dedicar', inputAfter: 'minutos a meditar, rezar o conectar conmigo' },
      {
        id: 'PROPOSITO',
        trait: 'PROPOSITO',
        text: 'Hacer una acción alineada con mi propósito',
        suggestions: ['avanzar algo importante', 'elegir con intención', 'hacer algo que tenga sentido para mí', 'dedicar tiempo a lo que valoro'],
      },
      {
        id: 'VALORES',
        trait: 'VALORES',
        text: 'Tomar una decisión alineada con mis valores',
        suggestions: ['decir que no a algo que no va conmigo', 'elegir con coherencia', 'actuar como quiero ser', 'sostener un criterio importante'],
      },
      {
        id: 'ALTRUISMO',
        trait: 'ALTRUISMO',
        text: 'Hacer un gesto de ayuda o aporte a otros',
        suggestions: ['ayudar a alguien', 'escribir a alguien que lo necesite', 'compartir algo útil', 'colaborar', 'acompañar'],
      },
      {
        id: 'INSIGHT',
        trait: 'INSIGHT',
        text: 'Reflexionar sobre cómo me siento',
        suggestions: ['notar cómo me sentí hoy', 'identificar qué necesito', 'observar qué me afectó', 'darme un momento para escucharme'],
      },
      { id: 'GRATITUD', trait: 'GRATITUD', text: 'Registrar', inputAfter: 'cosa(s) por las que siento gratitud' },
      {
        id: 'NATURALEZA',
        trait: 'NATURALEZA',
        text: 'Conectar con la naturaleza',
        suggestions: ['salir a tomar aire', 'mirar el cielo', 'caminar entre árboles', 'sentarme al sol', 'conectar con algo natural'],
      },
      { id: 'GOZO', trait: 'GOZO', text: 'Dedicar', inputAfter: 'minutos a jugar, reír o disfrutar sin culpa' },
      {
        id: 'AUTOESTIMA',
        trait: 'AUTOESTIMA',
        text: 'Tomarme tiempo para cuidar de mí',
        suggestions: ['cortarme las uñas', 'peinarme', 'arreglarme el pelo', 'cuidarme la barba', 'vestirme con más cariño', 'hacer algo que me haga bien'],
      },
    ],
  },
  en: {
    Body: [
      { id: 'ENERGIA', trait: 'ENERGY', text: 'Walk for', inputAfter: 'minutes' },
      { id: 'NUTRICION', trait: 'NUTRITION', text: 'Have', inputAfter: 'balanced meal(s) per day' },
      { id: 'SUENO', trait: 'SLEEP', text: 'Sleep at least', inputAfter: 'hours per night' },
      { id: 'RECUPERACION', trait: 'RECOVERY', text: 'Take a recovery break during the day' },
      { id: 'HIDRATACION', trait: 'HYDRATION', text: 'Drink', inputAfter: 'glass(es) of water per day' },
      { id: 'HIGIENE', trait: 'HYGIENE', text: 'Complete my personal hygiene routine' },
      { id: 'VITALIDAD', trait: 'VITALITY', text: 'Start the day with an activating routine' },
      { id: 'POSTURA', trait: 'POSTURE', text: 'Improve posture or ergonomics' },
      { id: 'MOVILIDAD', trait: 'MOBILITY', text: 'Do mobility or stretching for', inputAfter: 'minutes' },
      { id: 'MODERACION', trait: 'MODERATION', text: 'Improve my relationship with certain consumptions or excesses' },
    ],
    Mind: [
      { id: 'ENFOQUE', trait: 'FOCUS', text: 'Work with deep focus for', inputAfter: 'minutes' },
      { id: 'APRENDIZAJE', trait: 'LEARNING', text: 'Read, study or learn for', inputAfter: 'minutes' },
      { id: 'CREATIVIDAD', trait: 'CREATIVITY', text: 'Spend', inputAfter: 'minutes creating or writing' },
      { id: 'GESTION', trait: 'REGULATION', text: 'Take a moment to breathe and regulate myself' },
      { id: 'AUTOCONTROL', trait: 'SELF_CONTROL', text: 'Notice my impulsive reactions' },
      { id: 'RESILIENCIA', trait: 'RESILIENCE', text: 'Train my response to frustration or change' },
      { id: 'ORDEN', trait: 'ORDER', text: 'Organize tasks, space, or priorities' },
      { id: 'PROYECCION', trait: 'PROJECTION', text: 'Take one step toward a personal or professional goal' },
      { id: 'FINANZAS', trait: 'FINANCES', text: 'Review spending, savings or budget' },
      { id: 'AGILIDAD', trait: 'AGILITY', text: 'Train memory or mental agility for', inputAfter: 'minutes' },
    ],
    Soul: [
      { id: 'CONEXION', trait: 'CONNECTION', text: 'Talk with', inputAfter: 'person(s) with real presence' },
      { id: 'ESPIRITUALIDAD', trait: 'SPIRITUALITY', text: 'Spend', inputAfter: 'minutes meditating, praying, or reconnecting with myself' },
      { id: 'PROPOSITO', trait: 'PURPOSE', text: 'Take one action aligned with my purpose' },
      { id: 'VALORES', trait: 'VALUES', text: 'Make a decision aligned with my values' },
      { id: 'ALTRUISMO', trait: 'ALTRUISM', text: 'Do one helpful gesture for someone else' },
      { id: 'INSIGHT', trait: 'INSIGHT', text: 'Reflect on how I feel' },
      { id: 'GRATITUD', trait: 'GRATITUDE', text: 'Log', inputAfter: 'thing(s) I feel grateful for' },
      { id: 'NATURALEZA', trait: 'NATURE', text: 'Connect with nature' },
      { id: 'GOZO', trait: 'JOY', text: 'Spend', inputAfter: 'minutes playing, laughing, or enjoying without guilt' },
      { id: 'AUTOESTIMA', trait: 'SELF_ESTEEM', text: 'Take time to care for myself' },
    ],
  },
};

export function computeQuickStartGp(selectedByPillar: Record<Pillar, string[]>) {
  const counts = {
    Body: selectedByPillar.Body.length,
    Mind: selectedByPillar.Mind.length,
    Soul: selectedByPillar.Soul.length,
  };
  const balancedBonusActive = counts.Body > 0 && counts.Body === counts.Mind && counts.Mind === counts.Soul;
  const baseTotalGp = (counts.Body + counts.Mind + counts.Soul) * 3;
  const total = balancedBonusActive ? Math.ceil(baseTotalGp * 1.5) : baseTotalGp;
  return {
    counts,
    balancedBonusActive,
    xp: {
      Body: counts.Body * 3,
      Mind: counts.Mind * 3,
      Soul: counts.Soul * 3,
      total,
    },
  };
}
