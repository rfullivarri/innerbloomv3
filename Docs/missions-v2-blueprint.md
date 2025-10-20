# Missions v2 Integration Blueprint

## 1. Panorama actual del Dashboard V3

### Navegación y encapsulado
- El router central redirige a `/dashboard-v3` y exige sesión Clerk antes de renderizar la vista v3, reutilizando el `RequireUser` gate para todas las rutas protegidas.【F:apps/web/src/App.tsx†L95-L147】
- El encabezado superior y la navegación lateral usan `Navbar` + `MobileBottomNav` alimentados por `DASHBOARD_SECTIONS`; actualmente solo exponen Dashboard, Misiones v1, Rewards y el Task Editor externo.【F:apps/web/src/components/layout/Navbar.tsx†L23-L103】【F:apps/web/src/pages/dashboardSections.tsx†L101-L155】
- La nueva ruta `/dashboard-v3/missions-v2` queda anidada dentro de `DashboardV3` y retorna al índice cuando el flag está apagado, garantizando aislamiento y acceso exclusivo por URL directa.【F:apps/web/src/pages/DashboardV3.tsx†L157-L184】【F:apps/web/src/pages/DashboardV3.tsx†L263-L283】

### Autenticación y bootstrap de datos
- Clerk gestiona autenticación y provisioning del token API a través de `RequireUser` + `ApiAuthBridge`, habilitando fetches autenticados para todos los módulos del dashboard.【F:apps/web/src/App.tsx†L24-L74】
- `useBackendUser` en `DashboardV3` sincroniza el ID interno y game mode antes de montar las secciones, y solo entonces renderiza los `Routes` hijos.【F:apps/web/src/pages/DashboardV3.tsx†L41-L187】

### Tema / UI reutilizable
- Las tarjetas principales usan el componente `Card` (gradiente + border glass) para mantener la estética nocturna; cualquier placeholder nuevo debe apoyarse en este wrapper.【F:apps/web/src/components/ui/Card.tsx†L4-L73】
- El layout ya ofrece header, spacing y tarjetas responsivas via `SectionHeader`, grillas y espaciados predefinidos en `DashboardV3` para que Misiones v2 mantenga consistencia visual.【F:apps/web/src/pages/DashboardV3.tsx†L206-L246】

## 2. Módulos existentes a mapear

| Módulo | Front-end | Backend / Contratos actuales |
| --- | --- | --- |
| Daily / Energía | `DailyCultivationSection` consolida XP diario y grouping mensual con `getUserDailyXp` (series) y formato InfoDot.【F:apps/web/src/components/dashboard-v3/DailyCultivationSection.tsx†L68-L164】 | `/users/:id/xp/daily` agrega series desde `v_user_daily_xp` y devuelve `{ from, to, series[] }` con normalización numérica.【F:apps/api/src/controllers/logs/get-user-daily-xp.ts†L21-L47】 |
| Daily Energy | `EnergyCard` (no modificado aquí) consume `/users/:id/daily-energy` y muestra barras hp/mood/focus. | El controlador convierte porcentajes y normalizados desde `v_user_daily_energy` a números redondeados.【F:apps/api/src/routes/users/daily-energy.ts†L46-L84】 |
| XP Radar / Stats | `RadarChartCard`, `EmotionChartCard` y `StreaksPanel` combinan `getUserXpByTrait`, `getUserDailyXp`, `getUserStreakPanel` y catálogo de tareas para stats longitudinales.【F:apps/web/src/components/dashboard/StreaksPanel.tsx†L1-L195】 | `xp-by-trait` agrega XP por rasgo con joins a `daily_log`, `tasks`, `cat_trait`, `cat_pillar` permitiendo filtros por rango.【F:apps/api/src/routes/users/xp-by-trait.ts†L35-L81】 |
| Misiones v1 | `MissionsSection` hoy solo lee `getUserTasks` y muestra cards read-only con copy “Próximamente acciones”.【F:apps/web/src/components/dashboard-v3/MissionsSection.tsx†L11-L64】 | `getUserTasks` normaliza respuestas heterogéneas de `/users/:id/tasks`, enfocadas en tareas activas y xp base.【F:apps/web/src/lib/api.ts†L983-L989】 |
| Rewards / Badges | `RewardsSection` presenta logros, progreso y botones de recarga reutilizando `Card` y `ProgressBar`。【F:apps/web/src/components/dashboard-v3/RewardsSection.tsx†L11-L101】 | `getUserAchievements` deriva streaks, XP total y thresholds desde vistas `v_user_daily_xp`, `v_user_total_xp`, `v_user_level` y calcula progreso server-side.【F:apps/api/src/controllers/users/get-user-achievements.ts†L137-L198】 |
| Eventos / Telemetría | Hasta ahora solo existía `emitDbEditorEvent` para el Task Editor. Agregamos los eventos `missions_v2_*` reutilizando el logger central.【F:apps/web/src/lib/telemetry.ts†L29-L79】 |

