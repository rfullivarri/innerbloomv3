# Diagnóstico técnico: consolidación de onboarding (repo vs foto DB)

## Alcance y método
- Se relevó el estado del código en `apps/api` y `apps/web` para mapear escrituras/lecturas reales de onboarding y post-onboarding.
- No se inspeccionó la DB en vivo; el diagnóstico cruza la foto de DB provista con el uso real de tablas/flags en el repo.

## 1) Mapa write/read exacto (repo ↔ DB)

| Entidad | Escritura (endpoint/controller/service) | Lectura (hooks/components/services) | Momento real del flujo |
|---|---|---|---|
| `onboarding_session` | `POST /api/onboarding/intro` → `submitOnboardingIntro()` → `UPSERT_SESSION_SQL` (insert/update por `(user_id, client_id)`). | Lectura en `getLatestOnboardingSession()` (debug endpoint `/api/debug/onboarding/last`) y contexto de taskgen (`debugTaskgenService.getContextFromDb`). | Al finalizar onboarding intro (snapshot inicial), luego reutilizado como contexto para generación de tasks y debugging. |
| `onboarding_answers` | `submitOnboardingIntro()` → `UPSERT_ANSWERS_SQL` por `onboarding_session_id`. | `getLatestOnboardingSession()` + `debugTaskgenService` (para idioma/tz y señales de contexto). | Persistencia de payload del intro; no hay updates de hitos post-intro. |
| `onboarding_foundations` | `submitOnboardingIntro()` → `upsertFoundations()` (BODY/MIND/SOUL). | `getLatestOnboardingSession()` para debug; no se usa como fuente activa de progreso guiado. | Guardado de foundations durante submit de intro. |
| `users.first_tasks_confirmed` | `POST /api/users/:id/tasks` (`create-user-task`) y `PATCH /api/users/:id/tasks/:taskId` (`updateUserTaskRow`) lo setean `TRUE` cuando hay primera edición/alta manual. | `GET /api/users/:id/journey` lo expone; frontend `useDailyQuestReadiness` lo usa para gates (`canOpenDailyQuest`, `showOnboardingGuidance`). | Hito post-generación: desbloquea Daily Quest guiado. |
| `users.first_tasks_confirmed_at` | Mismos puntos que arriba (`create-user-task` y `updateUserTaskRow`) con `COALESCE(..., NOW())`. | No hay lectura explícita en frontend actual para gating. | Timestamp técnico del primer confirmado de tasks. |
| `users.first_programmed` | `PUT /api/me/daily-reminder` (`updateCurrentUserDailyReminderSettings`) vía `UPDATE_LEGACY_SCHEDULER_SQL` lo pone `TRUE` al activar scheduler. | `GET /api/users/:id/journey` lo devuelve; `Alerts` usa `journey.first_programmed === false` para CTA scheduler. | Hito de “programé recordatorio diario”. |
| `users.scheduler_enabled` + scheduling legacy (`channel_scheduler`, `hour_scheduler`, `status_scheduler`, etc.) | `PUT /api/me/daily-reminder` sincroniza columnas legacy en `users` en cada alta/edición de reminder. | `serializeReminder()` puede tomar estado legacy para respuesta; UI consume `getDailyReminderSettings()` / `updateDailyReminderSettings()`. | Compatibilidad legacy + transición al modelo nuevo de reminders. |
| `user_daily_reminders` | Repositorio `user-daily-reminders.repository`: `createUserDailyReminder`, `updateUserDailyReminder`; orquestado por `PUT /api/me/daily-reminder`. | `GET /api/me/daily-reminder` (`findUserDailyReminderByUserAndChannel`) y UI `DailyReminderSettings` / `ReminderSchedulerDialog`. | Configuración real del scheduler diario (fuente nueva). |
| `moderation_trackers` | `ensureTrackers()` auto-crea defaults al leer/modificar; `updateModerationConfig()` actualiza enabled/paused/tolerance; `recalculateStreak()` actualiza streak. | `getModerationState()` (GET `/api/moderation`) y hook `useModerationWidget`. | Configuración y estado de moderación (alcohol/tabaco/azúcar), usada durante dashboard/post-onboarding. |
| `moderation_daily_logs` | `updateModerationStatus()` (`PUT /api/moderation/:type/status`) upsert por día/tipo. | `getModerationState()` lee estado del día; `recalculateStreak()` lee histórico para racha. | Track diario de moderación dentro de Daily Quest/seguimiento. |
| `tasks` | Taskgen (`triggerTaskGenerationForUser` → `storeTasksWithIdempotency`) inserta tareas iniciales; además CRUD manual (`create-user-task`, `updateUserTaskRow`, `deleteUserTaskRow`). | `GET /api/users/:id/tasks`, Daily Quest (`fetchGroupTasks`), dashboard y readiness (`useDailyQuestReadiness`). | Núcleo post-onboarding: cuando existen tasks, arranca flujo guiado de quest/edición. |
| `daily_log` | `submitDailyQuest()` inserta/actualiza/deleta por fecha y tasks seleccionadas. | `getUserJourney()` (COUNT/MIN), `getDailyQuestStatus()` y otros servicios de métricas/rachas. | Fuente para “first daily quest completed” (derivado). |
| `user_journey_generation_state` | `submitOnboardingIntro()` inicializa `pending`; taskgen trigger/runner transiciona `pending→running→completed/failed`. | `GET /api/onboarding/generation-status`; frontend `JourneyGeneratingScreen`, `DashboardV3`, `journeyGeneration.ts` (sync). | Progreso de generación de journey/tasks después del intro. |
| `user_journey_ready_modal_views` | `POST /api/onboarding/journey-ready-modal/seen` (`markJourneyReadyModalSeen`) por `user_id + generation_key`. | `GET /api/onboarding/generation-status` retorna `journey_ready_modal_seen_at`; `DashboardV3` decide apertura modal + usa `sessionStorage` para no repetir en sesión. | Hito específico: “modal de tareas listas visto” por corrida de generación. |

