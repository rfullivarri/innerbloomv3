# Misiones v2 — Gaps de base de datos

## 1. Estado actual del POC

- El servicio de Misiones v2 persiste el estado completo del tablero en disco usando `apps/api/src/services/missionsV2Repository.ts` con el `FileMissionsRepository` y el archivo `apps/api/data/missions_v2_store.json` como única fuente de verdad.
- No existen tablas SQL ni vistas para slots, heartbeats, bosses ni claims. La lógica de reglas (pétalos, cooldowns, booster, boss) vive íntegramente en memoria dentro de `apps/api/src/services/missionsV2Service.ts` y se serializa como JSON en el archivo mencionado.
- El adaptador `SqlMissionsRepository` queda preparado para consumir una tabla `missions_v2_state` que guarda la instantánea JSON del board por usuario. La interfaz permite hacer swap por env (`MISSIONS_REPO=SQL`) sin tocar el servicio core.

## 2. Modelo objetivo (SQL)

La migración a SQL se divide en dos capas:
1. **Persistencia puente** (`missions_v2_state`) para conservar el snapshot JSON mientras se valida el repositorio SQL.
2. **Modelo relacional definitivo** para consultas granulares (progreso, heartbeats, bosses, recompensas, efectos).

### 2.1 Persistencia puente

