# Misiones v2.2 — Mapeo funcional de datos

## Propósito
Este documento resume qué datos consume cada card de **Misiones Activas** y del **Market** en la interfaz actual (`MissionsV2Board`) y los campos necesarios en la capa SQL propuesta para respaldarlos. El objetivo es alinear frontend y backend antes de avanzar con la migración a la base relacional.

## Referencias principales
- Diseño funcional v2.2.【F:docs/missions-v2.2-functional.md†L12-L20】
- Blueprint de tablas SQL para Misiones v2.【F:docs/missions-v2-db-gaps.md†L25-L161】
- Implementación actual del tablero (`MissionsV2Board`).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L281-L3127】
- Tipos expuestos por la API web.【F:apps/web/src/lib/api.ts†L1831-L1945】

## Cards de Misiones Activas
La vista "Misiones Activas" muestra un carrusel horizontal de hasta tres slots (`main`, `hunt`, `skill`). Cada card combina información del slot activo, la misión seleccionada y acciones contextuales.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2960-L3125】

| Elemento UI | Descripción funcional | Fuente actual (API/UI) | Campos SQL requeridos | Notas |
|-------------|-----------------------|------------------------|------------------------|-------|
| Título de slot | Nombre fijo y emoji por tipo (Main/Hunt/Skill). | Constante `SLOT_DETAILS`. | `missions_v2_slots.slot_key` (enum) para mapear labels en frontend. | No requiere persistencia adicional. |
| Estado (chip) | Estado general del slot (`idle`, `active`, `succeeded`, etc.). | `slot.state`. | `missions_v2_slots.state`. | Debe reflejar transiciones tras seleccionar, completar o fallar misiones.【F:apps/web/src/lib/api.ts†L1870-L1881】【F:docs/missions-v2-db-gaps.md†L103-L131】 |
| Hero line | Resumen corto que introduce la misión. Usa `mission.summary`; si falta, toma la primera propuesta del market. | `slot.mission.summary` o `market.proposals[0].summary/objectives`. | `missions_v2_missions.summary`; fallback requiere `missions_v2_market_proposals` o vista que exponga propuestas pendientes. | Mantener summaries concisos para mobile.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L512-L526】 |
| Chips de requisitos | Tokens informativos generados a partir de `mission.requirements` + reglas por slot. | `slot.mission.requirements` (texto multilinea). | `missions_v2_missions.requirements` con formato consistente (separado por `·` o newline). | El backend debe normalizar separadores para evitar chips vacíos.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L281-L310】 |
| Barra de progreso | Avance numérico de la misión. | `slot.progress.current/target/percent`. | `missions_v2_mission_progress.current/target` (con `percent` calculado en servicio). | Requiere join por `slot_run`.【F:apps/web/src/lib/api.ts†L1872-L1880】【F:docs/missions-v2-db-gaps.md†L133-L140】 |
| Pétalos (campo + mini) | Muestra pétalos totales y restantes, además del highlight tras heartbeat. | `slot.petals.total` / `slot.petals.remaining`; `slot.heartbeat_today`. | `missions_v2_slots.petals_total`, `missions_v2_slots.petals_remaining`, `missions_v2_slot_runs.heartbeat_today`. | Heartbeats diarios deben actualizar ambos campos e ingresar registro en `missions_v2_heartbeat_log`.【F:apps/web/src/lib/api.ts†L1870-L1880】【F:docs/missions-v2-db-gaps.md†L142-L151】 |
| Objetivo y checklist | Texto principal (`mission.objective`) y objetivos detallados (desde `mission.objectives` o tareas). | `slot.mission.objective`; tareas en `slot.mission.objectives` (fallback: `mission.tasks`). | `missions_v2_missions.objective`, `missions_v2_mission_targets.name` (ordenados). | Servicio debe poblar `objectives` con targets activos. 【F:apps/web/src/lib/api.ts†L1831-L1870】【F:docs/missions-v2-db-gaps.md†L42-L50】 |
| Countdown | Tiempo restante para la misión o cooldown. | `slot.countdown.label` + `slot.countdown.ends_at`. | `missions_v2_slot_runs.expires_at` (misión) y `missions_v2_slots.cooldown_until` (cooldown). | Backend genera `label` legible a partir de timestamps. 【F:apps/web/src/lib/api.ts†L1870-L1881】【F:docs/missions-v2-db-gaps.md†L103-L126】 |
| Botín base | XP, moneda e items de recompensa. | `slot.mission.reward` (xp, currency, items). | `missions_v2_mission_rewards.xp/currency/items`. | Items debe serializarse como JSON array y mapearse a string legible. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L340-L377】【F:docs/missions-v2-db-gaps.md†L52-L63】 |
| Estado de Heartbeat | Indicador "pendiente/sellado" y CTA 💓. | `slot.actions` con `type='heartbeat'` + `slot.heartbeat_today`. | `missions_v2_slot_runs.heartbeat_today` + regla que habilite acción una vez por día con entrada en `missions_v2_heartbeat_log`. | El servicio decide disponibilidad y copy del botón. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L887-L904】【F:docs/missions-v2-db-gaps.md†L142-L151】 |
| Acción "Vincular Daily" | Botón secundario mientras exista endpoint legacy. | `slot.actions` con `type='link_daily'`. | (Temporal) campo derivado del servicio; al migrar a asociación automática se elimina. | No requiere nueva tabla; mantener flag para deshabilitarlo. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L907-L921】 |
| CTA principal | Cambia entre "Abrir cofre", Heartbeat, Link Daily o fallback "Ir al market". | `slot.claim`, `slot.actions`, `mission` presente. | `missions_v2_claims` (para `claim.available`/`enabled`), `missions_v2_slot_runs.status`, `missions_v2_slot_runs.claim_id`. | Backend debe marcar `claim.available` al pasar a `succeeded` y bloquear tras `missions_v2_claims`. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2978-L3055】【F:docs/missions-v2-db-gaps.md†L117-L161】 |
| Overlay de cooldown | Mensaje cuando el slot está en `cooldown`. | `slot.state === 'cooldown'` + `slot.countdown.label`. | `missions_v2_slots.state`, `missions_v2_slots.cooldown_until`. | Necesita job que refresque estado y countdown. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3108-L3121】【F:docs/missions-v2-db-gaps.md†L103-L126】 |

