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
-- Script: 900_destructive_cleanup.sql
-- Objetivo: Limpieza opcional de objetos antiguos, protegida por bandera app.allow_destructive.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_flag text := current_setting('app.allow_destructive', true);
  rec record;
  v_allowed constant text[] := ARRAY[
    'mv_task_days',
    'v_task_streak_max',
    'v_task_streak_current',
    'mv_task_weeks',
    'v_task_week_constancy',
    'v_task_week_goal',
    'v_task_week_max_days'
  ];
BEGIN
  RAISE NOTICE 'Valor actual de app.allow_destructive: %', COALESCE(v_flag, 'NULL');

  IF v_flag IS NULL OR v_flag <> 'on' THEN
    RAISE NOTICE 'Modo dry-run: no se eliminará ningún objeto.';
    FOR rec IN (
      SELECT c.relname,
             c.relkind,
             CASE c.relkind WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'v' THEN 'VIEW' WHEN 'r' THEN 'TABLE' ELSE c.relkind::text END AS tipo
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND (
          (c.relkind IN ('m','v') AND (
             (c.relname LIKE 'mv_%streak%' OR c.relname LIKE 'v_%streak%' OR c.relname LIKE 'mv_%const%' OR c.relname LIKE 'v_%const%')
           )
        )
        AND c.relname <> ALL(v_allowed)
      ORDER BY c.relname
    ) LOOP
      RAISE NOTICE 'Candidato a eliminar (dry-run): % [%]', rec.relname, rec.tipo;
    END LOOP;
    FOR rec IN (
      SELECT c.relname,
             CASE c.relkind WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'v' THEN 'VIEW' ELSE c.relkind::text END AS tipo
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY(v_allowed)
        AND NOT (
          (c.relname LIKE 'mv_%' AND c.relkind = 'm') OR
          (c.relname LIKE 'v_%'  AND c.relkind = 'v')
        )
    ) LOOP
      RAISE NOTICE 'Conflicto potencial de tipo: % actualmente es %, se espera vista/materializada.', rec.relname, rec.tipo;
    END LOOP;
  ELSE
    RAISE NOTICE 'Modo destructivo activo: se procederá con la limpieza de objetos heredados.';
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'backup') THEN
      EXECUTE 'CREATE SCHEMA backup';
      RAISE NOTICE 'Schema backup creado para resguardar tablas si aplica.';
    END IF;

    FOR rec IN (
      SELECT c.relname,
             c.relkind,
             CASE c.relkind WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'v' THEN 'VIEW' WHEN 'r' THEN 'TABLE' ELSE c.relkind::text END AS tipo
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND (
          (c.relkind IN ('m','v') AND (
             (c.relname LIKE 'mv_%streak%' OR c.relname LIKE 'v_%streak%' OR c.relname LIKE 'mv_%const%' OR c.relname LIKE 'v_%const%')
           )
        )
        AND c.relname <> ALL(v_allowed)
      ORDER BY c.relname
    ) LOOP
      RAISE NOTICE 'Eliminando % [%]', rec.relname, rec.tipo;
      IF rec.relkind = 'm' THEN
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS public.%I', rec.relname);
      ELSIF rec.relkind = 'v' THEN
        EXECUTE format('DROP VIEW IF EXISTS public.%I', rec.relname);
      ELSIF rec.relkind = 'r' THEN
        RAISE NOTICE 'Tabla detectada: creando respaldo backup.% antes de eliminar.', rec.relname;
        EXECUTE format('CREATE TABLE IF NOT EXISTS backup.%I AS TABLE public.%I', rec.relname, rec.relname);
        EXECUTE format('DROP TABLE IF EXISTS public.%I', rec.relname);
      END IF;
    END LOOP;
    FOR rec IN (
      SELECT c.relname,
             CASE c.relkind WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'v' THEN 'VIEW' ELSE c.relkind::text END AS tipo
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = ANY(v_allowed)
        AND NOT (
          (c.relname LIKE 'mv_%' AND c.relkind = 'm') OR
          (c.relname LIKE 'v_%'  AND c.relkind = 'v')
        )
    ) LOOP
      RAISE NOTICE 'Revisar conflicto de tipo para % actualmente %.', rec.relname, rec.tipo;
    END LOOP;
  END IF;
END $$;

COMMIT;
