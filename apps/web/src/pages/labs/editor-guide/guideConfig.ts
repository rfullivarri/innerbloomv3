export type EditorGuideStepId =
  | "wheel-core"
  | "wheel-pillars"
  | "wheel-traits"
  | "modal-entry"
  | "modal-core"
  | "modal-ai-thinking"
  | "filters"
  | "task-list"
  | "suggestions";

export interface EditorGuideStep {
  id: EditorGuideStepId;
  title: string;
  copy: string;
  targetSelector?: string;
  panelPlacement?: "top" | "bottom" | "center";
}

const EDITOR_GUIDE_STEPS_BY_LOCALE: Record<"es" | "en", EditorGuideStep[]> = {
  es: [
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
      title: "Rasgos",
      copy: "Cada pilar se divide en 10 rasgos para ubicar mejor tus tareas.",
    },
    {
      id: "modal-entry",
      title: "Nueva tarea",
      copy: "Este chip flotante es el punto de entrada para iniciar una nueva tarea.",
      targetSelector: '[data-editor-guide-target="new-task-trigger"]',
      panelPlacement: "top",
    },
    {
      id: "modal-core",
      title: "Descripción + dificultad",
      copy: "Primero describís la tarea y definís la dificultad esperada para contextualizar la clasificación.",
      targetSelector: '[data-editor-guide-target="new-task-modal-core"]',
      panelPlacement: "top",
    },
    {
      id: "modal-ai-thinking",
      title: "Sugerencia IA",
      copy: "Acá ves solo el flujo IA: generar categoría, análisis, resultado coherente pilar + rasgo y acciones secundarias.",
      targetSelector: '[data-editor-guide-target="new-task-modal-ai-zone"]',
      panelPlacement: "top",
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
      id: "suggestions",
      title: "Sugerencias",
      copy: "Excelente. Con este botón podés sumar ideas base y seguir iterando tu sistema.",
      targetSelector: '[data-editor-guide-target="suggestions"]',
      panelPlacement: "center",
    },
  ],
  en: [
    {
      id: "wheel-core",
      title: "Innerbloom",
      copy: "Innerbloom supports growth in every direction.",
    },
    {
      id: "wheel-pillars",
      title: "Three pillars",
      copy: "Innerbloom structures your growth across three pillars.",
    },
    {
      id: "wheel-traits",
      title: "Traits",
      copy: "Each pillar is divided into 10 traits so you can place tasks with precision.",
    },
    {
      id: "modal-entry",
      title: "New task",
      copy: "This floating chip is the entry point to start a new task.",
      targetSelector: '[data-editor-guide-target="new-task-trigger"]',
      panelPlacement: "top",
    },
    {
      id: "modal-core",
      title: "Description + difficulty",
      copy: "First describe the task, then set the expected difficulty to frame the classification.",
      targetSelector: '[data-editor-guide-target="new-task-modal-core"]',
      panelPlacement: "top",
    },
    {
      id: "modal-ai-thinking",
      title: "AI suggestion",
      copy: "This zone shows the AI flow only: generate category, analysis state, coherent pillar + trait result, and secondary actions.",
      targetSelector: '[data-editor-guide-target="new-task-modal-ai-zone"]',
      panelPlacement: "top",
    },
    {
      id: "filters",
      title: "Search + filters",
      copy: "Use this area to find tasks fast and filter by pillar.",
      targetSelector: '[data-editor-guide-target="search-pillar-zone"]',
      panelPlacement: "bottom",
    },
    {
      id: "task-list",
      title: "Task list",
      copy: "This is where you review and manage your tasks.",
      targetSelector: '[data-editor-guide-target="task-list"]',
      panelPlacement: "top",
    },
    {
      id: "suggestions",
      title: "Suggestions",
      copy: "Great. Use this button to add starter ideas and keep refining your system.",
      targetSelector: '[data-editor-guide-target="suggestions"]',
      panelPlacement: "center",
    },
  ],
};

export function getEditorGuideSteps(locale: "es" | "en"): EditorGuideStep[] {
  return EDITOR_GUIDE_STEPS_BY_LOCALE[locale];
}

export const EDITOR_GUIDE_FIRST_TIME_STORAGE_KEY =
  "innerbloom.editor-lab-guide.seen";
