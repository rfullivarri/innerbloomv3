# Auditoría de regresión del onboarding (INNERBLOOM)

Fecha: 2026-03-13  
Scope auditado: login/post-login → onboarding intro → generación de primeras tareas → editor → regreso dashboard → moderación onboarding → Daily Quest inicial → programación Daily Quest.

---

## 1) Mapa del flujo actual real (según código)

1. **Onboarding Intro**
   - El flujo envía `POST /onboarding/intro` y persiste la selección de moderación en **localStorage** con la key `ib.onboarding.moderationSelected` usando `hasModerationSelection(payload.data.foundations.body)`.  
   - Luego marca generación de journey en estado local (`setJourneyGenerationPending`) y permite ir a dashboard o a demo guiada.  

2. **Entrada a Dashboard post-onboarding**
   - Dashboard consume `useDailyQuestReadiness`, que depende de:
     - `GET /users/:id/tasks` → `hasTasks`
     - `GET /users/:id/journey` → `first_tasks_confirmed`, `completed_first_daily_quest`
   - Si hay tareas pero `first_tasks_confirmed` no se actualiza/recarga bien, varios gates de onboarding quedan bloqueados.

3. **Primer edit de tarea (Editor)**
   - El banner + dot no dependen de DB: dependen de `useOnboardingEditorNudge` y dos flags locales:
     - `ib.onboarding.taskEditorFirstEditDone`
     - `ib.onboarding.hasReturnedToDashboardAfterEdit`
   - El primer flag se marca solo al ejecutar `markFirstEditDone()` en `handleEditSuccess` del modal de edición del editor.

4. **Regreso a dashboard + dot/badge**
   - El dot aparece si `firstEditDone && !hasReturnedToDashboardAfterEdit && !completedFirstDailyQuest`.
   - `hasReturnedToDashboardAfterEdit` hoy solo se marca cuando se abre Daily Quest desde `handleOpenDaily`; **no** se marca de forma explícita al simplemente volver al dashboard.

5. **Moderación onboarding modal/sugerencia**
   - La sugerencia de moderación abre solo si: `firstTasksConfirmed && !completedFirstDailyQuest && hasModerationOnboardingIntent && !moderationSuggestionResolved && !moderation.isLoading`.
   - Si `hasModerationOnboardingIntent` no está en localStorage, hay fallback por `profile/journey` (`hasModerationBodyFocus`) pero depende de campos que no están garantizados por los tipos actuales del perfil/journey.

6. **Daily Quest y scheduler**
   - `canOpenDailyQuest = hasTasks && firstTasksConfirmed`.
   - `canAutoOpenDailyQuestPopup = canOpenDailyQuest && completedFirstDailyQuest` (esto habilita auto-open sólo después de completar primera quest; no para la primera quest).
   - El CTA/scheduler final depende de `first_programmed` y otras condiciones dentro del dashboard/alerts.

---

## 2) Mapa del flujo esperado histórico

1. Usuario completa onboarding y genera primeras tareas.
2. Usuario edita su primera tarea en editor.
3. En ese momento aparece **banner persistente en editor** + **dot lila pulsante en Dashboard**.
4. Usuario vuelve al dashboard y recibe la guía siguiente (incluyendo moderación si fue seleccionada).
5. Se dispara CTA de primera Daily Quest.
6. Al completar primera Daily Quest, se habilita CTA de programación y cierre de onboarding.

---

## 3) Regresiones detectadas

### R1. Fuente de verdad fragmentada para moderación onboarding
- La intención de moderación se escribe en `localStorage` al terminar onboarding intro.
- El modal/sugerencia depende de esa flag local más condiciones de journey.
- Si la flag local se pierde (nuevo contexto WebView, limpieza storage, cambio de host/sesión), el fallback intenta leer `bodyFocus` de profile/journey, pero ese dato no está asegurado estructuralmente por el contrato actual tipado.
- Resultado: el usuario selecciona moderación, pero no siempre aparece el modal/sugerencia.

### R2. Trigger del banner/dot depende sólo del éxito de un único handler UI
- `markFirstEditDone()` se dispara únicamente en `handleEditSuccess` de `EditTaskModal` del editor.
- Si la edición se hace fuera de ese camino (otro entry point/flow paralelo), no se marca el hito local aunque el usuario haya “editado tareas”.
- Resultado: banner y dot no aparecen pese a que funcionalmente sí hubo edición percibida.

