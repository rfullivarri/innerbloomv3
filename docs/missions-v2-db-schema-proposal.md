# Misiones v2 — Propuesta de esquema (sin SQL)

> **Nota:** El equipo creará las tablas y las queries; este documento no incluye SQL ni migraciones.

La propuesta agrupa entidades en dos dominios: catálogo (misiones disponibles) y estado de usuario (runs, progreso, heartbeats). Cada sección indica claves sugeridas, relaciones e índices para soportar los endpoints stubs descritos en `missions-v2-api-contract.md`.

## Catálogo

### `missions_v2_missions`
- **Campos clave**: `id (PK)`, `slot_key`, `name`, `summary`, `requirements`, `objective`, `difficulty`, `duration_days`, `metadata JSONB`.
- **Relaciones**: `slot_key` referencia catálogo de slots (`missions_v2_slots_catalog`).
- **Índices sugeridos**: `(slot_key, difficulty)`, texto full search opcional sobre `name`/`summary` para market.
- **Consumido por**: `GET /missions/board`, `GET /missions/market` (para poblar `mission` y `proposal` base).
- **Persistido vs derivado**: datos textuales persistidos; `difficulty` se persiste, `metadata` guarda flags (`spotlight`, `boosterMultiplier`, `stat`).

### `missions_v2_mission_targets`
- **Campos**: `id (PK)`, `mission_id (FK)`, `name`, `order`.
- **Uso**: arma `mission.objectives` y `proposal.objectives`.
- **Índices**: `(mission_id, order)` para ordenar checklist.

### `missions_v2_mission_rewards`
- **Campos**: `mission_id (PK/FK)`, `xp`, `currency`, `items JSONB`.
- **Uso**: alimenta `reward` tanto en board como market.

### `missions_v2_market_proposals`
- **Campos**: `id (PK)`, `slot_key`, `mission_id (FK)`, `sort_order`, `locked_until`, `available_at`, `is_active BOOLEAN`.
- **Relaciones**: `mission_id` → `missions_v2_missions`.
- **Índices**: `(slot_key, sort_order)` para armar stacks 3×3; `(mission_id)` para lookup inverso.
- **Campos derivados**: `locked` (true si `locked_until` > now o `is_active`), `isActive` (copiado de flag), `available_at` (directo).
- **Consumido por**: `GET /missions/board`, `GET /missions/market`.

### `missions_v2_slots_catalog`
- **Campos**: `slot_key (PK)`, `label`, `emoji`.
- **Uso**: mapear valores fijos en backend; front ya conoce labels pero mantener referencia central.

## Estado de usuario

### `missions_v2_slots`
- **Campos**: `user_id`, `slot_key`, `petals_total`, `petals_remaining`, `state`, `cooldown_until`.
- **Claves**: PK compuesta `(user_id, slot_key)`.
- **Índices**: `(state)` para auditoría; `(cooldown_until)` para jobs.
- **Derivados**: `slot.state` persiste; `slot.countdown.label` se deriva del timestamp más cercano (`cooldown_until` o run actual).
- **Consumido por**: `GET /missions/board`, `POST /missions/abandon`, `POST /missions/activate`.

### `missions_v2_slot_runs`
- **Campos**: `id (PK)`, `user_id`, `slot_key`, `mission_id`, `started_at`, `expires_at`, `status`, `claim_id (nullable)`.
- **Índices**: `(user_id, slot_key)` (único en run activo), `(mission_id)` para historiales.
- **Derivados**: `countdown.ends_at` (desde `expires_at`), `slot.actions` habilitados según `status`, `slot.claim.available` (cuando `status='succeeded'` y sin `claim_id`).
- **Consumido por**: board (misión actual), claim, heartbeat.

### `missions_v2_mission_progress`
- **Campos**: `slot_run_id (PK/FK)`, `current`, `target`, `updated_at`.
- **Derivados**: `progress.percent = round(current/target*100)`.
- **Índices**: `updated_at` para jobs de expiración.