## 3. Qué reutilizamos para Misiones v2

1. **Shell visual y navegación**: `SectionHeader`, `Card` y la grilla responsive ya empleada por Dashboard/Misiones v1 permiten montar slots y banner sin duplicar estilos.【F:apps/web/src/pages/DashboardV3.tsx†L271-L280】【F:apps/web/src/components/dashboard-v3/MissionsV2Placeholder.tsx†L29-L95】
2. **Access control**: `FEATURE_MISSIONS_V2` centraliza el flag leyendo `VITE_FEATURE_FLAGS` o overrides de runtime, evitando condicionales dispersos.【F:apps/web/src/lib/featureFlags.ts†L1-L59】
3. **Telemetría base**: `emitMissionsV2Event` encapsula los eventos `missions_v2_view`, `missions_v2_select_open`, `missions_v2_claim_open` y los dispara desde el placeholder con `useEffect` y handlers inline.【F:apps/web/src/components/dashboard-v3/MissionsV2Placeholder.tsx†L10-L90】【F:apps/web/src/lib/telemetry.ts†L53-L79】
4. **Stub único**: `MISSIONS_V2_EMPTY_BOARD_STUB` define los tres slots y el banner Boss como referencia centralizada hasta que llegue la API definitiva (evita mocks sueltos).【F:apps/web/src/features/missions-v2/stub.ts†L1-L29】

## 4. Inserción propuesta de Misiones v2

- **Ruta aislada**: `/dashboard-v3/missions-v2` se registra dentro del router del Dashboard y redirige al índice si el flag está off, manteniendo el menú limpio y sin side-effects.【F:apps/web/src/pages/DashboardV3.tsx†L157-L184】【F:apps/web/src/pages/DashboardV3.tsx†L263-L283】
- **Placeholder UI**: pantalla con banner “Boss Raid”, grilla de slots Main/Hunt/Skill y botón Claim deshabilitado, todos construidos con `Card` y clases existentes para transmitir el estado “WIP”.【F:apps/web/src/components/dashboard-v3/MissionsV2Placeholder.tsx†L29-L95】
- **Eventos**: se emiten automáticamente al montar la vista, al pulsar “Configurar (WIP)” de cada slot y al interactuar con el botón Claim bloqueado (usando `onPointerDown` + `onClick`).【F:apps/web/src/components/dashboard-v3/MissionsV2Placeholder.tsx†L17-L90】

## 5. Gaps y pedidos a DB

1. **Board & Slots**
   - Tabla sugerida: `mission_board` (`user_id` FK, `season_id`, `refresh_at`, `boss_state`, `created_at`, `updated_at`).
   - Tabla `mission_slot` (`board_id` FK, `slot_key` enum('main','hunt','skill'), `mission_id` FK `mission_template`, `status` enum('empty','locked','active','cooldown'), `expires_at`, `reroll_available_at`).
2. **Catálogo**
   - Tabla `mission_template` (`mission_id`, `title`, `description`, `type`, `pillar_id`, `trait_id`, `stat_id`, `xp_reward`, `rarity`, `season_tag`).
3. **Progreso y claim**
   - Tabla `mission_progress` (`mission_id`, `user_id`, `slot_key`, `current_value`, `target_value`, `linked_daily_id`, `last_event_at`).
   - Tabla `mission_reward` (`claim_id`, `mission_id`, `xp_awarded`, `currency_awarded`, `badge_unlocked`, `created_at`).
4. **Auditoría**
   - Tabla `mission_event_log` (`id`, `user_id`, `mission_id`, `slot_key`, `event`, `metadata`, `recorded_at`) para trazar select/reroll/claim y facilitar telemetría backend.

