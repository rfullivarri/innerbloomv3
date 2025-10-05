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
-- Script: 020_functions_energy.sql
-- Objetivo: Implementar helpers y función principal para el cálculo de energía diaria.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Helper: fecha actual en TZ Europe/Berlin.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_tz_today()
RETURNS date
LANGUAGE sql
AS $$
  SELECT timezone('Europe/Berlin', now())::date;
$$;

-- --------------------------------------------------------------------------
-- Helper: cantidad de días únicos con logs para aplicar regla de gracia.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_unique_days(p_user_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT COUNT(DISTINCT (tl.performed_at AT TIME ZONE 'Europe/Berlin')::date)
  FROM public.task_logs tl
  WHERE tl.user_id = $1;
$$;

-- --------------------------------------------------------------------------
-- Helper: parámetros del modo de juego actual del usuario.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_user_mode_params(p_user_id uuid)
RETURNS TABLE(
  weekly_goal_days int,
  mode_mult numeric(5,2),
  half_life_body int,
  half_life_mind int,
  half_life_soul int
)
LANGUAGE sql
AS $$
  SELECT
    gmr.weekly_goal_days,
    gmr.mode_mult,
    gmr.half_life_body,
    gmr.half_life_mind,
    gmr.half_life_soul
  FROM public.users u
  JOIN public.game_mode_rules gmr ON gmr.mode = u.game_mode
  WHERE u.id = $1;
$$;

-- --------------------------------------------------------------------------
-- Helper: XP base por pilar considerando tareas activas.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_xp_base_by_pillar(p_user_id uuid)
RETURNS TABLE(
  body numeric,
  mind numeric,
  soul numeric
)
LANGUAGE sql
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN pillar = 'BODY' THEN base_xp END), 0)::numeric AS body,
    COALESCE(SUM(CASE WHEN pillar = 'MIND' THEN base_xp END), 0)::numeric AS mind,
    COALESCE(SUM(CASE WHEN pillar = 'SOUL' THEN base_xp END), 0)::numeric AS soul
  FROM public.tasks
  WHERE user_id = $1
    AND COALESCE(is_active, true) = true;
$$;

-- --------------------------------------------------------------------------
-- Helper: última fecha con logs (TZ Berlin).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_last_log_date(p_user_id uuid)
RETURNS date
LANGUAGE sql
AS $$
  SELECT MAX((tl.performed_at AT TIME ZONE 'Europe/Berlin')::date)
  FROM public.task_logs tl
  WHERE tl.user_id = $1;
$$;

-- --------------------------------------------------------------------------
-- Helper: XP del último día con logs, agrupado por pilar.
-- Considera cada tarea una sola vez (usa mv_task_days).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_today_xp_by_pillar(p_user_id uuid)
RETURNS TABLE(
  body numeric,
  mind numeric,
  soul numeric
)
LANGUAGE sql
AS $$
WITH last_day AS (
  SELECT public.fn_last_log_date($1) AS day_date
)
SELECT
  COALESCE(sums.body, 0)::numeric,
  COALESCE(sums.mind, 0)::numeric,
  COALESCE(sums.soul, 0)::numeric
FROM last_day
LEFT JOIN (
  SELECT
    COALESCE(SUM(CASE WHEN t.pillar = 'BODY' THEN t.base_xp END), 0)::numeric AS body,
    COALESCE(SUM(CASE WHEN t.pillar = 'MIND' THEN t.base_xp END), 0)::numeric AS mind,
    COALESCE(SUM(CASE WHEN t.pillar = 'SOUL' THEN t.base_xp END), 0)::numeric AS soul
  FROM public.mv_task_days d
  JOIN public.tasks t ON t.id = d.task_id
  WHERE d.user_id = $1
    AND d.day_date = (SELECT day_date FROM last_day)
) sums ON TRUE;
$$;

-- --------------------------------------------------------------------------
-- Helper: calcula decay a partir del half-life.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_decay_from_half_life(p_half_life int)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  v_half numeric := p_half_life;
BEGIN
  IF v_half IS NULL OR v_half <= 0 THEN
    RETURN 0;
  END IF;
  RETURN 1 - POWER(0.5, 1.0 / v_half);
END;
$$;

