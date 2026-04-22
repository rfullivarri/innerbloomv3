export type EditorGuideStepId =
  | "wheel-core"
  | "wheel-pillars"
  | "wheel-traits"
  | "modal-entry"
  | "modal-input"
  | "modal-difficulty"
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
      title: "30 rasgos",
      copy: "Cada pilar se divide en 10 rasgos para ubicar mejor tus tareas.",
    },
    {
      id: "modal-entry",
      title: "Nueva tarea",
      copy: "Este modal concentra todo el flujo para crear una nueva tarea.",
      targetSelector: '[data-editor-guide-target="new-task-modal-dialog"]',
      panelPlacement: "top",
    },
    {
      id: "modal-input",
      title: "Descripción / input",
      copy: "Acá escribís la tarea y el contexto para que la clasificación tenga sentido.",
      targetSelector: '[data-editor-guide-target="new-task-modal-input"]',
      panelPlacement: "top",
    },
    {
      id: "modal-difficulty",
      title: "Dificultad",
      copy: "Seleccionás la dificultad esperada antes de pedir la sugerencia.",
      targetSelector: '[data-editor-guide-target="new-task-modal-difficulty"]',
      panelPlacement: "top",
    },
    {
      id: "modal-ai-thinking",
      title: "Sugerencia IA",
      copy: "Tocás la acción de IA, la guía muestra el análisis y ves la sugerencia automática de pilar + rasgo en este mismo paso.",
      targetSelector: '[data-editor-guide-target="new-task-modal-dialog"]',
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
      title: "30 traits",
      copy: "Each pillar is divided into 10 traits so you can place tasks with precision.",
    },
    {
      id: "modal-entry",
      title: "New task",
      copy: "This modal contains the full flow to create a new task.",
      targetSelector: '[data-editor-guide-target="new-task-modal-dialog"]',
      panelPlacement: "top",
    },
    {
      id: "modal-input",
      title: "Description / input",
      copy: "Write the task context here so the classification has clear intent.",
      targetSelector: '[data-editor-guide-target="new-task-modal-input"]',
      panelPlacement: "top",
    },
    {
      id: "modal-difficulty",
      title: "Difficulty",
      copy: "Choose the expected challenge before requesting the suggestion.",
      targetSelector: '[data-editor-guide-target="new-task-modal-difficulty"]',
      panelPlacement: "top",
    },
    {
      id: "modal-ai-thinking",
      title: "AI suggestion",
      copy: "Tap the AI action, see the analysis state, and review the automatic pillar + trait suggestion in this same step.",
      targetSelector: '[data-editor-guide-target="new-task-modal-dialog"]',
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