```sql
CREATE TABLE missions_v2_state (
  user_id      UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  state        JSONB NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Catálogo de misiones y recompensas

```sql
CREATE TABLE missions_v2_missions (
  mission_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key       TEXT NOT NULL CHECK (slot_key IN ('main', 'hunt', 'skill')),
  name           TEXT NOT NULL,
  summary        TEXT NOT NULL,
  requirements   TEXT NOT NULL,
  objective      TEXT NOT NULL,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('low', 'medium', 'high', 'epic')),
  duration_days  INTEGER NOT NULL,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions_v2_mission_targets (
  target_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id   UUID NOT NULL REFERENCES missions_v2_missions(mission_id) ON DELETE CASCADE,
  task_id      UUID NOT NULL,
  name         TEXT NOT NULL,
  tag          TEXT NOT NULL,
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE missions_v2_mission_rewards (
  mission_id    UUID PRIMARY KEY REFERENCES missions_v2_missions(mission_id) ON DELETE CASCADE,
  xp            INTEGER NOT NULL,
  currency      INTEGER NOT NULL DEFAULT 0,
  items         JSONB NOT NULL DEFAULT '[]'::jsonb,
  reward_badge  UUID,
  reward_aura   UUID,
  CONSTRAINT missions_v2_mission_rewards_badge_fk
    FOREIGN KEY (reward_badge) REFERENCES missions_v2_badges(badge_id),
  CONSTRAINT missions_v2_mission_rewards_aura_fk
    FOREIGN KEY (reward_aura) REFERENCES missions_v2_effect_catalog(effect_id)
);

CREATE TABLE missions_v2_badges (
  badge_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  artwork_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions_v2_effect_catalog (
  effect_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL CHECK (type IN ('amulet', 'aura')),
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  payload      JSONB NOT NULL,
  duration_days INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions_v2_mission_badges (
  mission_id UUID NOT NULL REFERENCES missions_v2_missions(mission_id) ON DELETE CASCADE,
  badge_id   UUID NOT NULL REFERENCES missions_v2_badges(badge_id) ON DELETE CASCADE,
  PRIMARY KEY (mission_id, badge_id)
);
```

### 2.3 Estado operativo del usuario

```sql
CREATE TABLE missions_v2_boards (
  board_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  season_id    TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE TABLE missions_v2_slots (
  slot_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id          UUID NOT NULL REFERENCES missions_v2_boards(board_id) ON DELETE CASCADE,
  slot_key          TEXT NOT NULL CHECK (slot_key IN ('main', 'hunt', 'skill')),
  state             TEXT NOT NULL CHECK (state IN ('idle', 'active', 'succeeded', 'failed', 'cooldown', 'claimed')),
  petals_total      SMALLINT NOT NULL DEFAULT 3,
  petals_remaining  SMALLINT NOT NULL DEFAULT 3,
  cooldown_until    TIMESTAMPTZ,
  reroll_remaining  SMALLINT NOT NULL DEFAULT 1,
  reroll_used_at    TIMESTAMPTZ,
  reroll_reset_at   TIMESTAMPTZ,
  UNIQUE (board_id, slot_key)
);

CREATE TABLE missions_v2_slot_runs (
  run_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id        UUID NOT NULL REFERENCES missions_v2_slots(slot_id) ON DELETE CASCADE,
  mission_id     UUID NOT NULL REFERENCES missions_v2_missions(mission_id),
  status         TEXT NOT NULL CHECK (status IN ('active', 'succeeded', 'failed', 'claimed')),
  selected_at    TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  heartbeat_today DATE,
  completion_at  TIMESTAMPTZ,
  failure_at     TIMESTAMPTZ,
  claim_id       UUID UNIQUE,
  UNIQUE (slot_id) WHERE status = 'active'
);

CREATE TABLE missions_v2_mission_progress (
  progress_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES missions_v2_slot_runs(run_id) ON DELETE CASCADE,
  current       INTEGER NOT NULL,
  target        INTEGER NOT NULL,
  unit          TEXT NOT NULL CHECK (unit IN ('tasks', 'sessions', 'minutes', 'points')),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions_v2_heartbeat_log (
  heartbeat_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id         UUID NOT NULL REFERENCES missions_v2_slot_runs(run_id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  heartbeat_date DATE NOT NULL,
  petals_before  SMALLINT NOT NULL,
  petals_after   SMALLINT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, heartbeat_date)
);

CREATE TABLE missions_v2_claims (
  claim_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES missions_v2_slot_runs(run_id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  claimed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward        JSONB NOT NULL,
  source        TEXT NOT NULL CHECK (source IN ('mission', 'boss')),
  UNIQUE (run_id)
);
```

### 2.4 Bosses, efectos y bitácoras

```sql
CREATE TABLE missions_v2_bosses (
  boss_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL,
  reward_badge UUID REFERENCES missions_v2_badges(badge_id),
  reward_aura  UUID REFERENCES missions_v2_effect_catalog(effect_id),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE missions_v2_boss_runs (
  boss_run_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id        UUID NOT NULL REFERENCES missions_v2_boards(board_id) ON DELETE CASCADE,
  boss_id         UUID NOT NULL REFERENCES missions_v2_bosses(boss_id),
  phase           SMALLINT NOT NULL CHECK (phase IN (1, 2)),
  shield_current  SMALLINT NOT NULL,
  shield_max      SMALLINT NOT NULL,
  linked_task_id  UUID,
  linked_at       TIMESTAMPTZ,
  phase2_ready    BOOLEAN NOT NULL DEFAULT false,
  phase2_proof    TEXT,
  phase2_submitted_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE TABLE missions_v2_effects (
  effect_instance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id           UUID NOT NULL REFERENCES missions_v2_boards(board_id) ON DELETE CASCADE,
  effect_id          UUID NOT NULL REFERENCES missions_v2_effect_catalog(effect_id),
  active_from        TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_until       TIMESTAMPTZ,
  consumed_at        TIMESTAMPTZ,
  payload_override   JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE missions_v2_communications (
  communication_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id         UUID NOT NULL REFERENCES missions_v2_boards(board_id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'system')),
  message          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.5 Índices y vistas/materialized views

```sql
CREATE INDEX idx_missions_v2_slots_board_state ON missions_v2_slots (board_id, state);
CREATE INDEX idx_missions_v2_slot_runs_active ON missions_v2_slot_runs (slot_id) WHERE status = 'active';
CREATE INDEX idx_missions_v2_slot_runs_user ON missions_v2_slot_runs USING BTREE (slot_id);
CREATE INDEX idx_missions_v2_heartbeat_user_date ON missions_v2_heartbeat_log (user_id, heartbeat_date DESC);
CREATE INDEX idx_missions_v2_claims_user ON missions_v2_claims (user_id, claimed_at DESC);
CREATE INDEX idx_missions_v2_effects_board ON missions_v2_effects (board_id, active_until);
CREATE INDEX idx_missions_v2_boss_runs_board ON missions_v2_boss_runs (board_id, phase);
```

Vistas sugeridas para análisis y adherencia:

```sql
CREATE MATERIALIZED VIEW mv_missions_v2_adherence AS
SELECT
  b.user_id,
  DATE_TRUNC('week', h.heartbeat_date)::date AS week,
  COUNT(*) FILTER (WHERE h.petals_after = h.petals_before) AS protected_days,
  COUNT(*) AS heartbeat_days,
  COUNT(*) FILTER (WHERE sr.status = 'succeeded') AS succeeded_days
FROM missions_v2_boards b
JOIN missions_v2_slots s ON s.board_id = b.board_id
JOIN missions_v2_slot_runs sr ON sr.slot_id = s.slot_id
JOIN missions_v2_heartbeat_log h ON h.run_id = sr.run_id
GROUP BY 1, 2;

CREATE MATERIALIZED VIEW mv_missions_v2_rewards AS
SELECT
  c.user_id,
  DATE_TRUNC('week', c.claimed_at)::date AS week,
  SUM((c.reward->>'xp')::integer) AS xp_total,
  SUM((c.reward->>'currency')::integer) AS currency_total,
  COUNT(*) AS claims
FROM missions_v2_claims c
GROUP BY 1, 2;
```

## 3. Plan de migración y dual-write

1. **Preparación**
   - Crear la tabla puente `missions_v2_state` y habilitar `SqlMissionsRepository` detrás del flag `MISSIONS_REPO=SQL` en ambientes internos.
   - Agregar migraciones para el modelo relacional (secciones 2.2–2.4) sin consumirlas todavía desde la API.
2. **Implementación dual**
   - Actualizar `missionsV2Repository` para escribir simultáneamente en archivo JSON y tabla puente cuando el flag `missionsV2` esté activo. El servicio seguirá leyendo del archivo hasta completar validaciones.
   - Instrumentar logs cuando la escritura SQL difiera (fila ausente, error de serialización) para monitorear integridad.
3. **Backfill**
   - Generar boards iniciales en SQL leyendo `apps/api/data/missions_v2_store.json` (snapshot) por usuario.
   - Reconstruir heartbeats y progreso a partir de `daily_log`, `emotions_logs` y eventos `missions_v2_*` existentes para los últimos 30 días. Esto alimenta `missions_v2_heartbeat_log`, `missions_v2_mission_progress` y `missions_v2_boss_runs`.
   - Backfill de claims en `missions_v2_claims` usando `xp_bonus` y registros de recompensas emitidos en memoria.
4. **Corte gradual**
   - Activar lectura desde `missions_v2_state` (modo snapshot SQL). Mantener escritura dual con archivo por una semana.
   - Una vez validado, migrar gradualmente a las tablas normalizadas (`missions_v2_slots`, `missions_v2_slot_runs`, etc.) y habilitar writes directos, manteniendo un job que actualice `missions_v2_state` como cache JSON para compatibilidad.
   - Apagar la escritura al archivo JSON y eliminar dependencias del store legacy (`apps/api/data/missions_v2_store.json`).
5. **Validaciones previas al release**
   - Comparar outputs de `GET /api/missions/board` usando repositorio File vs SQL para un conjunto de usuarios reales.
   - Validar que heartbeats duplicados respetan unicidad (`run_id, heartbeat_date`).
   - Reconciliar recompensas en `missions_v2_claims` vs `xp_bonus`.
   - Ejecutar smoke tests sobre boss runs (fase 1 y 2) para verificar integridad de escudo y claims.
6. **Rollout final**
   - Configurar `MISSIONS_REPO=SQL` en producción, mantener feature flag `missionsV2` para controlar UI.
   - Refrescar materialized views y programar `REFRESH MATERIALIZED VIEW CONCURRENTLY` diario.
   - Documentar los pasos de rollback: volver a `MISSIONS_REPO=FILE` y restaurar el JSON desde el último snapshot en disco.

## 4. Limpieza de legacy y monitoreo

- Retirar `apps/api/src/modules/missions-v2/board-store.ts` una vez que las tablas relacionales estén en uso y los endpoints `/users/:id/missions/v2` se apaguen.
- Agregar métricas Prometheus o logs estructurados para detectar heartbeats fuera de la ruta `/dashboard-v3/missions-v2` y claims duplicados.
- Mantener un cron de auditoría semanal que compare `missions_v2_state` (snapshot) con las tablas normalizadas para asegurar que no divergen.
