import type { GameMode, Pillar, StepId } from './state';

export type OnboardingLanguage = 'es' | 'en';

const FORM_LABELS_ES = {
  lowBody: [
    'Dormir mejor 😴',
    'Alimentarte mejor 🥗',
    'Moverte un poco más 🏃',
    'Tomar más agua 💧',
    'Descansar sin culpa 🧘',
  ],
  lowSoul: [
    'Respirar profundo unos minutos 🌬️',
    'Escuchar música que te gusta 🎶',
    'Estar en contacto con la naturaleza 🍃',
    'Anotar lo que sentís en un papel 📝',
    'Hacer algo sin tener que ser útil 🌈',
  ],
  lowMind: [
    'Leer algo corto 📖',
    'Anotar tus pensamientos 📓',
    'Mirar una serie tranquila 📺',
    'Hacer una pausa sin pantallas 🚫📱',
    'Desarmar alguna idea negativa 🧩',
  ],
  chillMotiv: [
    '🌱 Crecer como persona / desarrollo personal',
    '🎯 Lograr metas concretas que me propongo',
    '🤝 Sentirme más conectado con otras personas',
    '🧘‍♂️ Vivir con más calma y menos estrés',
    '🏆 Superarme a mí mismo y romper mis límites',
    '🛠️ Crear o construir algo (proyectos, arte, emprendimientos)',
    '✨ Sentirme más feliz y satisfecho con mi día a día',
    '🗺️ Tener más experiencias y aventuras',
    '💖 Cuidar mi salud y bienestar a largo plazo',
  ],
  flowObstacles: [
    'Falta de tiempo',
    'Falta de energía o motivación',
    'Miedo al fracaso',
    'Dudas sobre dónde empezar',
    'Falta de apoyo',
    'Procrastinación',
    'No tengo Hábitos aún',
    'Síndrome del impostor',
  ],
  evolveCommit: [
    'Mis hábitos diarios',
    'Mi alimentación',
    'Mis rutinas de descanso',
    'Mi tiempo libre',
    'Mis relaciones sociales',
    'Mis creencias y bloqueos mentales',
    'Mis espacios físicos',
  ],
  evolveAtt: [
    'Estoy muy motivado y quiero cambios ya',
    'Quiero ir de a poco pero con foco',
    'Me cuesta mantener constancia pero quiero intentar',
  ],
  fBody: [
    '🏃‍♂️ Actividad física regular (Energía)',
    '🥗 Alimentación saludable (Nutrición)',
    '😴 Dormir y descansar mejor (Sueño)',
    '🛀 Relajación y pausas para recuperar el cuerpo (Recuperación)',
    '💧 Tomar más agua o hidratarte mejor (Hidratación)',
    '🧼 Higiene y cuidado personal diario (Higiene)',
    '🌅 Sentirte con más energía y vitalidad al despertar (Vitalidad)',
    '💺 Mejorar tu postura y ergonomía (Postura)',
    '🧘‍♂️ Flexibilidad y movilidad corporal (Movilidad)',
    '🚫 Reducir consumo de alcohol, tabaco o cafeína (Moderación)',
  ],
  fSoul: [
    '🤝 Fortalecer relaciones y vínculos personales (Conexión)',
    '🌌 Practicar espiritualidad o sentir plenitud interior (Espiritualidad)',
    '🎯 Definir tu propósito y dirección en la vida (Propósito)',
    '⚖️ Vivir más alineado a tus valores (Valores)',
    '💗 Ayudar a otros o aportar a una causa (Altruismo)',
    '🔍 Conocerte más profundamente (Insight)',
    '🙏 Practicar gratitud o tener una actitud positiva (Gratitud)',
    '🌳 Conectarte más con la naturaleza (Naturaleza)',
    '🎉 Jugar, reír y divertirte sin culpa (Gozo)',
    '🪞 Trabajar tu autoestima y hablarte con más amabilidad (Autoestima)',
  ],
  fMind: [
    '🎯 Mejorar tu enfoque y productividad diaria (Enfoque)',
    '📚 Aprender cosas nuevas o estudiar mejor (Aprendizaje)',
    '🎨 Desarrollar tu creatividad e ideas nuevas (Creatividad)',
    '😵‍💫 Manejar mejor el estrés o ansiedad (Gestión)',
    '🧠 Regular tus emociones y reacciones (Autocontrol)',
    '💪 Ser más resiliente frente a desafíos (Resiliencia)',
    '🗂️ Tener tus tareas o espacios mentales más organizados (Orden)',
    '🚀 Desarrollarte profesionalmente o avanzar en tu carrera (Proyección)',
    '💰 Mejorar tus hábitos financieros (Finanzas)',
    '🧩 Ejercitar tu memoria y agilidad mental (Agilidad)',
  ],
} as const;

