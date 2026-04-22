export type EditorGuideStepId =
  | "wheel-core"
  | "wheel-pillars"
  | "wheel-traits"
  | "search"
  | "pillars"
  | "task-list"
  | "new-task"
  | "suggestions";

export interface EditorGuideStep {
  id: EditorGuideStepId;
  title: string;
  copy: string;
  targetSelector?: string;
}

export const EDITOR_GUIDE_STEPS: EditorGuideStep[] = [
  {
    id: "wheel-core",
    title: "Innerbloom",
    copy: "Innerbloom busca crecimiento en todas las direcciones.",
  },
  {
    id: "wheel-pillars",
    title: "Tres pilares",
    copy: "Innerbloom organiza tu crecimiento en tres pilares.",
  },
  {
    id: "wheel-traits",
    title: "30 rasgos",
    copy: "Cada pilar se divide en 10 rasgos para ubicar mejor tus tareas.",
  },
  {
    id: "search",
    title: "Buscador",
    copy: "Acá podés buscar tus tareas.",
    targetSelector: '[data-editor-guide-target="search"]',
  },
  {
    id: "pillars",
    title: "Filtros por pilar",
    copy: "Acá podés filtrar por Body / Mind / Soul.",
    targetSelector: '[data-editor-guide-target="pillars"]',
  },
  {
    id: "task-list",
    title: "Lista de tareas",
    copy: "Abajo ves y administrás tus tareas.",
    targetSelector: '[data-editor-guide-target="task-list"]',
  },
  {
    id: "new-task",
    title: "Nueva tarea",
    copy: "Desde acá creás tareas nuevas.",
    targetSelector: '[data-editor-guide-target="new-task"]',
  },
  {
    id: "suggestions",
    title: "Sugerencias",
    copy: "Acá podés sumar tareas sugeridas a tu sistema.",
    targetSelector: '[data-editor-guide-target="suggestions"]',
  },
];

export const EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY =
  "innerbloom.editor-lab-guide.seen";
