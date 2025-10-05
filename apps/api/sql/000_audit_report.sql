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
-- Script: 000_audit_report.sql
-- Objetivo: Auditoría de objetos existentes antes de crear la nueva capa de datos.
--           Este script es solo de lectura, idempotente y no hace cambios.
--           Todos los resultados se informan con RAISE NOTICE en español.
--           Se ejecuta en una transacción que se revertirá automáticamente ante error.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- Tabla temporal con los objetos que esperamos administrar.
-- --------------------------------------------------------------------------
CREATE TEMP TABLE tmp_expected_tables(nombre text) ON COMMIT DROP;
INSERT INTO tmp_expected_tables(nombre)
VALUES
  ('users'),
  ('game_mode_rules'),
  ('tasks'),
  ('task_logs'),
  ('level_rules'),
  ('daily_emotion'),
  ('daily_energies');

CREATE TEMP TABLE tmp_expected_materialized(nombre text) ON COMMIT DROP;
INSERT INTO tmp_expected_materialized(nombre)
VALUES
  ('mv_task_days'),
  ('mv_task_weeks');

CREATE TEMP TABLE tmp_expected_views(nombre text) ON COMMIT DROP;
INSERT INTO tmp_expected_views(nombre)
VALUES
  ('v_task_streak_max'),
  ('v_task_streak_current'),
  ('v_task_week_constancy'),
  ('v_task_week_goal'),
  ('v_task_week_max_days'),
  ('v_energy_today');

-- --------------------------------------------------------------------------
-- Columnas esperadas y sus tipos para detectar incompatibilidades.
-- --------------------------------------------------------------------------
CREATE TEMP TABLE tmp_expected_columns(
  tabla text,
  columna text,
  tipo_esperado text
) ON COMMIT DROP;

INSERT INTO tmp_expected_columns(tabla, columna, tipo_esperado)
VALUES
  ('users', 'id', 'uuid'),
  ('users', 'email', 'citext'),
  ('users', 'display_name', 'text'),
  ('users', 'start_date', 'date'),
  ('users', 'game_mode', 'text'),
  ('users', 'created_at', 'timestamp with time zone'),
  ('game_mode_rules', 'mode', 'text'),
  ('game_mode_rules', 'weekly_goal_days', 'integer'),
  ('game_mode_rules', 'xp_multiplier', 'numeric'),
  ('game_mode_rules', 'half_life_body', 'integer'),
  ('game_mode_rules', 'half_life_mind', 'integer'),
  ('game_mode_rules', 'half_life_soul', 'integer'),
  ('game_mode_rules', 'mode_mult', 'numeric'),
  ('tasks', 'id', 'uuid'),
  ('tasks', 'user_id', 'uuid'),
  ('tasks', 'pillar', 'text'),
  ('tasks', 'trait', 'text'),
  ('tasks', 'stat', 'text'),
  ('tasks', 'name', 'text'),
  ('tasks', 'base_xp', 'integer'),
  ('tasks', 'is_active', 'boolean'),
  ('tasks', 'created_at', 'timestamp with time zone'),
  ('task_logs', 'id', 'uuid'),
  ('task_logs', 'user_id', 'uuid'),
  ('task_logs', 'task_id', 'uuid'),
  ('task_logs', 'performed_at', 'timestamp with time zone'),
  ('task_logs', 'qty', 'integer'),
  ('task_logs', 'source', 'text'),
  ('task_logs', 'notes', 'text'),
  ('level_rules', 'level', 'integer'),
  ('level_rules', 'xp_required', 'integer'),
  ('daily_emotion', 'id', 'uuid'),
  ('daily_emotion', 'user_id', 'uuid'),
  ('daily_emotion', 'date', 'date'),
  ('daily_emotion', 'emotion_key', 'text'),
  ('daily_emotion', 'intensity', 'integer'),
  ('daily_energies', 'id', 'uuid'),
  ('daily_energies', 'user_id', 'uuid'),
  ('daily_energies', 'date', 'date'),
  ('daily_energies', 'body', 'numeric'),
  ('daily_energies', 'mind', 'numeric'),
  ('daily_energies', 'soul', 'numeric');

