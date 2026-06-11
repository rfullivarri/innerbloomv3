# Innerbloom 2.0 Mobile Premium - Feedback and Banner Behavior Map

Fecha: 2026-06-03

Objetivo: mapear las superficies visuales de feedback/banners de Labs contra la logica existente del backend/microservicios. El backend y los microservicios son la fuente de verdad; este documento no propone crear APIs nuevas por defecto.

## Correcciones de concepto

- `base pendiente de confirmar`, `primer DQuest pendiente` y `scheduler pendiente` son banners de onboarding. No son categorias separadas: dependen de `user_onboarding_progress`.
- `logro de constancia`, `upgrade suggestion` y `ritmo desbloqueado` son la misma familia de comportamiento: recomendacion activa de subir ritmo generada por analisis mensual/rolling. No deben contarse como tres banners distintos.
- `habitos pendientes de revisar` es distinto de subida de ritmo. Nace del pipeline mensual de `habit_achievement`, queda en estado `pending_decision`, y requiere que el usuario decida si mantiene el tracking o guarda el habito como logrado.
- `revisar resultados de calibracion` es una tercera superficie mensual posible: usa `growth_calibration.latest_results` y debe llevar al detalle de calibracion, no al sheet de subida de ritmo ni al sheet de habitos pendientes.

## Fuentes Backend Identificadas

| Dominio | Backend actual | Frontend actual | Estado |
| --- | --- | --- | --- |
| Onboarding progress | `GET /onboarding/progress`, `POST /onboarding/progress/mark` | Dashboard V3 `Alerts`, Labs local bridge parcial | Existe |
| Generacion de tareas onboarding | `GET /onboarding/generation-status`, `POST /onboarding/journey-ready-modal/seen` | Onboarding quick start / modal ready | Existe |
| Daily Quest | `GET /daily-quest/status`, `GET /daily-quest/definition`, `POST /daily-quest/submit` | Premium DQuest usa endpoints si hay session | Existe |
| Feedback DQuest | `feedback_events` en respuesta de `POST /daily-quest/submit` | Notification popup / Premium DQuest parcial | Existe |
| Rachas | `feedback_events` tipo `streak_milestone`, `GET /users/:id/streaks/panel` | Streak panel + popup | Existe |
| Subida de nivel | `feedback_events` tipo `level_up`, weekly wrapped level up | Popup / Weekly Wrapped | Existe |
| Growth calibration | Pipeline mensual `growth_calibration`, `GET /users/:id/rewards/history` | Premium Rewards detail | Existe |
| Habitos pendientes | Pipeline mensual `habit_achievement`, `GET /users/:id/rewards/history`, task decision endpoints | Premium Rewards pending review | Existe |
| Logro de constancia / subida de ritmo | `GET /game-mode/upgrade-suggestion`, accept/dismiss | Dashboard V3 CTA + Premium Rhythm banner | Existe |
| Scheduler DQuest | `GET/PUT /me/daily-reminder` + `daily_quest_scheduled` | Dashboard V3 alert | Existe |

## Banners de Onboarding

Fuente: `user_onboarding_progress`.

Campos relevantes:

- `tasks_generated_at`
- `first_task_edited_at`
- `returned_to_dashboard_after_first_edit_at`
- `first_daily_quest_prompted_at`
- `first_daily_quest_completed_at`
- `daily_quest_scheduled_at`
- `onboarding_completed_at`

Comportamiento:

| Superficie | Mostrar cuando | Ocultar cuando | Accion |
| --- | --- | --- | --- |
| Journey preparando | task generation esta pending/running o `tasks_generated_at` vacio durante generacion | `tasks_generated_at` existe o falla | Esperar/reintentar |
| Confirmar base | tareas creadas y `first_task_edited_at` vacio | se marca `first_task_edited` | Ir a Tareas/Editor |
| Primer DQuest | `first_task_edited_at` existe y `first_daily_quest_completed_at` vacio | se marca `first_daily_quest_completed` desde submit DQuest | Ir a DQuest |
| Programar DQuest | primer DQuest completado y `daily_quest_scheduled_at` vacio | se crea reminder activo y se marca `daily_quest_scheduled` | Abrir scheduler |
| Journey ready modal | generacion completada y modal no visto para esa generation key | `journey_ready_modal_seen_at` existe | Entrar a dashboard / editar tareas |