> Todos los contratos abajo asumen estas entidades y deben exponerse via rutas `/users/:id/missions/v2/...` autenticadas (mismo middleware que `/users/:id/tasks`).

## 6. Contratos mínimos propuestos

```jsonc
GET /users/:id/missions/v2/board → 200
{
  "user_id": "uuid",
  "season_id": "2025-Q1",
  "refresh_at": "2025-01-09T00:00:00Z",
  "boss": { "state": "upcoming", "label": "Boss Battle", "unlock_at": null },
  "slots": [
    {
      "slot": "main",
      "status": "empty",
      "mission": null,
      "reroll_available_at": null
    },
    {
      "slot": "hunt",
      "status": "active",
      "mission": {
        "id": "mst_123",
        "title": "Explora un nuevo hábito",
        "type": "hunt",
        "xp_reward": 150,
        "tags": { "pillar": "Mind", "trait": "Awareness" }
      },
      "progress": { "current": 2, "target": 5, "last_update": "2025-01-05T18:04:00Z" },
      "reroll_available_at": "2025-01-06T03:00:00Z"
    }
  ]
}
```

```jsonc
POST /users/:id/missions/v2/select
{ "slot": "main", "mission_id": "mst_987", "source": "board" }
→ 200
{
  "slot": "main",
  "status": "active",
  "mission": { "id": "mst_987", "title": "Quest Principal", "xp_reward": 250, "type": "main" },
  "progress": { "current": 0, "target": 1 },
  "linked_daily_id": null
}
```

```jsonc
POST /users/:id/missions/v2/reroll
{ "slot": "hunt" }
→ 200
{
  "slot": "hunt",
  "status": "empty",
  "next_available_at": "2025-01-07T00:00:00Z",
  "refreshed_pool": [
    { "id": "mst_555", "title": "Micro reto creativo", "xp_reward": 90 },
    { "id": "mst_556", "title": "Investiga un dato", "xp_reward": 80 }
  ]
}
```

```jsonc
POST /users/:id/missions/v2/link-daily
{ "slot": "skill", "daily_submission_id": "dq_2025-01-05" }
→ 200
{
  "slot": "skill",
  "linked_daily_id": "dq_2025-01-05",
  "progress": { "current": 1, "target": 3 }
}
```

```jsonc
POST /users/:id/missions/v2/phase2
{ "slot": "main", "action": "boost", "payload": { "boost_id": "season_pass" } }
→ 202
{
  "slot": "main",
  "status": "boost_pending",
  "accepted_at": "2025-01-05T22:10:00Z"
}
```

```jsonc
POST /users/:id/missions/v2/claim
{ "slot": "hunt" }
→ 200
{
  "slot": "hunt",
  "status": "cooldown",
  "awards": { "xp": 150, "currency": 10, "badges": ["hunt_starter"] },
  "claimed_at": "2025-01-06T18:00:00Z",
  "next_refresh_at": "2025-01-07T00:00:00Z"
}
```

## 7. Plan anti-duplicación

- **UI**: toda card/slot/banner debe usar `Card` + variantes, evitando estilos manuales duplicados; mantener copy/headers via `SectionHeader` para coherencia.【F:apps/web/src/components/ui/Card.tsx†L4-L73】【F:apps/web/src/pages/DashboardV3.tsx†L271-L280】
- **Flags**: agregar toggles solo en `featureFlags.ts` y consultar `FEATURE_MISSIONS_V2` en componentes; prohíbe reimplementar checks ad-hoc.【F:apps/web/src/lib/featureFlags.ts†L1-L59】
- **Telemetría**: nuevos eventos deben canalizarse por `emitMissionsV2Event` para centralizar formato/logging.【F:apps/web/src/lib/telemetry.ts†L53-L79】
- **Datos dummy**: cualquier placeholder o mock para Misiones v2 debe residir en `features/missions-v2/stub.ts` (documentado en este blueprint) para facilitar su reemplazo cuando la API esté lista.【F:apps/web/src/features/missions-v2/stub.ts†L1-L29】

## 8. Próximos pasos sugeridos

1. Confirmar modelo relacional y exponer endpoints listados.
2. Iterar sobre UI reemplazando el stub por data real del board.
3. Integrar telemetry backend con `mission_event_log` usando los eventos ya emitidos desde el front.
