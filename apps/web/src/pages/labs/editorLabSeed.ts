export type EditorLabSeedPillar = 'Body' | 'Mind' | 'Soul';

export interface EditorLabSeedTask {
  id: string;
  pillar: EditorLabSeedPillar;
  trait: string;
  title: string;
}

export const EDITOR_LAB_QUICK_START_SEED: EditorLabSeedTask[] = [
  { id: 'body-energia', pillar: 'Body', trait: 'ENERGIA', title: 'Caminar durante 20 minutos' },
  { id: 'body-nutricion', pillar: 'Body', trait: 'NUTRICION', title: 'Hacer 2 comidas equilibradas al día' },
  { id: 'body-sueno', pillar: 'Body', trait: 'SUENO', title: 'Dormir al menos 7 horas por noche' },
  { id: 'body-hidratacion', pillar: 'Body', trait: 'HIDRATACION', title: 'Tomar 6 vasos de agua al día' },
  { id: 'body-movilidad', pillar: 'Body', trait: 'MOVILIDAD', title: 'Hacer movilidad o estiramientos durante 10 minutos' },
  { id: 'mind-enfoque', pillar: 'Mind', trait: 'ENFOQUE', title: 'Trabajar con foco profundo durante 25 minutos' },
  { id: 'mind-aprendizaje', pillar: 'Mind', trait: 'APRENDIZAJE', title: 'Leer o aprender durante 20 minutos' },
  { id: 'mind-creatividad', pillar: 'Mind', trait: 'CREATIVIDAD', title: 'Dedicar 15 minutos a crear o idear' },
  { id: 'mind-orden', pillar: 'Mind', trait: 'ORDEN', title: 'Ordenar mi espacio o mis tareas' },
  { id: 'mind-proyeccion', pillar: 'Mind', trait: 'PROYECCION', title: 'Dar un paso hacia una meta personal' },
  { id: 'soul-calma', pillar: 'Soul', trait: 'CALMA', title: 'Respirar y bajar revoluciones durante 5 minutos' },
  { id: 'soul-gratitud', pillar: 'Soul', trait: 'GRATITUD', title: 'Anotar 3 cosas por las que agradezco hoy' },
  { id: 'soul-proposito', pillar: 'Soul', trait: 'PROPOSITO', title: 'Conectar con mi propósito del día' },
  { id: 'soul-empatia', pillar: 'Soul', trait: 'EMPATIA', title: 'Tener un gesto consciente de empatía' },
  { id: 'soul-presencia', pillar: 'Soul', trait: 'PRESENCIA', title: 'Hacer una pausa para estar presente' },
];