### `missions_v2_heartbeat_log`
- **Campos**: `id (PK)`, `slot_run_id (FK)`, `user_id`, `registered_at`, `petals_remaining`.
- **Uso**: habilita `slot.heartbeat_today`, `MissionsV2HeartbeatResponse.petals_remaining`.
- **Índices**: `(user_id, registered_at::date)` para limitar a uno por día.

### `missions_v2_claims`
- **Campos**: `id (PK)`, `slot_run_id (FK)`, `user_id`, `claimed_at`, `xp`, `currency`, `items JSONB`.
- **Derivados**: `claim.available` y `claim.enabled` provienen del estado de run + existencia de claim.
- **Consumido por**: `POST /missions/:id/claim`.

### `missions_v2_market_state`
- **Campos**: `user_id`, `slot_key`, `proposal_id`, `sort_order`, `locked_until`, `is_active`.
- **Claves**: PK `(user_id, slot_key, proposal_id)`.
- **Uso**: instancia personalizada del market por usuario, permite locks por slot.
- **Derivados**: `market.proposals.locked` (según `locked_until` o `is_active`).

### `missions_v2_slot_notes`
- **Campos**: `user_id`, `friction_id`, `note`, `updated_at`.
- **Uso**: prepara reemplazo para `future_note` en UI (aunque hoy no se expone en contratos nuevos, se deja punto de inyección).

## Derivados vs persistidos

| Campo UI | Fuente persistida | Derivado por servicio |
|----------|-------------------|-----------------------|
| `progress.percent` | `missions_v2_mission_progress.current/target` | Sí |
| `countdown.label` | `missions_v2_slot_runs.expires_at` + `missions_v2_slots.cooldown_until` | Sí |
| `slot.heartbeat_today` | `missions_v2_heartbeat_log` (último registro del día) | Sí |
| `claim.available`/`enabled` | `missions_v2_slot_runs.status`, `missions_v2_claims.claimed_at` | Sí |
| `market.proposals.locked` | `missions_v2_market_state.locked_until`, `missions_v2_market_state.is_active` | Sí |
| `market.proposals.isActive` | `missions_v2_market_state.is_active` | Sí |
| `market.proposals.available_at` | `missions_v2_market_state.locked_until` | Copia directa |
| `board.generated_at` | — | Timestamp generado al serializar |
| `boss.countdown.label` | `missions_v2_boss_state.expires_at` (no detallado arriba, mismo patrón) | Sí |

## Endpoints ↔ tablas

| Endpoint | Entidades clave |
|----------|-----------------|
| `GET /missions/board` | `missions_v2_slots`, `missions_v2_slot_runs`, `missions_v2_mission_progress`, `missions_v2_missions`, `missions_v2_mission_rewards`, `missions_v2_mission_targets`, `missions_v2_market_state`, `missions_v2_market_proposals`, `missions_v2_heartbeat_log`, `missions_v2_claims`, `missions_v2_boss_state` |
| `GET /missions/market` | `missions_v2_market_state`, `missions_v2_market_proposals`, `missions_v2_missions`, `missions_v2_mission_rewards`, `missions_v2_mission_targets` |
| `POST /missions/heartbeat` | `missions_v2_slot_runs`, `missions_v2_heartbeat_log`, `missions_v2_mission_progress`, `missions_v2_slots` |
| `POST /missions/:id/claim` | `missions_v2_slot_runs`, `missions_v2_claims`, `missions_v2_mission_rewards`, `missions_v2_slots` |
| `POST /missions/activate` | `missions_v2_market_state`, `missions_v2_slot_runs`, `missions_v2_slots` |
| `POST /missions/abandon` | `missions_v2_slot_runs`, `missions_v2_slots`, `missions_v2_market_state` |

Esta estructura deja “cables pelados”: cada tabla indicada mapea 1:1 con los campos del contrato y permite inyectar queries más adelante sin modificar la forma del payload.