const FORM_LABELS_EN: Record<keyof typeof FORM_LABELS_ES, readonly string[]> = {
  lowBody: [
    'Sleep better 😴',
    'Eat better 🥗',
    'Move a little more 🏃',
    'Drink more water 💧',
    'Rest without guilt 🧘',
  ],
  lowSoul: [
    'Take a few deep breaths 🌬️',
    'Listen to music you like 🎶',
    'Spend time in nature 🍃',
    'Write down what you feel 📝',
    'Do something without needing to be productive 🌈',
  ],
  lowMind: [
    'Read something short 📖',
    'Write down your thoughts 📓',
    'Watch a calming show 📺',
    'Take a no-screen break 🚫📱',
    'Reframe a negative thought 🧩',
  ],
  chillMotiv: [
    '🌱 Grow as a person / personal development',
    '🎯 Achieve concrete goals I set for myself',
    '🤝 Feel more connected with others',
    '🧘‍♂️ Live with more calm and less stress',
    '🏆 Challenge myself and break my limits',
    '🛠️ Create or build something (projects, art, startups)',
    '✨ Feel happier and more fulfilled in daily life',
    '🗺️ Have more experiences and adventures',
    '💖 Take care of my health and long-term wellbeing',
  ],
  flowObstacles: [
    'Lack of time',
    'Low energy or motivation',
    'Fear of failure',
    'Not sure where to start',
    'Lack of support',
    'Procrastination',
    'I do not have habits yet',
    'Impostor syndrome',
  ],
  evolveCommit: [
    'My daily habits',
    'My nutrition',
    'My rest routines',
    'My free time',
    'My social relationships',
    'My beliefs and mental blocks',
    'My physical spaces',
  ],
  evolveAtt: [
    'I am highly motivated and want change now',
    'I want to go step by step but with focus',
    'Consistency is hard for me, but I want to try',
  ],
  fBody: [
    '🏃‍♂️ Regular physical activity (Energy)',
    '🥗 Healthy eating (Nutrition)',
    '😴 Better sleep and recovery (Sleep)',
    '🛀 Relaxation and recovery breaks (Recovery)',
    '💧 Drink more water / better hydration (Hydration)',
    '🧼 Daily hygiene and self-care (Hygiene)',
    '🌅 Feel more energy and vitality in the morning (Vitality)',
    '💺 Improve posture and ergonomics (Posture)',
    '🧘‍♂️ Improve flexibility and mobility (Mobility)',
    '🚫 Reduce alcohol, tobacco, or caffeine consumption (Moderation)',
  ],
  fSoul: [
    '🤝 Strengthen personal relationships and bonds (Connection)',
    '🌌 Practice spirituality or inner fullness (Spirituality)',
    '🎯 Define your purpose and direction in life (Purpose)',
    '⚖️ Live more aligned with your values (Values)',
    '💗 Help others or contribute to a cause (Altruism)',
    '🔍 Know yourself more deeply (Insight)',
    '🙏 Practice gratitude and a positive attitude (Gratitude)',
    '🌳 Connect more with nature (Nature)',
    '🎉 Play, laugh, and enjoy without guilt (Joy)',
    '🪞 Improve self-esteem and self-talk (Self-esteem)',
  ],
  fMind: [
    '🎯 Improve focus and daily productivity (Focus)',
    '📚 Learn new things or study better (Learning)',
    '🎨 Develop creativity and new ideas (Creativity)',
    '😵‍💫 Better manage stress and anxiety (Management)',
    '🧠 Regulate your emotions and reactions (Self-control)',
    '💪 Be more resilient when facing challenges (Resilience)',
    '🗂️ Keep your tasks and mental space organized (Order)',
    '🚀 Grow professionally or advance your career (Projection)',
    '💰 Improve your financial habits (Finances)',
    '🧩 Train memory and mental agility (Agility)',
  ],
};

export const FORM_LABELS = {
  es: FORM_LABELS_ES,
  en: FORM_LABELS_EN,
} as const;

export function getFormLabels(language: OnboardingLanguage) {
  return FORM_LABELS[language];
}

export type ChecklistKey = keyof typeof FORM_LABELS_ES;

export const MODE_LABELS: Record<GameMode, string> = {
  LOW: 'Low Mood 🪫 - Quiero un cambio, pero no tengo la energia',
  CHILL: 'Chill Mood 🌿 - Estoy  bien, quiero trackear mis hábitos',
  FLOW: 'Flow Mood 🌊 - Tengo un objetivo y quiero comenzar esta aventura',
  EVOLVE: 'Evolve Mood 🧬 - Estoy enfocado y quiero ir al próximo nivel',
};

export const MODE_ROUTES: Record<GameMode, StepId[]> = {
  LOW: ['low-body', 'low-soul', 'low-mind', 'low-note', 'summary'],
  CHILL: [
    'chill-open',
    'chill-motiv',
    'foundations-body',
    'foundations-soul',
    'foundations-mind',
    'summary',
  ],
  FLOW: [
    'flow-goal',
    'flow-imped',
    'foundations-body',
    'foundations-soul',
    'foundations-mind',
    'summary',
  ],
  EVOLVE: [
    'evolve-goal',
    'evolve-trade',
    'evolve-att',
    'foundations-body',
    'foundations-soul',
    'foundations-mind',
    'summary',
  ],
};

export const CHECKLIST_PILLARS: Partial<Record<StepId, Pillar | 'ALL'>> = {
  'low-body': 'Body',
  'low-soul': 'Soul',
  'low-mind': 'Mind',
  'foundations-body': 'Body',
  'foundations-soul': 'Soul',
  'foundations-mind': 'Mind',
  'chill-motiv': 'ALL',
  'flow-imped': 'ALL',
  'evolve-trade': 'ALL',
};

export const STEP_XP: Partial<Record<StepId, number>> = {
  'low-body': 13,
  'low-soul': 13,
  'low-mind': 13,
  'foundations-body': 13,
  'foundations-soul': 13,
  'foundations-mind': 13,
  'chill-motiv': 13,
  'flow-imped': 13,
  'evolve-trade': 13,
  'low-note': 21,
  'chill-open': 21,
  'flow-goal': 21,
  'evolve-goal': 21,
  'evolve-att': 21,
};

export const CHECKLIST_LIMITS: Partial<Record<StepId, number>> = {
  'low-body': 5,
  'low-soul': 5,
  'low-mind': 5,
  'foundations-body': 5,
  'foundations-soul': 5,
  'foundations-mind': 5,
};

export const OPEN_TEXT_XP: Partial<Record<StepId, number>> = {
  'low-body': 21,
  'low-soul': 21,
  'low-mind': 21,
  'foundations-body': 21,
  'foundations-soul': 21,
  'foundations-mind': 21,
};
