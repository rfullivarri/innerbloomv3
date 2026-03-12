# Demo experience map

- **Ruta demo:** `/demo` (registrada en `apps/web/src/App.tsx`).
- **Demo data centralizada:** `apps/web/src/config/demoData.ts`.
- **Guided steps centralizados:** `apps/web/src/config/demoGuidedTour.ts`.
- **Copy demo ES/EN centralizada + idioma/fallback:** `apps/web/src/config/demoContent.ts`.
  - Prioridad idioma: `localStorage` (`innerbloom.demo.language`) -> `navigator.language` (`es*` => ES, resto => EN).
- **Salida de demo:** botón `✕` en header de `/demo` que vuelve a `/`.
- **Preparado para iteraciones futuras:**
  - Telemetría demo base (`demo_opened`, `demo_guided_started`, `demo_step_viewed`, `demo_guided_skipped`, `demo_guided_completed`, `demo_exited`, `demo_cta_clicked`) en `apps/web/src/lib/telemetry.ts`.
  - `Task Detail` demo desacoplado de backend vía `DEMO_TASKS`.
  - Info dots reutilizables por card con el mismo patrón visual en `DemoCard`.
