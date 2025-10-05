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
-- Script: 011_mv_and_views_weekly_constancy.sql
-- Objetivo: Consolidar métricas semanales de constancia y exponer vistas derivadas.
-- ============================================================================

BEGIN;

-- Asegurar que la vista materializada y sus dependencias se puedan recrear con
-- el esquema correcto, incluso si versiones previas existían sin days_in_week
-- o con vistas auxiliares antiguas (p.ej. las usadas por el frontend histórico).
-- --------------------------------------------------------------------------
DROP VIEW IF EXISTS public.v_task_streaks_actual;
DROP VIEW IF EXISTS public.v_task_streaks_max;
DROP VIEW IF EXISTS public.v_task_weeks_flags;
DROP VIEW IF EXISTS public.v_task_week_goal;
DROP VIEW IF EXISTS public.v_task_week_max_days;
DROP VIEW IF EXISTS public.v_task_week_constancy;
DROP MATERIALIZED VIEW IF EXISTS public.mv_task_weeks;

-- --------------------------------------------------------------------------
-- Materialized view semanal basada en mv_task_days.
-- Cada fila representa una tarea con actividad en la semana (lunes-domingo ISO).
-- --------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_task_weeks AS
SELECT
  d.user_id,
  d.task_id,
  date_trunc('week', d.day_date::timestamp)::date AS week_start,
  COUNT(*) AS days_in_week,
  MIN(d.day_date) AS first_day_in_week,
  MAX(d.day_date) AS last_day_in_week
FROM public.mv_task_days d
GROUP BY 1,2,3
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_task_weeks_user_task_week
  ON public.mv_task_weeks(user_id, task_id, week_start);

-- --------------------------------------------------------------------------
-- Vista de banderas C1S..C4S por tarea y semana.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_task_week_constancy AS
SELECT
  w.user_id,
  w.task_id,
  w.week_start,
  w.days_in_week,
  (w.days_in_week >= 1) AS c1s,
  (w.days_in_week >= 2) AS c2s,
  (w.days_in_week >= 3) AS c3s,
  (w.days_in_week >= 4) AS c4s,
  w.first_day_in_week,
  w.last_day_in_week
FROM public.mv_task_weeks w;

-- --------------------------------------------------------------------------
-- Vista que evalúa la meta semanal según el modo actual del usuario.
-- Incluye days_in_week y bandera met_goal_this_week.
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_task_week_goal AS
WITH params AS (
  SELECT timezone('Europe/Berlin', now())::date AS today_berlin
)
SELECT
  w.user_id,
  w.task_id,
  w.week_start,
  w.days_in_week,
  gmr.weekly_goal_days,
  (w.days_in_week >= gmr.weekly_goal_days) AS met_goal_this_week,
  gmr.mode_mult,
  gmr.half_life_body,
  gmr.half_life_mind,
  gmr.half_life_soul,
  p.today_berlin
FROM public.mv_task_weeks w
JOIN public.tasks t ON t.id = w.task_id
JOIN public.users u ON u.id = t.user_id
JOIN public.game_mode_rules gmr ON gmr.mode = u.game_mode
CROSS JOIN params p;

-- --------------------------------------------------------------------------
-- Vista con la constancia máxima histórica (cantidad de días con actividad en una semana).
-- --------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_task_week_max_days AS
SELECT
  w.user_id,
  w.task_id,
  MAX(w.days_in_week) AS max_days_in_week
FROM public.mv_task_weeks w
GROUP BY w.user_id, w.task_id;

COMMIT;