## 2) Semántica real de `onboarding_session`

Conclusión: **en el repo hoy `onboarding_session` se trata como snapshot del onboarding intro, no como objeto vivo de progreso post-intro**.

Evidencia de uso real:
- Solo se escribe en `submitOnboardingIntro()` durante `POST /api/onboarding/intro` (upsert por `(user_id, client_id)`), junto con `onboarding_answers` y `onboarding_foundations`.
- Sus lecturas productivas son de contexto/debug (taskgen/debug endpoint), no para gates finos de hitos guiados post-intro.
- Los hitos post-intro se resuelven hoy con mezcla de `users` + tablas de dominio (`tasks`, `daily_log`, moderación) + flags frontend (`localStorage/sessionStorage`).

## 3) Inventario de hitos hoy solo frontend/local storage/estado derivado

Hitos sin fuente server-side única explícita (o directamente solo cliente):

1. `moderation_selected` (intención onboarding):
   - Se deriva del payload de foundations BODY y se persiste en `localStorage` (`ib.onboarding.moderationSelected`).
   - Se consume en `DashboardV3` para decidir mostrar sugerencia de moderación.

2. `moderation_modal_shown/resolved` (sugerencia guiada de moderación):
   - `resolved` se persiste solo en `localStorage` (`ib.onboarding.moderationSuggestionResolved`).
   - “shown” no tiene persistencia server-side; depende de condiciones runtime.

3. `first_task_edited`:
   - El nudge UI usa `localStorage` (`ib.onboarding.taskEditorFirstEditDone`) vía `useOnboardingEditorNudge`.
   - En backend existe proxy parcial (`users.first_tasks_confirmed`), pero no distingue semántica exacta de “first edit” vs otros caminos.

4. `returned_to_dashboard_after_first_edit`:
   - Solo `localStorage` (`ib.onboarding.hasReturnedToDashboardAfterEdit`) + navegación runtime.

5. `dashboard pulse dot shown`:
   - Derivado de `shouldShowInlineNotice`/`shouldShowDashboardDot` (estado local hook + localStorage), sin escritura server.

6. `tasks_generated` en UI inmediata:
   - Hay estado server (`user_journey_generation_state`), pero el frontend además usa `localStorage` (`journey_generation_state_v2`) como cache/TTL y `sessionStorage` (`jr_seen_session_*`) para UX de modal.

7. `first_daily_quest_prompted`:
   - No hay columna/hito explícito en server. El prompting se decide por condiciones derivadas (`hasTasks`, `first_tasks_confirmed`, URL/hash, auto-open rules).

## 4) Recomendación concreta de consolidación

### Decisión recomendada
**Crear tabla nueva `user_onboarding_progress` (opción preferida), y mantener `onboarding_session` como snapshot histórico del intro.**

### Por qué esta opción (y no extender `onboarding_session` / `users`)
- `onboarding_session` está modelada/consumida como captura de intro; mezclar hitos vivos post-intro rompe su semántica actual y acopla onboarding histórico con journey operativo.
- `users` ya concentra flags legacy heterogéneos; seguir agregando hitos finos ahí aumenta deuda y ambigüedad.
- Una tabla dedicada permite:
  - fuente de verdad única de hitos guiados,
  - idempotencia por evento,
  - compatibilidad multi-surface (web desktop/mobile/shell),
  - migración gradual sin romper contracts existentes.

## 5) Modelo propuesto (mínimo robusto)