-- --------------------------------------------------------------------------
-- Relevamos tablas existentes con sus columnas.
-- --------------------------------------------------------------------------
CREATE TEMP TABLE tmp_existing_columns AS
SELECT
  c.relname AS tabla,
  a.attname AS columna,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS tipo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND a.attnum > 0
  AND NOT a.attisdropped
  AND c.relname IN (SELECT nombre FROM tmp_expected_tables);

-- --------------------------------------------------------------------------
-- Identificamos columnas con tipo diferente al esperado.
-- --------------------------------------------------------------------------
CREATE TEMP TABLE tmp_column_mismatches AS
SELECT e.tabla, e.columna, e.tipo_esperado, c.tipo AS tipo_actual
FROM tmp_expected_columns e
JOIN tmp_existing_columns c
  ON e.tabla = c.tabla AND e.columna = c.columna
WHERE c.tipo <> e.tipo_esperado;

-- --------------------------------------------------------------------------
-- Relevamos vistas y materializadas existentes con los nombres de interés.
-- --------------------------------------------------------------------------
CREATE TEMP TABLE tmp_existing_relations AS
SELECT c.relname AS nombre, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    SELECT nombre FROM tmp_expected_tables
    UNION ALL
    SELECT nombre FROM tmp_expected_materialized
    UNION ALL
    SELECT nombre FROM tmp_expected_views
  );

-- --------------------------------------------------------------------------
-- Relevamos índices relevantes sobre tablas objetivo.
-- --------------------------------------------------------------------------
CREATE TEMP TABLE tmp_existing_indexes AS
SELECT
  t.relname AS tabla,
  i.relname AS indice,
  pg_get_indexdef(i.oid) AS definicion
FROM pg_class t
JOIN pg_index ix ON ix.indrelid = t.oid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname IN (SELECT nombre FROM tmp_expected_tables);

-- --------------------------------------------------------------------------
-- Informes.
-- --------------------------------------------------------------------------
DO $$
DECLARE
  rec_tabla record;
  rec_columna record;
  rec record;
BEGIN
  RAISE NOTICE '=== Auditoría de tablas esperadas ===';
  FOR rec_tabla IN (
    SELECT DISTINCT tabla FROM tmp_existing_columns ORDER BY tabla
  ) LOOP
    RAISE NOTICE 'Tabla encontrada: %', rec_tabla.tabla;
    FOR rec_columna IN (
      SELECT columna, tipo FROM tmp_existing_columns WHERE tabla = rec_tabla.tabla ORDER BY columna
    ) LOOP
      RAISE NOTICE '  Columna % tipo actual %', rec_columna.columna, rec_columna.tipo;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== Columnas con tipo incompatible ===';
  IF EXISTS (SELECT 1 FROM tmp_column_mismatches) THEN
    FOR rec IN (
      SELECT * FROM tmp_column_mismatches ORDER BY tabla, columna
    ) LOOP
      RAISE NOTICE '  %.% tipo esperado % pero actual %', rec.tabla, rec.columna, rec.tipo_esperado, rec.tipo_actual;
    END LOOP;
    RAISE NOTICE 'Recomendación: revisar casting o recrear la columna antes de continuar.';
  ELSE
    RAISE NOTICE 'No se detectaron incompatibilidades de tipo.';
  END IF;

  RAISE NOTICE '=== Vistas y materializadas detectadas ===';
  FOR rec IN (
    SELECT nombre,
           CASE relkind
             WHEN 'v' THEN 'VIEW'
             WHEN 'm' THEN 'MATERIALIZED VIEW'
             WHEN 'r' THEN 'TABLE'
             ELSE relkind::text
           END AS tipo
    FROM tmp_existing_relations
    ORDER BY nombre
  ) LOOP
    RAISE NOTICE '  %: %', rec.nombre, rec.tipo;
  END LOOP;

  RAISE NOTICE '=== Índices existentes ===';
  FOR rec IN (
    SELECT tabla, indice, definicion FROM tmp_existing_indexes ORDER BY tabla, indice
  ) LOOP
    RAISE NOTICE '  Tabla % → índice % => %', rec.tabla, rec.indice, rec.definicion;
  END LOOP;
END $$;

COMMIT;
