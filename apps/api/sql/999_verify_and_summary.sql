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
-- Script: 999_verify_and_summary.sql
-- Objetivo: Validar la existencia de objetos clave y entregar un resumen ejecutivo.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  rec record;
  v_tab text;
  v_count bigint;
  v_checks constant text[] := ARRAY[
    'public.users',
    'public.game_mode_rules',
    'public.tasks',
    'public.task_logs',
    'public.level_rules',
    'public.daily_emotion',
    'public.daily_energies'
  ];
BEGIN
  RAISE NOTICE '=== Verificación de tablas base ===';
  FOREACH v_tab IN ARRAY v_checks LOOP
    IF to_regclass(v_tab) IS NOT NULL THEN
      RAISE NOTICE 'OK tabla: %', v_tab;
    ELSE
      RAISE NOTICE 'FAIL tabla faltante: %', v_tab;
    END IF;
  END LOOP;

  RAISE NOTICE '=== Verificación de materialized views y vistas ===';
  PERFORM CASE WHEN to_regclass('public.mv_task_days') IS NOT NULL THEN NULL ELSE 1 END;
  IF to_regclass('public.mv_task_days') IS NOT NULL THEN
    RAISE NOTICE 'OK materialized view: public.mv_task_days';
  ELSE
    RAISE NOTICE 'FAIL falta materialized view: public.mv_task_days';
  END IF;

  IF to_regclass('public.mv_task_weeks') IS NOT NULL THEN
    RAISE NOTICE 'OK materialized view: public.mv_task_weeks';
  ELSE
    RAISE NOTICE 'FAIL falta materialized view: public.mv_task_weeks';
  END IF;

  IF to_regclass('public.v_task_streak_max') IS NOT NULL THEN
    RAISE NOTICE 'OK vista: public.v_task_streak_max';
  ELSE
    RAISE NOTICE 'FAIL falta vista: public.v_task_streak_max';
  END IF;

  IF to_regclass('public.v_task_streak_current') IS NOT NULL THEN
    RAISE NOTICE 'OK vista: public.v_task_streak_current';
  ELSE
    RAISE NOTICE 'FAIL falta vista: public.v_task_streak_current';
  END IF;

  IF to_regclass('public.v_task_week_constancy') IS NOT NULL THEN
    RAISE NOTICE 'OK vista: public.v_task_week_constancy';
  ELSE
    RAISE NOTICE 'FAIL falta vista: public.v_task_week_constancy';
  END IF;

  IF to_regclass('public.v_task_week_goal') IS NOT NULL THEN
    RAISE NOTICE 'OK vista: public.v_task_week_goal';
  ELSE
    RAISE NOTICE 'FAIL falta vista: public.v_task_week_goal';
  END IF;

  IF to_regclass('public.v_task_week_max_days') IS NOT NULL THEN
    RAISE NOTICE 'OK vista: public.v_task_week_max_days';
  ELSE
    RAISE NOTICE 'FAIL falta vista: public.v_task_week_max_days';
  END IF;

  IF to_regclass('public.v_energy_today') IS NOT NULL THEN
    RAISE NOTICE 'OK vista: public.v_energy_today';
  ELSE
    RAISE NOTICE 'FAIL falta vista: public.v_energy_today';
  END IF;

  RAISE NOTICE '=== Verificación de índices clave ===';
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_tasks_user_id'
  ) THEN
    RAISE NOTICE 'OK índice idx_tasks_user_id';
  ELSE
    RAISE NOTICE 'FAIL índice faltante idx_tasks_user_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_task_logs_user_performed_at'
  ) THEN
    RAISE NOTICE 'OK índice idx_task_logs_user_performed_at';
  ELSE
    RAISE NOTICE 'FAIL índice faltante idx_task_logs_user_performed_at';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_task_logs_task_performed_at'
  ) THEN
    RAISE NOTICE 'OK índice idx_task_logs_task_performed_at';
  ELSE
    RAISE NOTICE 'FAIL índice faltante idx_task_logs_task_performed_at';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_mv_task_days_user_task_day'
  ) THEN
    RAISE NOTICE 'OK índice idx_mv_task_days_user_task_day';
  ELSE
    RAISE NOTICE 'FAIL índice faltante idx_mv_task_days_user_task_day';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_mv_task_weeks_user_task_week'
  ) THEN
    RAISE NOTICE 'OK índice idx_mv_task_weeks_user_task_week';
  ELSE
    RAISE NOTICE 'FAIL índice faltante idx_mv_task_weeks_user_task_week';
  END IF;

  RAISE NOTICE '=== Resumen de datos sembrados ===';
  SELECT COUNT(*) INTO v_count FROM public.level_rules;
  RAISE NOTICE 'level_rules: % filas', v_count;

  SELECT COUNT(*) INTO v_count FROM public.game_mode_rules;
  RAISE NOTICE 'game_mode_rules: % filas', v_count;

  RAISE NOTICE '=== Muestras de vistas clave (hasta 5 filas) ===';
  IF to_regclass('public.v_task_week_constancy') IS NOT NULL THEN
    FOR rec IN
      SELECT * FROM public.v_task_week_constancy ORDER BY week_start DESC LIMIT 5
    LOOP
      RAISE NOTICE 'v_task_week_constancy → user:% task:% week:% días:%', rec.user_id, rec.task_id, rec.week_start, rec.days_in_week;
    END LOOP;
  END IF;

  IF to_regclass('public.v_task_streak_current') IS NOT NULL THEN
    FOR rec IN
      SELECT * FROM public.v_task_streak_current ORDER BY streak_end_date DESC LIMIT 5
    LOOP
      RAISE NOTICE 'v_task_streak_current → user:% task:% racha:% fin:%', rec.user_id, rec.task_id, rec.current_streak_days, rec.streak_end_date;
    END LOOP;
  END IF;

  RAISE NOTICE 'Verificación finalizada.';
END $$;

COMMIT;