### Tabla: `user_onboarding_progress`
Campos mínimos:
- `user_id uuid PK references users(user_id)`
- `onboarding_session_id uuid null references onboarding_session(onboarding_session_id)`
- `version int not null default 1`
- `state text not null default 'in_progress'` (`in_progress|completed|abandoned`)
- `onboarding_started_at timestamptz null`
- `game_mode_selected_at timestamptz null`
- `moderation_selected_at timestamptz null`
- `tasks_generated_at timestamptz null`
- `first_task_edited_at timestamptz null`
- `returned_to_dashboard_after_first_edit_at timestamptz null`
- `moderation_modal_shown_at timestamptz null`
- `moderation_modal_resolved_at timestamptz null`
- `first_daily_quest_prompted_at timestamptz null`
- `first_daily_quest_completed_at timestamptz null`
- `daily_quest_scheduled_at timestamptz null`
- `onboarding_completed_at timestamptz null`
- `source jsonb not null default '{}'::jsonb` (surface, app version, origin)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Índices mínimos:
- PK por `user_id` (1 fila viva por usuario).
- Índice por `state` + `updated_at` para soporte operativo.

### Semántica de hitos (idempotente)
- Cada `*_at` se setea una sola vez (`COALESCE(existing, now())`).
- `onboarding_completed_at` se completa cuando se cumplen al menos:
  - `tasks_generated_at`
  - `first_task_edited_at`
  - `first_daily_quest_completed_at`
  - `daily_quest_scheduled_at` (si el negocio lo exige; configurable)

## 6) Plan de migración mínimo (sin romper flujos)

### Fase 0 — Esquema y lectura no intrusiva
1. Crear tabla `user_onboarding_progress` + endpoint `GET /api/onboarding/progress`.
2. Implementar “read-through”:
   - si existe fila → devolverla,
   - si no existe → derivar estado inicial desde `users`, `user_journey_generation_state`, `daily_log`, `moderation_trackers` y retornar shape consistente.

### Fase 1 — Dual-write backend
3. En puntos existentes, agregar escrituras idempotentes a la tabla nueva:
   - `POST /onboarding/intro`: `onboarding_started_at`, `game_mode_selected_at`.
   - transición generation state `completed`: `tasks_generated_at`.
   - `create/update task`: `first_task_edited_at` (además de mantener `first_tasks_confirmed`).
   - apertura/cierre modal moderación: `moderation_modal_shown_at` / `moderation_modal_resolved_at`.
   - submit daily quest: `first_daily_quest_completed_at`.
   - activar scheduler: `daily_quest_scheduled_at`.

### Fase 2 — Backfill y puente con localStorage
4. Backfill batch inicial desde datos existentes:
   - `tasks_generated_at` desde `user_journey_generation_state.status='completed'` o presencia de `tasks` activas.
   - `first_daily_quest_completed_at` desde `MIN(daily_log.date)`.
   - `daily_quest_scheduled_at` desde `users.first_programmed=true` o `user_daily_reminders.status='active'`.
5. En frontend, al cargar dashboard/editor:
   - leer flags legacy de localStorage,
   - enviar `POST /api/onboarding/progress/reconcile-client` una sola vez,
   - backend consolida y responde estado canónico,
   - limpiar flags legacy gradualmente (con feature flag).

### Fase 3 — Switch de lectura
6. Migrar gating UI para leer `onboarding/progress` como verdad principal.
7. Mantener fallback legacy por una release window (desktop/mobile web/shell).
8. Luego de estabilizar, deprecar flags frontend redundantes y minimizar uso de `users.first_*` para onboarding guiado.

## 7) Compatibilidad (nuevos, en curso, legacy, superficies)

- **Usuarios nuevos**: crean fila en `user_onboarding_progress` desde `POST /onboarding/intro`; flujo sin dependencia de localStorage.
- **Usuarios a mitad de onboarding**: read-through + dual-write evita saltos de estado; si falta fila, se deriva desde tablas actuales y se crea on-demand.
- **Flags legacy localStorage**: reconciliación one-shot a backend y posterior limpieza progresiva (no bloqueo si storage falla).
- **Desktop / mobile web / mobile shell**: al mover hitos al backend, la verdad queda multi-device por diseño; local/session storage queda solo para UX efímera (no de negocio).

## 8) Riesgos y edge cases

1. **Condiciones de carrera** entre eventos cercanos (task edit + navegación + modal): resolver con updates idempotentes (`COALESCE`) y orden por timestamps server.
2. **Eventos offline/reintentos** desde mobile shell: endpoint de reconcile debe ser idempotente y aceptar lote parcial de hitos.
3. **Diferencias semánticas** entre `first_tasks_confirmed` (legacy) y `first_task_edited` (nuevo): documentar mapping explícito y mantener ambos durante transición.
4. **Inconsistencias históricas** (usuarios con tasks pero sin generation state): backfill debe priorizar evidencia material (`tasks`/`daily_log`) sobre estado transitorio.
5. **UX modal duplicada** (sessionStorage vs backend seen): mantener session guard solo como anti-flicker local, pero decisión de negocio desde backend.
6. **Compat de clients viejos**: no remover endpoints/flags actuales hasta completar ventana de adopción.