Nota: en Innerbloom 2.0 Premium estos deben renderizar con los banners nuevos de Labs, pero la condicion debe seguir saliendo de onboarding progress.

## Habitos Pendientes de Revisar

Fuente: `habit_achievement`.

Backend:

- El pipeline mensual ejecuta `runMonthlyHabitAchievementDetection`.
- Un habito pasa a `pending_decision` si califica por la ventana de logro.
- Thresholds actuales:
  - `aggregateThreshold: 0.8`
  - `monthlyGoalThreshold: 0.8`
  - `minimumMonthsMeetingGoal: 2`
  - `floorThreshold: 0.5`
  - `windowMonths: 3`
  - `pendingDays: 10`
- Mientras esta pendiente, la tarea pasa a lifecycle `achievement_pending`, queda inactive para Daily Quest/growth/mode upgrade y sin seal visible.

Frontend / endpoints:

- `GET /users/:id/rewards/history` devuelve `habit_achievements.pending_count` y `achieved_by_pillar`.
- `POST /tasks/:taskId/habit-achievement/decision` resuelve `maintain` o `store`.
- `POST /tasks/:taskId/habit-achievement/toggle-maintained` cambia tracking despues de logrado.

Comportamiento esperado:

| Superficie | Mostrar cuando | Ocultar cuando | Accion |
| --- | --- | --- | --- |
| Banner Dashboard "Habitos pendientes de revisar" | `habitAchievements.pendingCount > 0` | pending count vuelve a `0` | Ir a Logros / abrir pending review |
| Badge en Logros "Pendientes de revisar" | hay items `status = pending_decision` | todos fueron `maintained`, `stored` o expiraron | Abrir decision sheet |
| Sheet decision | usuario abre pending review | decide `maintain/store` o cierra | Guardar decision |

Pendiente de producto: definir copy exacto del banner Dashboard y si se puede cerrar temporalmente sin decidir. Si se permite cerrar, debe ser dismiss visual local/por periodo, no resolver el pending backend.

## Logro de Constancia / Upgrade Suggestion / Ritmo Desbloqueado

Estos nombres apuntan al mismo comportamiento.

Fuente: `mode_upgrade_aggregation` + `gameModeUpgradeSuggestionService`.

Backend:

- El pipeline mensual corre `runUserMonthlyModeUpgradeAggregation`.
- La agregacion cuenta recalibraciones del periodo con `completion_rate >= 0.80`.
- Calcula:
  - `tasks_total_evaluated`
  - `tasks_meeting_goal`
  - `task_pass_rate`
  - `eligible_for_upgrade`
  - `next_game_mode_id`
- `GET /game-mode/upgrade-suggestion` devuelve la sugerencia activa.
- `POST /game-mode/upgrade-suggestion/accept` acepta y cambia el game mode.
- `POST /game-mode/upgrade-suggestion/dismiss` saltea/descarta la sugerencia del periodo.

Regla actual de visibilidad frontend:

Mostrar si:

- `eligible_for_upgrade = true`
- `cta_enabled = true`
- `suggested_mode` existe
- `accepted_at` es null
- `dismissed_at` es null

Ocultar si:

- usuario acepta
- usuario descarta/skipea
- expira `cta_active_until`
- ya no hay suggested mode valido
- ya no esta eligible

Comportamiento esperado en Premium:

- Banner Dashboard: "Logro de constancia - desbloqueaste un ritmo mas alto".
- CTA: "Revisar recomendacion".
- Sheet/modal debe permitir:
  - aceptar sugerencia
  - skipear/cerrar descartando o posponiendo segun definicion de producto
  - ver todos los ritmos o abrir selector de ritmos antes de confirmar

Gap detectado:

