# Monthly Task Difficulty Auto-Calibration — Plan técnico (fase análisis)

## 1) Auditoría del estado actual

### 1.1 Dónde se guarda y usa la dificultad de tareas
- La dificultad persiste en `tasks.difficulty_id` y el XP base en `tasks.xp_base`.
- Al crear/editar tarea, backend resuelve `xp_base` desde `cat_difficulty.xp_base`.
- No existe hoy historial de cambios de dificultad por tarea.

Referencias:
- `create-user-task` calcula `xp_base` según `difficulty_id`. 
- `updateUserTaskRow` recalcula `xp_base` si cambia `difficulty_id`.
- `get-user-tasks` expone `difficulty_id` + `xp_base` para UI.

### 1.2 Dónde se calculan insights/métricas por tarea
- Endpoint dedicado: `GET /tasks/:taskId/insights`.
- Métricas actuales relevantes:
  - `month.totalCount` (completions del mes en curso)
  - `weeks.completionRate`
  - `weeks.timeline` (conteos semanales y si cumplió objetivo)
  - `currentStreak` / `bestStreak`
- El cálculo usa `daily_log` agregado por fecha.

### 1.3 Dónde vive weekly_target por game mode y cómo se accede
- Fuente de verdad: catálogo `cat_game_mode.weekly_target`.
- Exposición principal:
  - `GET /users/me` devuelve `game_mode` + `weekly_target` (join users→cat_game_mode).
  - `GET /users/:id/state` también resuelve `weekly_target` y aplica fallback.
- Cambio de game mode actual: se pisa `users.game_mode_id` (no se guarda historial temporal en tabla propia).

### 1.4 Jobs/crons existentes y ejecución
- No hay scheduler interno en proceso Node para cron continuo.
- Patrón actual: endpoints internos protegidos por `x-cron-secret` en `/internal/cron/*`.
- Jobs actuales: daily reminders, subscription notifications, weekly wrapped.

### 1.5 Endpoints/services que exponen info de tarea (incl. modal detalle)
- Listado tareas usuario: `GET /users/:id/tasks`.
- Insights detalle tarea (modal): `GET /tasks/:taskId/insights`.
- Panel rachas por tarea: `GET /users/:id/streaks/panel`.
- Frontend (`apps/web`) consume ambos (`getTaskInsights`, `getUserStreakPanel`) y no requiere aún cambios para esta fase.

## 2) Diseño funcional backend propuesto

## Objetivo
Agregar un motor único de recalibración mensual de dificultad por tarea, reutilizable por:
1) cron mensual automático,
2) backfill retroactivo one-shot.

## 2.1 Cambios de DB (mínimos y compatibles)

### A) Extender `tasks` (si no existe ya columna utilizable)
- **No obligatorio** si se mantiene `difficulty_id` actual como “fuente vigente”.
- Recomendado agregar (opcional):
  - `last_difficulty_recalibrated_at timestamptz null`
  - `last_difficulty_recalibration_period_start date null`
  - `last_difficulty_recalibration_period_end date null`

Motivo: idempotencia y observabilidad sin alterar APIs existentes.

### B) Nueva tabla de historial (necesaria)
- `task_difficulty_recalibration_history`
  - `id uuid pk`
  - `task_id uuid not null`
  - `user_id uuid not null`
  - `period_start date not null`
  - `period_end date not null` (inclusive)
  - `evaluated_at timestamptz not null default now()`
  - `mode_code text not null`
  - `weekly_target integer not null`
  - `expected_target numeric not null`
  - `actual_completions integer not null`
  - `performance_ratio numeric not null` (actual/expected; si expected=0 => 0 por seguridad)
  - `old_difficulty_id smallint not null`
  - `new_difficulty_id smallint not null`
  - `rule_applied text not null` (`DOWN`, `KEEP`, `UP`, `CLAMP_MIN`, `CLAMP_MAX`, `SKIP_*`)
  - `reason text null` (ej: `task_too_new`, `task_inactive`, `already_recalibrated`)
  - `source text not null` (`cron` | `backfill` | `manual`)
  - `metadata jsonb null`

Índices recomendados:
- único idempotencia: `(task_id, period_start, period_end, source)` o mejor sin `source` para evitar dobles corridas reales.
- lookup por tarea: `(task_id, evaluated_at desc)`.

## 2.2 Motor único de evaluación/recalibración

Servicio nuevo sugerido: `taskDifficultyCalibrationService`.

### Inputs mínimos por tarea
- `task_id`, `user_id`, `created_at`, `active`, `difficulty_id` actual.
- game mode efectivo para el período (regla “último game mode activo en el período”).
- `weekly_target` de ese game mode.
- completions (`SUM(daily_log.quantity)`) dentro de período.

### Reglas obligatorias implementadas en motor
1. **Elegibilidad**
   - `task_age_days > 30` al cierre del período.
   - excluir tareas pausadas/inactivas (`active=false`).
2. **Evaluación**
   - `performance_ratio = actual_completions / expected_target`.
3. **Cambio de dificultad**
   - `> 0.80` ⇒ bajar un nivel
   - `0.50 - 0.79` ⇒ mantener
   - `< 0.50` ⇒ subir un nivel
   - clamp en extremos Easy/Hard.
4. **Cambio de game mode en período**
   - usar **último** game mode activo en el período (sin prorrateo).

### Niveles de dificultad
- Usar `cat_difficulty` para resolver orden (Easy<Medium<Hard) por `code` normalizado y/o `difficulty_id` estable.
- Evitar hardcodear XP; conservar lógica actual de recalcular `xp_base` al actualizar `difficulty_id`.