### R3. Inconsistencia mobile web vs mobile app shell
- En web responsive, el dot se pinta vía `MobileBottomNav` (`showPulseDot`).
- En app móvil nativa (tab bar RN), no existe integración con el estado de onboarding nudge; no hay prop/estado equivalente para pulse dot.
- Resultado: lógica no consistente entre superficies mobile (web vs app contenedor).

### R4. Condición de moderación atada a `firstTasksConfirmed`
- La sugerencia/moderación onboarding recién abre cuando `firstTasksConfirmed` es true.
- Si ese estado llega tarde/stale o no se refresca en el momento esperado, el modal no aparece en el “momento correcto”.

### R5. Auto-open de Daily Quest no representa “primera quest pendiente”
- `canAutoOpenDailyQuestPopup` requiere `completedFirstDailyQuest = true`; por definición no autoabre la primera.
- No necesariamente bug, pero sí cambio de semántica respecto de expectativas históricas de onboarding guiado.

---

## 4) Análisis de estado y persistencia (hito por hito)

| Hito | Dónde se escribe | Dónde se lee | Riesgo actual |
|---|---|---|---|
| onboarding started/completed | API onboarding session + local state onboarding provider | backend taskgen + navegación | correcto, pero no centraliza hitos post-onboarding |
| moderation selected | localStorage (`ib.onboarding.moderationSelected`) | DashboardV3 effect | frágil por depender de storage local no versionado |
| tasks generated | backend + polling generation-status + get tasks | DashboardV3 / readiness | sensible a timing/polling |
| first task edited | localStorage (`ib.onboarding.taskEditorFirstEditDone`) | Editor + Dashboard nudge | depende de un solo handler UI |
| return to dashboard prompted | derivado de nudge flags locales | editor/banner + nav dot | no persistido en DB |
| dashboard highlighted (dot) | derivado local | Navbar/MobileBottomNav web | no llega a native tab bar |
| moderation modal shown/resolved | localStorage resolved flag + moderation widget state | DashboardV3 | posible desalineación al perder local state |
| first daily quest completed | DB derivado (`daily_log`) | `GET /users/:id/journey` | estable |
| daily quest scheduled | DB (`first_programmed`) | Alerts/flows | estable |
| onboarding completed | implícito por combinaciones de flags | múltiples componentes | no hay estado único explícito |

---

## 5) Causas raíz (por síntoma reportado)

### A) “No apareció modal de moderación”
Causas probables combinadas:
1. La intención de moderación está en localStorage y puede no sobrevivir al salto de contexto (onboarding → demo → dashboard en otro contenedor/session storage profile).  
2. El fallback por profile/journey busca `bodyFocus/body_focus` no garantizado en el contrato actual de datos.  
3. El gate exige `firstTasksConfirmed`; si ese dato no está listo en el timing esperado, la sugerencia no abre.

### B) “No apareció banner persistente del editor”
Causa probable:
- El hito “primera edición” depende de `markFirstEditDone()` ejecutado solo en un handler específico (`handleEditSuccess` de `EditTaskModal`).
- Cualquier edición fuera de ese camino deja el hito sin marcar.

### C) “No apareció dot pulsante en Dashboard”
Causas probables:
1. Si no se marcó `firstEditDone`, no hay dot.
2. En mobile app shell nativa no hay wiring del dot (la navbar nativa no consume estado onboarding nudge).

### D) “Onboarding gobernado de forma inconsistente”
- Hoy hay mezcla de: DB flags (`first_tasks_confirmed`, `first_programmed`, daily logs), localStorage flags (moderation intent, editor nudge), y derivaciones por queries con timing distinto.
- Falta una “fuente de verdad” explícita para hitos de onboarding post-intro.

---

## 6) Archivos relevantes

