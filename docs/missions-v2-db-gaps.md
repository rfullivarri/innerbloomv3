# Missions v2 · Persistencia pendiente

La implementación actual de Misiones v2 funciona con un store en memoria (`missionsV2Service`) que habilita los contratos mínimos y la telemetría requerida, pero no persiste ningún dato. Para avanzar hacia producción se necesita agregar las siguientes entidades y migraciones.

## 1. Tablas nuevas sugeridas

### 1.1 `mission_board`
Guarda la configuración activa del tablero por usuario/temporada.

```sql
CREATE TABLE mission_board (
    mission_board_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    season_id TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    boss_state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_mission_board_user_season
    ON mission_board (user_id, season_id);
```

### 1.2 `mission_slot`
Representa cada slot (Main/Hunt/Skill) y su selección activa.

```sql
CREATE TABLE mission_slot (
    mission_slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_board_id UUID NOT NULL REFERENCES mission_board(mission_board_id) ON DELETE CASCADE,
    slot_key TEXT NOT NULL CHECK (slot_key IN ('main','hunt','skill')),
    mission_id UUID REFERENCES mission_template(mission_id),
    status TEXT NOT NULL CHECK (status IN ('empty','active','completed','claimed')),
    progress JSONB NOT NULL DEFAULT '{}'::jsonb,
    reroll_used_at TIMESTAMPTZ,
    reroll_next_reset_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_mission_slot_board_key
    ON mission_slot (mission_board_id, slot_key);
```

### 1.3 `mission_template`
Catálogo de misiones reutilizables.

```sql
CREATE TABLE mission_template (
    mission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_key TEXT NOT NULL CHECK (slot_key IN ('main','hunt','skill')),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    reward JSONB NOT NULL,
    objectives JSONB NOT NULL,
    tags JSONB,
    season_tag TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.4 `mission_progress`
Registra avances, vínculos con dailies y boosts.

```sql
CREATE TABLE mission_progress (
    mission_progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_slot_id UUID NOT NULL REFERENCES mission_slot(mission_slot_id) ON DELETE CASCADE,
    current_value INTEGER NOT NULL DEFAULT 0,
    target_value INTEGER NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'tasks',
    linked_daily_task_id UUID,
    last_submission_at DATE,
    booster_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    booster_applied_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_mission_progress_slot
    ON mission_progress (mission_slot_id);
```

### 1.5 `mission_event_log`
Telemetría y auditoría backend (match con `missions_v2_*`).

```sql
CREATE TABLE mission_event_log (
    mission_event_log_id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    mission_id UUID,
    slot_key TEXT,
    event TEXT NOT NULL,
    metadata JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_mission_event_log_user
    ON mission_event_log (user_id, recorded_at DESC);
```

## 2. Índices adicionales
- `mission_slot(status)` para filtrar activas en cron.
- `mission_progress(linked_daily_task_id)` para aplicar boosts de manera idempotente.
- `mission_event_log(event)` para analíticas rápidas.

## 3. Estrategia de migración
1. **Crear catálogo**: poblar `mission_template` con los templates existentes (seed inicial en la migración o script separado).
2. **Backfill**: para usuarios actuales, generar un `mission_board` vacío con slots `empty` para la temporada vigente.
3. **Sincronización**: adaptar `missionsV2Service` a leer/escribir usando estas tablas, manteniendo transacciones para:
   - Selección (`mission_slot` + `mission_progress`).
   - Reroll (actualizar timestamps + propuestas).
   - Boost (actualizar `mission_progress` y `mission_event_log`).
4. **Telemetría**: reemplazar el store en memoria con inserts en `mission_event_log` (posiblemente vía cola ligera).
5. **Tareas programadas**: mover `runWeeklyAutoSelection` y `runFortnightlyBossMaintenance` a jobs que consulten `mission_slot`/`mission_progress` para decidir nuevas propuestas y resets.

> Nota: no se crean migraciones reales en este commit; este documento describe los cambios necesarios para habilitar persistencia completa.
