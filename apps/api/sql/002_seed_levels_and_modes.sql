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
-- Script: 002_seed_levels_and_modes.sql
-- Objetivo: Sembrar reglas de niveles y modos de juego mediante UPSERT idempotente.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- UPSERT de level_rules.
-- --------------------------------------------------------------------------
INSERT INTO public.level_rules AS lr (level, xp_required)
VALUES
  (1, 0),
  (2, 100),
  (3, 250),
  (4, 450),
  (5, 700),
  (6, 1000)
ON CONFLICT (level) DO UPDATE
SET xp_required = EXCLUDED.xp_required;

-- --------------------------------------------------------------------------
-- UPSERT de game_mode_rules con half-life y multiplicadores.
-- --------------------------------------------------------------------------
INSERT INTO public.game_mode_rules AS gmr
  (mode, weekly_goal_days, xp_multiplier, half_life_body, half_life_mind, half_life_soul, mode_mult)
VALUES
  ('LOW',    1, 1.00, 7, 9, 11, 1.0),
  ('CHILL',  2, 1.00, 6, 8, 10, 2.0),
  ('FLOW',   3, 1.00, 5, 7,  9, 2.5),
  ('EVOLVE', 4, 1.00, 4, 6,  8, 3.0)
ON CONFLICT (mode) DO UPDATE
SET weekly_goal_days = EXCLUDED.weekly_goal_days,
    xp_multiplier    = EXCLUDED.xp_multiplier,
    half_life_body   = EXCLUDED.half_life_body,
    half_life_mind   = EXCLUDED.half_life_mind,
    half_life_soul   = EXCLUDED.half_life_soul,
    mode_mult        = EXCLUDED.mode_mult;

COMMIT;