### Datos a normalizar/adaptar
- Garantizar que `missions_v2_missions.requirements` use separadores (`·` o newline) para chips consistentes.
- Incluir en el payload del board los campos derivados (`percent`, `countdown.label`) calculados por el servicio para no duplicar lógica en frontend.
- Documentar acciones soportadas (`heartbeat`, `claim`, `abandon`, etc.) y mapearlas a reglas en `missions_v2_slot_runs`.

## Cards del Market
El tab "Market" muestra tres cartas flip (Main, Hunt, Skill). Al girarlas, cada una expone un carrusel vertical de propuestas, mezclando datos del catálogo y del estado actual (misión activa, disponibilidad, locks).【F:docs/missions-v2.2-functional.md†L17-L20】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3600-L3764】

| Elemento UI | Descripción funcional | Fuente actual (API/UI) | Campos SQL requeridos | Notas |
|-------------|-----------------------|------------------------|------------------------|-------|
| Encabezado de carta | Icono/label del slot + contador de propuestas. | Constante `SLOT_DETAILS` + longitud de `slot.proposals`. | `missions_v2_market_proposals` (vista filtrada por `slot_key`). | Contador se deriva del número de propuestas activas en el catálogo. |
| Índice `#1, #2, #3` | Posición de la propuesta dentro del stack. | Índice del array. | Orden por `priority` en `missions_v2_market_proposals`. | Se recomienda columna `sort_order` para estabilidad. |
| Nombre de misión | Título visible de la propuesta. | `proposal.name` (o `proposal.title` en mocks). | `missions_v2_missions.name`. | Debe venir prelocalizado. 【F:apps/web/src/lib/api.ts†L1837-L1850】 |
| Badges "Activa / En progreso" | Estado relativo a la selección actual del slot. | `proposal.isActive` o flag `locked`. | `missions_v2_slot_runs.status` para la misión del slot; vista de market marca la propuesta activa/ocupada. | Backend decide `locked` cuando run activo coincide con `mission_id`. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3687-L3734】 |
| Resumen corto | Sinopsis de una frase. | `proposal.summary`. | `missions_v2_missions.summary`. | Mantener longitud ≤140 caracteres. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3618-L3625】 |
| Chip de dificultad | Dificultad normalizada (`low/medium/high/epic`). | `proposal.difficulty`. | `missions_v2_missions.difficulty`. | Servicio traduce a copy (`Fácil`, `Media`, etc.). 【F:docs/missions-v2-db-gaps.md†L28-L63】 |
| Recompensa | XP + moneda + items. | `proposal.reward`. | `missions_v2_mission_rewards`. | Misma estructura que cards activas.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3626-L3643】 |
| Objetivo principal | Texto principal de la misión. | `proposal.objective`. | `missions_v2_missions.objective`. | Debe ser breve y accionable. |
| Checklist de objetivos | Lista secundaria (entregables/tareas). | `proposal.objectives`. | `missions_v2_mission_targets.name` (ordenadas). | El servicio debe limitar la lista (p.ej. primeras 3).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3644-L3655】 |
| Requisito inline (Main) | Texto resaltado bajo "Requisito". | `proposal.requirements`. | `missions_v2_missions.requirements`. | Sólo se muestra para `slot='main'`. |
| Chips de metadatos | Duración (`duration_days`) y features por tipo. | `proposal.duration_days`; `proposal.metadata` (spotlight, boosterMultiplier, stat). | `missions_v2_missions.duration_days`; `missions_v2_missions.metadata`. | `metadata` debe incluir claves `spotlight`, `boosterMultiplier`, `stat` según slot.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3618-L3639】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L440-L470】 |
| CTA "Activar" | Botón que activa la propuesta actual. Solo habilitado si el slot está libre y la propuesta no está bloqueada. | `canActivateThisProposal` depende de `slot.claim`, `slot.actions`, `proposal.locked`. | `missions_v2_slots.state`, `missions_v2_slot_runs.status`, `missions_v2_market_proposals.locked_until` (opcional). | El servicio debe validar cooldown antes de devolver `enabled=true`. 【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3660-L3760】 |