### Frontend web
- `apps/web/src/pages/OnboardingIntro.tsx`
- `apps/web/src/lib/moderationOnboarding.ts`
- `apps/web/src/pages/DashboardV3.tsx`
- `apps/web/src/hooks/useOnboardingEditorNudge.ts`
- `apps/web/src/pages/editor/index.tsx`
- `apps/web/src/hooks/useDailyQuestReadiness.ts`
- `apps/web/src/components/layout/Navbar.tsx`
- `apps/web/src/components/layout/MobileBottomNav.tsx`
- `apps/web/src/pages/DemoDashboard.tsx`
- `apps/web/src/config/demoGuidedTour.ts`

### Backend/API
- `apps/api/src/controllers/logs/get-user-journey.ts`
- `apps/api/src/services/user-tasks.service.ts`
- `apps/api/src/controllers/tasks/update-user-task.ts`
- `apps/api/src/controllers/tasks/create-user-task.ts`

### Mobile app shell
- `apps/mobile/components/native-tab-bar.tsx`
- `apps/mobile/constants/routes.ts`

---

## 7) Código obsoleto / riesgoso / duplicado

1. **Riesgo de dead-path funcional:** fallback `hasModerationBodyFocus()` en DashboardV3 depende de campos no tipados en `CurrentUserProfile`/journey; puede vivir como lógica “que parece cubrir” pero no cubre en runtime real.
2. **Flags locales paralelas sin reconciliación server-side:** editor nudge y moderación intent/resolved viven solo en localStorage.
3. **Lógica paralela web vs native móvil:** web nav soporta dot onboarding; native tab bar no.
4. **Gates acoplados por timing de múltiples queries:** moderación suggestion depende simultáneamente de readiness + moderation widget + local intent.

---

## 8) Propuesta de restauración mínima (sin re-arquitectura total)

1. **Persistir en backend un `onboarding_progress` mínimo** (o extender user flags) con hitos:
   - `moderation_selected`
   - `first_task_edited`
   - `moderation_suggestion_shown`
   - `returned_to_dashboard_after_first_edit`
   - `first_daily_quest_completed` (ya derivable)
   - `daily_quest_scheduled` (ya existe equivalente)

2. **Usar local state sólo como acelerador visual inmediato**, y reconciliar con DB en background:
   - write-through: al marcar primer edit, además del local flag, disparar mutation idempotente.
   - read-through: dashboard decide con DB + cache local (DB manda).

3. **Unificar trigger de primer edit**:
   - mover el disparo a un punto transversal de “task update success” (hook/mutation layer), no solo a un modal específico.

4. **Hacer robusta la moderación onboarding intent**:
   - evitar depender exclusivamente de localStorage.
   - poblar intent desde payload onboarding en backend y exponerlo en endpoint del usuario.

5. **Paridad mobile**:
   - exponer estado del dot a la capa native-tab-bar (o renderizar dot dentro del webview tab strategy de forma consistente).

6. **Ajustar criterio de auto-open Daily Quest** (si se quiere recuperar comportamiento histórico guiado):
   - separar `canAutoOpenFirstDailyQuest` de `canAutoOpenCompletedQuest`.

---

## 9) Validación manual preparada

### Caso 1 (con moderación)
1. Usuario nuevo inicia onboarding.
2. Selecciona moderación en foundations body.
3. Finaliza intro, genera tareas.
4. Entra a editor y edita 1 tarea (save exitoso).
5. Verificar banner persistente en editor.
6. Verificar dot pulsante en Dashboard (desktop + mobile web + mobile app shell).
7. Volver a dashboard y verificar modal/sugerencia de moderación.
8. Activar o cerrar moderación.
9. Verificar CTA de primera Daily Quest.
10. Completar primera Daily Quest.
11. Verificar CTA para programar Daily Quest.
12. Programar y validar cierre de onboarding.

### Caso 2 (sin moderación)
1. Usuario nuevo inicia onboarding sin marcar moderación.
2. Genera tareas.
3. Edita primera tarea.
4. Verificar banner + dot.
5. Volver dashboard y verificar que NO abre moderación onboarding.
6. Verificar CTA primera Daily Quest.
7. Completar quest, programar, y cierre correcto.

### Caso 3 (paridad mobile/desktop)
1. Repetir Caso 1 y 2 en desktop web.
2. Repetir en mobile web responsive.
3. Repetir en app mobile nativa (WebView shell).
4. Confirmar misma lógica de hitos, variando solo UI.