-- --------------------------------------------------------------------------
-- Función principal: calcula energía del día, guarda y retorna 0-1.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_energy_today(p_user_id uuid)
RETURNS TABLE(body numeric, soul numeric, mind numeric)
LANGUAGE plpgsql
AS $$
DECLARE
  v_today date := public.fn_tz_today();
  v_unique_days integer := COALESCE(public.fn_unique_days(p_user_id), 0);
  v_mode record;
  v_base record;
  v_today_xp record;
  v_prev record;
  v_prev_body_percent numeric := 60;
  v_prev_soul_percent numeric := 60;
  v_prev_mind_percent numeric := 60;
  v_decay_body numeric := 0;
  v_decay_soul numeric := 0;
  v_decay_mind numeric := 0;
  v_week_max_body numeric := 0;
  v_week_max_soul numeric := 0;
  v_week_max_mind numeric := 0;
  v_daily_goal_body numeric := 0;
  v_daily_goal_soul numeric := 0;
  v_daily_goal_mind numeric := 0;
  v_k_body numeric := 0;
  v_k_soul numeric := 0;
  v_k_mind numeric := 0;
  v_energy_body_percent numeric := 60;
  v_energy_soul_percent numeric := 60;
  v_energy_mind_percent numeric := 60;
BEGIN
  IF v_unique_days < 7 THEN
    body := 1;
    soul := 1;
    mind := 1;
    INSERT INTO public.daily_energies (user_id, date, body, mind, soul)
    VALUES (p_user_id, v_today, body, mind, soul)
    ON CONFLICT (user_id, date) DO UPDATE
      SET body = EXCLUDED.body,
          mind = EXCLUDED.mind,
          soul = EXCLUDED.soul;
    RETURN QUERY SELECT body, soul, mind;
  END IF;

  SELECT * INTO v_mode FROM public.fn_user_mode_params(p_user_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario % no tiene modo configurado en game_mode_rules.', p_user_id;
  END IF;

  SELECT * INTO v_base FROM public.fn_xp_base_by_pillar(p_user_id);
  SELECT * INTO v_today_xp FROM public.fn_today_xp_by_pillar(p_user_id);

  SELECT body, soul, mind INTO v_prev
  FROM public.daily_energies
  WHERE user_id = p_user_id AND date = v_today - 1;

  IF FOUND THEN
    v_prev_body_percent := COALESCE(v_prev.body, 0.6) * 100;
    v_prev_soul_percent := COALESCE(v_prev.soul, 0.6) * 100;
    v_prev_mind_percent := COALESCE(v_prev.mind, 0.6) * 100;
  END IF;

  v_decay_body := public.fn_decay_from_half_life(v_mode.half_life_body);
  v_decay_mind := public.fn_decay_from_half_life(v_mode.half_life_mind);
  v_decay_soul := public.fn_decay_from_half_life(v_mode.half_life_soul);

  v_week_max_body := COALESCE(v_base.body, 0) * COALESCE(v_mode.mode_mult, 1);
  v_week_max_mind := COALESCE(v_base.mind, 0) * COALESCE(v_mode.mode_mult, 1);
  v_week_max_soul := COALESCE(v_base.soul, 0) * COALESCE(v_mode.mode_mult, 1);

  v_daily_goal_body := v_week_max_body / 7.0;
  v_daily_goal_mind := v_week_max_mind / 7.0;
  v_daily_goal_soul := v_week_max_soul / 7.0;

  IF v_daily_goal_body > 0 THEN
    v_k_body := (100 * v_decay_body) / v_daily_goal_body;
  ELSE
    v_k_body := 0;
  END IF;
  IF v_daily_goal_mind > 0 THEN
    v_k_mind := (100 * v_decay_mind) / v_daily_goal_mind;
  ELSE
    v_k_mind := 0;
  END IF;
  IF v_daily_goal_soul > 0 THEN
    v_k_soul := (100 * v_decay_soul) / v_daily_goal_soul;
  ELSE
    v_k_soul := 0;
  END IF;

  v_energy_body_percent := GREATEST(0, LEAST(100,
    (1 - v_decay_body) * v_prev_body_percent + v_k_body * COALESCE(v_today_xp.body, 0)
  ));
  v_energy_mind_percent := GREATEST(0, LEAST(100,
    (1 - v_decay_mind) * v_prev_mind_percent + v_k_mind * COALESCE(v_today_xp.mind, 0)
  ));
  v_energy_soul_percent := GREATEST(0, LEAST(100,
    (1 - v_decay_soul) * v_prev_soul_percent + v_k_soul * COALESCE(v_today_xp.soul, 0)
  ));

  body := ROUND(v_energy_body_percent, 6) / 100;
  mind := ROUND(v_energy_mind_percent, 6) / 100;
  soul := ROUND(v_energy_soul_percent, 6) / 100;

  INSERT INTO public.daily_energies (user_id, date, body, mind, soul)
  VALUES (p_user_id, v_today, body, mind, soul)
  ON CONFLICT (user_id, date) DO UPDATE
    SET body = EXCLUDED.body,
        mind = EXCLUDED.mind,
        soul = EXCLUDED.soul;

  RETURN QUERY SELECT body, soul, mind;
END;
$$;

COMMIT;