## 2.3 Definición de período (sin asumir “30 días planos”)

### Periodicidad mensual real (calendario)
- Ejecutar en cierre/apertura mensual.
- Para una ejecución de `YYYY-MM`:
  - `period_start`: primer día de ese mes (zona UTC o TZ de negocio definida).
  - `period_end`: último día de ese mes (inclusive).
- Recomendación operativa: usar mes calendario UTC para consistencia en batch; si producto exige timezone usuario, dejarlo explícito y testear bordes.

### Cálculo de expected target desde weekly_target
- Fórmula propuesta:
  - `days_in_period = period_end - period_start + 1`
  - `expected_target = weekly_target * (days_in_period / 7)`
- Mantener decimal (numeric) para evitar sesgo por redondeo temprano.
- Comparación por ratio con precisión decimal.

### Madurez de tareas
- Condición: `task.created_at <= period_end - interval '30 days'`.
- Así se evita recalibrar tareas nuevas dentro del mes evaluado.

## 2.4 Scheduling / ejecución

### Opción alineada al patrón actual
- Agregar endpoint interno:
  - `POST /internal/cron/monthly-task-difficulty-calibration`
  - protegido con `x-cron-secret` + rate-limit igual que otros cron routes.
- Orquestación externa (Railway cron o equivalente) lo invoca 1 vez por mes.

### Side-effects / consistencia
- Al cambiar `difficulty_id`, actualizar `tasks.xp_base` en la misma transacción.
- Insertar historial siempre (incluyendo `KEEP` y `SKIP`), para trazabilidad total.
- Idempotencia por `(task_id, period_start, period_end)` para no duplicar corridas.

## 3) Plan por pasos (checklist)

1. [ ] **Mapeo final de esquema en prod**
   - Confirmar presencia de `tasks.active`, `tasks.created_at`, `users.game_mode_id`, y si hay cualquier tabla de historial de game mode.
2. [ ] **Migración DB**
   - Crear `task_difficulty_recalibration_history`.
   - (Opcional) columnas de último recalibrado en `tasks`.
3. [ ] **Repositorio de datos**
   - Queries para:
     - candidatas elegibles,
     - completions por período,
     - game mode efectivo (último en período),
     - inserción idempotente de historial.
4. [ ] **Servicio motor único**
   - Función pura de reglas + función de aplicación transaccional (`update tasks + insert history`).
5. [ ] **Cron route interna**
   - Nueva ruta en `routes/internal.ts` siguiendo patrón de seguridad existente.
6. [ ] **Observabilidad**
   - Resumen por corrida: `processed`, `updated`, `kept`, `skipped`, `errors`.
7. [ ] **Tests backend**
   - Unit: umbrales, clamps, expected_target mensual, elegibilidad 30 días.
   - Integration: idempotencia y transacción.
8. [ ] **(Opcional) endpoint admin de auditoría**
   - Lectura paginada de historial por `task_id` para debugging.

## 4) Backfill retroactivo (one-shot)

### Estrategia
- Reusar exactamente el mismo motor mensual.
- Crear runner `runTaskDifficultyBackfill({ fromMonth, toMonth, dryRun })`.
- Iterar meses históricos en orden cronológico por usuario/tarea, aplicando resultados acumulativos (la dificultad del mes N alimenta N+1).

### Seguridad en prod (pocos usuarios)
- Ejecutar en ventanas pequeñas (batch por usuario o por mes).
- Soportar `dryRun=true` para validar métricas antes de mutar.
- Idempotencia fuerte por período/tarea evita duplicados.
- Registrar progreso y reintentos seguros.

## 5) Riesgos / edge cases y resolución

1. **No existe historial de game mode por fecha**
   - Riesgo: no puede saberse “último game mode del período” históricamente.
   - Resolución propuesta:
     - Fase mínima: usar `users.game_mode_id` actual (limitación explícita).
     - Fase recomendada: agregar historial de cambios de game mode (o inferir de eventos onboarding si confiable).

2. **Definición de “tarea pausada” ambigua**
   - Hoy existe `tasks.active`; no hay `paused_at` específico.
   - Resolución: mapear “pausada” a `active=false` hasta que producto defina estado separado.

3. **Cambios de catálogo de dificultad**
   - Si IDs/códigos difieren entre entornos, clamp puede romperse.
   - Resolución: resolver orden desde catálogo vivo y validar presencia de Easy/Medium/Hard al iniciar job.

4. **expected_target muy bajo o cero**
   - Podría generar divisiones inválidas.
   - Resolución: `expected_target <= 0` => ratio 0 y `SKIP_INVALID_TARGET` o regla explícita de fallback.

5. **Re-ejecución accidental del cron**
   - Duplicaría historial/cambios.
   - Resolución: llave única por tarea+período y transacciones idempotentes.

6. **Timezone vs mes calendario**
   - Bordes de fecha pueden variar por usuario.
   - Resolución: fijar política (UTC batch global o TZ usuario) antes de implementar y cubrir tests de borde.

## 6) Lo que existe hoy vs lo que falta

### Existe hoy
- Persistencia de dificultad en `tasks` + sincronización de `xp_base` por catálogo.
- Métricas por tarea disponibles (`/tasks/:taskId/insights`, `/users/:id/streaks/panel`).
- `weekly_target` accesible vía `cat_game_mode` y `users/me`.
- Infra de cron interno con seguridad y rate limit.

### Falta
- Motor de recalibración mensual.
- Historial persistido de recalibraciones por tarea.
- Endpoint/job mensual específico.
- Estrategia formal de backfill usando el mismo motor.
- Fuente robusta de historial temporal de game mode para cumplir regla del “último del período” con precisión histórica.