### Requerimientos adicionales para el Market
- Necesitamos una fuente real de `missions_v2_market_proposals` que entregue **tres propuestas por slot**, priorizadas según el cuestionario/IA. Puede implementarse como tabla intermedia (`board_id`, `slot_key`, `mission_id`, `sort_order`, `locked`, `available_at`).
- Incluir en el payload del board un flag `isActive` por propuesta cuando coincide con la misión actualmente seleccionada (`missions_v2_slot_runs.mission_id`).
- Propagar campos de metadata específicos por tipo para construir chips automáticos (`metadata.spotlight`, `metadata.boosterMultiplier`, `metadata.stat`).

## Checklist para integración backend → frontend
1. **Serializar board completo** desde SQL: slots con progreso, countdown, acciones y claim state; market con 3 propuestas por slot; efectos/heartbeat actualizados.
2. **Normalizar recompensas** usando `missions_v2_mission_rewards` para evitar duplicar lógica de formato (`XP · Monedas · Items`).
3. **Expose metadatos consistentes** en `missions_v2_missions.metadata` para que el frontend genere chips sin ifs adicionales.
4. **Mantener compatibilidad transitoria** con `missions_v2_state` hasta que el repositorio SQL esté estable, pero poblar todos los campos anteriores para habilitar la UI 3×3 sin mocks.【F:docs/missions-v2-db-gaps.md†L15-L63】
