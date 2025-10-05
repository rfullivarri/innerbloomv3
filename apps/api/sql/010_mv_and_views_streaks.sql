-- ============================================================================
-- LÓGICA DE NEGOCIO (copiada textual):
-- 1) Racha DIARIA por tarea (streak)
--    TZ: Europe/Berlin.
--    Un día cuenta si la tarea tuvo ≥1 log ese día.
--    Racha actual: # de días consecutivos que terminan hoy. Si hoy no hubo log, racha actual = 0.
--    Racha máxima: máximo histórico de días consecutivos.
--    Ejemplos: Lun-Vie ⇒ racha 5. 21 días seguidos y fallás el 22 ⇒ vuelve a 0.
-- 2) Constancia SEMANAL (panel C1S..C4S, tiers/rewards)
--    Semana ISO lunes–domingo, TZ Europe/Berlin.
--    days_in_week = # de días con log esa semana para la tarea.
--    Banderas por semana: C1S(≥1), C2S(≥2), C3S(≥3), C4S(≥4).
--    Constancia actual: en semana vigente, ¿cumple la meta del modo?
--    Constancia máxima: máximo histórico de days_in_week por tarea.
--    Game Mode ⇒ meta de días/semana: LOW→1, CHILL→2, FLOW→3, EVOLVE→4.
--    No afecta la regla de racha diaria.
-- 3) Daily Energy (barras Body/Mind/Soul)
--    Gracia: si el usuario tiene < 7 días únicos con logs en total ⇒ 100% en las 3 barras.
--    Modelo leaky tank por pilar.
--    Half-life por modo y pilar ⇒ decay = 1 - 0.5^(1/H).
--    100% semanal por modo: xpSemanaMax[p] = xpBase[p] * mode_mult.
--    Objetivo diario: xpDiaObj[p] = xpSemanaMax[p] / 7.
--    Conversión XP→energía: k[p] = (100 * decay[p]) / xpDiaObj[p] (si >0).
--    Actualización: E_today[p] = clamp(0,100, (1-decay[p]) * E_prev[p] + k[p] * XP_hoy[p])
--    XP_hoy[p] = suma de base_xp de todas las tasks del pilar en el último día con logs.
--    Guardar 0–1 (porcentaje/100). Si no hay E_prev, inicializar en 60%.
-- ============================================================================
-- Script: 010_mv_and_views_streaks.sql
-- Objetivo: Construir materialized view diaria y vistas de rachas de tareas.
--           Todas las operaciones son idempotentes y sin cambios destructivos.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Materialized view diaria de logs por tarea, ajustando a TZ Europe/Berlin.
-- Múltiples logs en un mismo día cuentan como un solo día.
-- --------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_task_days AS
SELECT
  tl.user_id,
  tl.task_id,
  (tl.performed_at AT TIME ZONE 'Europe/Berlin')::date AS day_date,
  COUNT(*) AS logs_count,
  MIN(tl.performed_at) AS first_log_at,
  MAX(tl.performed_at) AS last_log_at
FROM public.task_logs tl
GROUP BY 1,2,3
WITH NO DATA;

-- Índice para acelerar joins y ordenamientos de racha.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_task_days_user_task_day
  ON public.mv_task_days(user_id, task_id, day_date);

-- --------------------------------------------------------------------------
-- Vista de racha máxima histórica por tarea usando técnica de gaps & islands.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_task_streak_max AS
WITH ordered AS (
  SELECT
    user_id,
    task_id,
    day_date,
    day_date - ROW_NUMBER() OVER (PARTITION BY user_id, task_id ORDER BY day_date) * INTERVAL '1 day' AS streak_anchor
  FROM public.mv_task_days
),
segmentos AS (
  SELECT
    user_id,
    task_id,
    streak_anchor,
    MIN(day_date) AS streak_start_date,
    MAX(day_date) AS streak_end_date,
    COUNT(*) AS streak_days
  FROM ordered
  GROUP BY user_id, task_id, streak_anchor
)
SELECT
  user_id,
  task_id,
  MAX(streak_days) AS max_streak_days
FROM segmentos
GROUP BY user_id, task_id;

-- --------------------------------------------------------------------------
-- Vista de racha actual: solo incluye tareas con log en la fecha de hoy (TZ Berlin).
-- Si hoy no hubo log, la tarea no aparece (el backend debe tratar como 0).
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_task_streak_current AS
WITH params AS (
  SELECT timezone('Europe/Berlin', now())::date AS today_berlin
), ordered AS (
  SELECT
    d.user_id,
    d.task_id,
    d.day_date,
    d.day_date - ROW_NUMBER() OVER (PARTITION BY d.user_id, d.task_id ORDER BY d.day_date) * INTERVAL '1 day' AS streak_anchor
  FROM public.mv_task_days d
  WHERE d.day_date <= (SELECT today_berlin FROM params)
), segmentos AS (
  SELECT
    user_id,
    task_id,
    streak_anchor,
    MIN(day_date) AS streak_start_date,
    MAX(day_date) AS streak_end_date,
    COUNT(*) AS streak_days
  FROM ordered
  GROUP BY user_id, task_id, streak_anchor
)
SELECT
  s.user_id,
  s.task_id,
  s.streak_days AS current_streak_days,
  s.streak_start_date,
  s.streak_end_date
FROM segmentos s
JOIN params p
  ON s.streak_end_date = p.today_berlin;

COMMIT;
