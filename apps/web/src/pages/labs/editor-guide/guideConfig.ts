export type EditorGuideStepId =
  | "wheel-core"
  | "wheel-pillars"
  | "wheel-traits"
  | "filters"
  | "task-list"
  | "new-task"
  | "suggestions";

export interface EditorGuideStep {
  id: EditorGuideStepId;
  title: string;
  copy: string;
  targetSelector?: string;
  panelPlacement?: "top" | "bottom" | "center";
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
    id: "filters",
    title: "Buscador + filtros",
    copy: "Desde acá encontrás tareas rápido y filtrás por pilar.",
    targetSelector: '[data-editor-guide-target="search-pillar-zone"]',
    panelPlacement: "bottom",
  },
  {
    id: "task-list",
    title: "Lista de tareas",
    copy: "Abajo ves y administrás tus tareas.",
    targetSelector: '[data-editor-guide-target="task-list"]',
    panelPlacement: "top",
  },
  {
    id: "new-task",
    title: "Nueva tarea",
    copy: "Desde acá creás tareas nuevas.",
    targetSelector: '[data-editor-guide-target="new-task"]',
    panelPlacement: "top",
  },
  {
    id: "suggestions",
    title: "Sugerencias",
    copy: "Excelente. Con este botón podés sumar ideas base y seguir iterando tu sistema.",
    targetSelector: '[data-editor-guide-target="suggestions"]',
    panelPlacement: "center",
  },
];

export const EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY =
  "innerbloom.editor-lab-guide.seen";
