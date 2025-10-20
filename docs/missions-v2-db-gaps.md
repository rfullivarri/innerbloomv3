# Misiones v2 — Gaps de base de datos

## 1. Lista priorizada de gaps

1. **Persistencia del board/slots**: hoy el servicio usa un `Map` en memoria, por lo que el estado de misiones, pétalos, cooldown y propuestas se pierde entre procesos y no escala a múltiples instancias.【F:apps/api/src/services/missionsV2Service.ts†L200-L309】
2. **Historial diario (heartbeats/pétalos)**: no hay tabla que registre heartbeats por usuario/día/slot, indispensable para aplicar la regla de −1 pétalo y proteger boosters.【F:apps/api/src/services/missionsV2Service.ts†L633-L717】
3. **Boss y enlaces a dailies**: el escudo, la fase 2 y el task vinculado sólo viven en memoria; se requiere persistencia para sincronizar con los logs diarios.【F:apps/api/src/services/missionsV2Service.ts†L505-L720】
4. **Claims y recompensas**: la recompensa se calcula y marca en memoria; falta un registro idempotente para auditar XP/currency/items entregados.【F:apps/api/src/services/missionsV2Service.ts†L600-L616】
5. **Notas futuras/amuletos/aura**: el prototipo del módulo legacy maneja `future_note` y rule-mods sin base relacional, lo que impide segmentar buff/debuff de misiones.【F:apps/api/src/modules/missions-v2/board-store.ts†L109-L177】

## 2. DDL sugerido

```sql
CREATE TABLE missions_v2_board (
  board_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  season_id         TEXT NOT NULL,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_id)
);

CREATE TABLE missions_v2_slot (
  slot_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id          UUID NOT NULL REFERENCES missions_v2_board(board_id) ON DELETE CASCADE,
  slot_key          TEXT NOT NULL CHECK (slot_key IN ('main','hunt','skill')),
  mission_payload   JSONB NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('idle','active','succeeded','failed','cooldown')),
  petals_total      SMALLINT NOT NULL DEFAULT 3,
  petals_remaining  SMALLINT NOT NULL DEFAULT 3,
  heartbeat_today   DATE,
  progress_current  INTEGER NOT NULL DEFAULT 0,
  progress_target   INTEGER NOT NULL DEFAULT 1,
  progress_unit     TEXT NOT NULL,
  selected_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  cooldown_until    TIMESTAMPTZ,
  reroll_used_at    TIMESTAMPTZ,
  reroll_reset_at   TIMESTAMPTZ,
  reroll_remaining  SMALLINT NOT NULL DEFAULT 1,
  UNIQUE (board_id, slot_key)
);

CREATE TABLE missions_v2_proposal (
  proposal_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id          UUID NOT NULL REFERENCES missions_v2_board(board_id) ON DELETE CASCADE,
  slot_key          TEXT NOT NULL CHECK (slot_key IN ('main','hunt','skill')),
  payload           JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason            TEXT NOT NULL
);

CREATE TABLE missions_v2_heartbeat_log (
  heartbeat_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id           UUID NOT NULL REFERENCES missions_v2_slot(slot_id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  heartbeat_date    DATE NOT NULL,
  petals_before     SMALLINT NOT NULL,
  petals_after      SMALLINT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, heartbeat_date)
);

CREATE TABLE missions_v2_boss_state (
  board_id          UUID PRIMARY KEY REFERENCES missions_v2_board(board_id) ON DELETE CASCADE,
  phase             SMALLINT NOT NULL CHECK (phase IN (1,2)),
  shield_current    SMALLINT NOT NULL,
  shield_max        SMALLINT NOT NULL,
  linked_task_id    UUID,
  linked_at         TIMESTAMPTZ,
  phase2_ready      BOOLEAN NOT NULL DEFAULT false,
  phase2_proof      TEXT,
  phase2_submitted_at TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE TABLE missions_v2_claim (
  claim_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id           UUID NOT NULL REFERENCES missions_v2_slot(slot_id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  mission_id        TEXT NOT NULL,
  claimed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_xp         INTEGER NOT NULL,
  reward_currency   INTEGER DEFAULT 0,
  reward_items      JSONB DEFAULT '[]'::jsonb,
  UNIQUE (slot_id, mission_id)
);

CREATE TABLE missions_v2_effect (
  effect_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id          UUID NOT NULL REFERENCES missions_v2_board(board_id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN ('amulet','aura')), 
  payload           JSONB NOT NULL,
  active_from       TIMESTAMPTZ NOT NULL,
  active_until      TIMESTAMPTZ,
  consumed_at       TIMESTAMPTZ
);

CREATE INDEX idx_missions_v2_slot_status ON missions_v2_slot (status);
CREATE INDEX idx_missions_v2_slot_cooldown ON missions_v2_slot (cooldown_until) WHERE cooldown_until IS NOT NULL;
CREATE INDEX idx_missions_v2_heartbeat_user_date ON missions_v2_heartbeat_log (user_id, heartbeat_date);
CREATE INDEX idx_missions_v2_claim_user ON missions_v2_claim (user_id, claimed_at DESC);
```

## 3. Consideraciones de performance e integridad

- Los slots y heartbeats necesitan lecturas frecuentes por usuario; índices por `(board_id, slot_key)` y `(user_id, heartbeat_date)` aseguran consultas O(log n) incluso con históricos prolongados.
- `mission_payload` se almacena en JSONB para conservar objetivos/recompensas actuales sin duplicar catálogo; se recomienda validar estructura antes de insertar para evitar datos inconsistentes.【F:apps/api/src/services/missionsV2Service.ts†L280-L405】
- Las claves foráneas con `ON DELETE CASCADE` mantienen limpieza al remover usuarios o boards inactivos, alineado con las vistas de XP que dependen de `users` y `daily_log` existentes.【F:apps/api/db-snapshot.sample.json†L248-L306】
- `missions_v2_claim` es la fuente de verdad para idempotencia; se recomienda trigger que impida duplicar rewards y, opcionalmente, registre entradas complementarias en `xp_bonus` para reflejar XP extra sin recalcular vistas.【F:apps/api/db-snapshot.sample.json†L1560-L1604】

## 4. Plan de rollout

1. Crear tablas nuevas detrás de feature flag `missionsV2`, sin exponer endpoints; validar integridad con seeds mínimos en ambientes internos.
2. Implementar repositorio que lea/escriba en las tablas y mantener en paralelo el `Map` en memoria hasta completar backfill, asegurando consistencia con pruebas de regresión en `/api/missions/*` mockeadas.【F:apps/api/src/services/missionsV2Service.ts†L200-L479】
3. Migrar usuarios pilotos: sincronizar estado actual generando boards iniciales (copiando propuestas actuales) y registrar heartbeats a partir de `daily_log` (últimos 7 días) para no perder tolerancia.【F:apps/api/src/controllers/logs/get-user-daily-xp.ts†L21-L47】
4. Activar escritura dual (memoria + BD) y monitorear diferencias; una vez estable, apagar el store en memoria y limpiar caminos legacy (`/users/:id/missions/v2`).【F:apps/api/src/modules/missions-v2/board-store.ts†L1-L200】
5. Habilitar claim definitivo y telemetría cuando los índices estén en producción, usando el flag para abrir la ruta `/dashboard-v3/missions-v2` a cohortes limitadas.【F:apps/web/src/lib/featureFlags.ts†L1-L59】【F:apps/web/src/pages/DashboardV3.tsx†L174-L185】