- El sheet Premium actual esta muy orientado a aceptar la sugerencia; hay que ajustar UX para que permita revisar ritmos y saltear de forma clara.
- Confirmar si "cerrar" debe llamar `dismiss` inmediatamente o solo cerrar el sheet. El endpoint `dismiss` ya existe.

## Revisar Resultados de Calibracion

Fuente: `growth_calibration` dentro de `GET /users/:id/rewards/history`.

Datos actuales:

- `growthCalibration.summary.up`
- `growthCalibration.summary.keep`
- `growthCalibration.summary.down`
- `growthCalibration.summary.total`
- `growthCalibration.latestResults[]`

Comportamiento esperado:

| Superficie | Mostrar cuando | Ocultar cuando | Accion |
| --- | --- | --- | --- |
| Banner Dashboard "Revisa tu calibracion mensual" | hay resultados nuevos del ultimo periodo y no fueron revisados | usuario abre resultados o se marca visto | Ir a detalle de calibracion |
| Detalle en Logros | siempre que existan `latestResults` | no aplica | Mostrar up/keep/down por tarea |

Gap detectado:

- Veo datos y UI de detalle, pero no veo un estado claro de "calibracion revisada/vista" por usuario/periodo. Antes de crear nada, confirmar si existe una marca de visto en otro modulo o si el banner debe ser no persistente.

## Daily Quest, Rachas y Nivel

Fuente: respuesta de `POST /daily-quest/submit`.

Backend actual devuelve `feedback_events`:

- `level_up` con `notificationKey = inapp_level_up_popup`
- `streak_milestone` con `notificationKey = inapp_streak_fire_popup`

Rachas:

- El backend calcula streak por tarea activa.
- Usa thresholds configurables desde `feedback_definitions`; default visto en servicio: `[3, 5, 7]`.
- Si una sola tarea cruza umbral, el popup debe ser simple.
- Si varias tareas cruzan el mismo umbral, el popup debe agruparlas.

Subida de nivel:

- El backend compara nivel antes/despues del submit.
- Si cruza umbral, devuelve `level_up`.
- Tambien puede aparecer en Weekly Wrapped como parte del resumen semanal.

Comportamiento esperado:

| Superficie | Mostrar cuando | Ocultar cuando | Accion |
| --- | --- | --- | --- |
| Confirmacion DQuest | submit exitoso | usuario cierra | Volver dashboard |
| Racha simple | feedback event `streak_milestone` con 1 task | usuario cierra / auto dismiss | Ver tareas / cerrar |
| Racha multiple | feedback event `streak_milestone` con varias tasks | usuario cierra | Ver lista / cerrar |
| Subida de nivel | feedback event `level_up` | usuario cierra | Ver progreso / cerrar |

Gap detectado:

- Confirmar prioridad cuando un submit devuelve a la vez confirmacion DQuest, level up y streak milestone. Recomendacion: confirmacion primero, luego level up, luego streaks agrupadas, pero esto requiere validacion de producto.

## Orden de Prioridad Recomendado en Dashboard Premium

1. Onboarding bloqueante: confirmar base, primer DQuest, scheduler.
2. Habitos pendientes de revisar.
3. Revisar resultados de calibracion mensual.
4. Logro de constancia / sugerencia de ritmo.
5. Wrapped semanal/mensual pendiente.
6. Informativos no bloqueantes.

Esta prioridad no crea backend nuevo; solo ordena superficies cuando varias fuentes existentes devuelven estados activos.

## Pendientes Antes de Integrar Produccion

- Ajustar light mode completo.
- Centralizar ES/EN para Premium Labs antes de pasar a produccion.
- Definir responsive desktop: por ahora la version esta pensada como mobile-first. Para login desde browser desktop, usar shell mobile centrada con ancho maximo hasta decidir layout desktop real.
- Confirmar comportamiento de dismiss/skip en:
  - recomendacion de ritmo
  - banner de calibracion revisada
  - habitos pendientes sin decision
- Conectar Dashboard Premium a `getRewardsHistory` para pending habits y calibration banners.
- Conectar Dashboard Premium a `getGameModeUpgradeSuggestion` sin fallback mock en modo productivo.
