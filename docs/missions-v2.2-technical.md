# Misiones v2.2 — Auditoría técnica

## Resumen ejecutivo
- El tablero y la UI reactiva de Misiones v2 ya existen en `MissionsV2Board`, con tabs activos/market y soporte de carruseles; sin embargo, el backend mantiene lógica heredada (boss, link manual) y catálogos estáticos de una sola propuesta por slot, incompatibles con el flujo 3×3 solicitado.
- El servicio `missionsV2Service` centraliza reglas de slots, heartbeats y booster, pero continúa orientado a boss raid: hay que simplificarlo para la versión 2.2 (sin boss, booster fijo +3 XP, sellos permanentes) y mover la fuente de verdad del archivo JSON a tablas relacionales.
- Daily Quest ya invoca `applyHuntXpBoost` y rellena `missions_v2.tasks`, por lo que el vínculo Daily↔Misiones es reutilizable; hay que eliminar la acción manual de link y propagar metadatos para sellos y bordes resaltados.

## Requisitos clave del funcional (extracto)
- Dos tabs: “Misiones Activas” con hasta 3 slots (Main, Hunt, New Skill) y “Market” con 3 cartas flip y carrusel vertical interno de 3 propuestas por tipo (total 9).【F:docs/missions-v2.2-functional.md†L12-L20】
- Cuestionario de activación por tipo de misión, integrado con onboarding y datos históricos.
- Hunt: booster +3 XP sólo después de un Heartbeat; sin doble XP ni dependencia de boss.
- New Skill: al completar, +1 XP permanente a tareas de la stat y sello visible en Rewards; un upgrade por stat.
- Main: quincenal, sin boss en esta versión.
- Daily Quest: sin sección aparte; sellos por tipo en tareas asociadas y borde brillante si provienen de la misión.
- Deprecaciones: ocultar “Link Daily” manual; asociación automática por tags/stat/fricción.

## Inventario reutilizable
### Front-end (`apps/web`)
- `components/dashboard-v3/MissionsV2Board.tsx` ya renderiza tabs Active/Market, carrusel horizontal de slots y cartas flip con pila vertical de propuestas.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2881-L3340】
- `lib/api.ts` expone `getMissionsV2Board`, `postMissionsV2Heartbeat`, `linkMissionsV2Daily` y `claimMissionsV2Mission`, con tipos alineados a la respuesta actual del backend.【F:apps/web/src/lib/api.ts†L1892-L2005】
- Componentes reutilizables: `Card`, `ProgressBar`, `ToastBanner` y grillas de `DashboardV3` mantienen consistencia visual.【F:apps/web/src/components/ui/Card.tsx†L4-L69】【F:apps/web/src/components/common/ProgressBar.tsx†L1-L19】
- Gating por flag `FEATURE_MISSIONS_V2` en la ruta `/dashboard-v3/missions-v2` evita fugas cuando el feature está apagado.【F:apps/web/src/pages/DashboardV3.tsx†L265-L292】

### Backend (`apps/api`)
- Router `routes/missions.ts` entrega `GET /api/missions/board`, `POST /api/missions/select`, `POST /api/missions/reroll`, `POST /api/missions/heartbeat`, `POST /api/missions/:id/claim` y el endpoint legacy `POST /api/missions/link-daily`.【F:apps/api/src/routes/missions.ts†L64-L198】
- Servicio `missionsV2Service.ts` maneja estado, heartbeats, booster (x1.5), boss y mercado; genera `missions_v2_*` eventos de telemetría.【F:apps/api/src/services/missionsV2Service.ts†L720-L811】【F:apps/api/src/services/missionsV2Service.ts†L1136-L1219】
- `dailyQuestService.ts` invoca `applyHuntXpBoost`, rellena `missions_v2.tasks` y reutiliza el board tras cada envío diario.【F:apps/api/src/services/dailyQuestService.ts†L594-L655】
- Telemetría backend en `missionsV2Telemetry.ts` persistida en memoria para debugging.【F:apps/api/src/services/missionsV2Telemetry.ts†L1-L52】
- Repositorio `missionsV2Repository.ts` permite almacenamiento JSON (`missions_v2_store.json`) o tabla `missions_v2_state` via `SqlMissionsRepository` (sin migración aún).【F:apps/api/src/services/missionsV2Repository.ts†L1-L103】

### Datos / DB
- No hay migraciones para Misiones v2: sólo existe el archivo JSON demo y la interfaz para `missions_v2_state`.
- Migraciones actuales cubren Daily Quest y usuario; no hay tablas para board/slots/proposals/heartbeats/claims.

## Gap analysis
| Requisito | Existe hoy | Gap | Acción sugerida |
|-----------|------------|-----|-----------------|
| Tabs Active/Market con 3 slots | UI soporta toggles y carruseles (3 slots).【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L2881-L3064】 | Ajustar copy/estado para Market 3×3 definitivo y ocultar boss card. | Reutilizar componente, eliminar panel boss y alinear labels a v2.2.
| Market 3×3 (flip + carrusel vertical 3 propuestas) | UI ya implementa flip y lista vertical, pero backend sólo provee 1 propuesta/slot (`missionTemplates`).【F:apps/api/src/services/missionsV2Service.ts†L771-L799】 | Falta catálogo con al menos 3 propuestas por tipo y ordenamiento por prioridad. | Extender origen de datos (tabla o servicio) y exponer 3 propuestas activas por slot.
| Booster Hunt +3 XP tras Heartbeat | `applyHuntXpBoost` usa multiplicador x1.5 y depende del boss/shield.】【F:apps/api/src/services/missionsV2Service.ts†L1136-L1212】 | Cambiar lógica a bono fijo +3 XP, limpiar referencias a boss y garantizar idempotencia por envío/día. | Actualizar servicio y tests para nuevo cálculo y logs.
| New Skill: sello +1 XP permanente | No hay modelado de sellos; `MissionEffect` sólo cubre auras/amuletos temporales.【F:apps/api/src/services/missionsV2Types.ts†L78-L111】 | Definir `missions_v2_effect` con tipo `skill_seal`, persistir stat/flag y exponer en Rewards. | Agregar campos a efectos y sincronizar con Rewards.
| Main sin Boss | Board siempre incluye boss y acciones `special_strike`/phase2.【F:apps/api/src/services/missionsV2Service.ts†L600-L680】【F:apps/web/src/lib/api.ts†L1855-L1889】 | Necesario ocultar boss en API/UI mientras la funcionalidad esté fuera de scope. | Ajustar builder para devolver boss nulo o placeholder deshabilitado.
| Daily con sellos y borde brillante | Daily API devuelve tareas de misión pero sin metadatos visuales.【F:apps/api/src/services/dailyQuestService.ts†L636-L655】 | Faltan tags/sello/tipo_misión en payload y bandera para borde animado. | Extender payload `missions_v2.tasks` con metadata de renderizado.
| Cuestionario de activación + IA | No existe módulo; board usa plantillas estáticas y auto-selección semanal.【F:apps/api/src/services/missionsV2Service.ts†L1040-L1110】 | Diseñar endpoints y persistencia para respuestas y perfil IA. | Integrar con onboarding y generador cuando esté disponible.
| Link Daily automático | Endpoint y acción manual siguen activos.【F:apps/api/src/routes/missions.ts†L100-L148】【F:apps/web/src/lib/api.ts†L1932-L1997】 | Debe retirarse de UI/API y reemplazarse por asociación automática. | Marcar endpoint deprecated, ocultar botón y mover lógica a Daily.
| Sellos permanentes visibles en Rewards | Rewards actual no consume efectos de Misiones v2. | Faltan campos/bridge para mostrar sellos por stat. | Extender `RewardsSection` y API de achievements cuando existan los datos.

## Contratos API (estado y ajustes)
| Endpoint | Estado actual | Ajuste v2.2 | Notas |
|----------|---------------|-------------|-------|
| `GET /api/missions/board` | Devuelve slots, boss, market 1×N y rewards. | Quitar boss, incluir `tabs` metadata (slots + market 3×3), sellos activos, `booster_active`, `booster_bonus_xp=3`, ownership/idempotencias. | Reutilizar estructura actual, ampliar `market` y `effects`.
| `POST /api/missions/heartbeat` | Idempotente por mission/día, habilita booster y boss shield. | Mantener idempotencia, retornar estado del booster (activo, siguiente uso) y sellos de Daily. | Simplificar respuesta, sin side-effects de boss.
| `POST /api/missions/select` | Selecciona propuesta y crea selección; no valida límites extra. | Añadir validación de slots libres (3) y cooldowns; registrar fuente (market/card index). | Mantener contrato, ampliar metadata.
| `POST /api/missions/reroll` | Regenera propuestas (1 plantilla). | Limitar a market si hay menos de 3 propuestas, respetar cooldown y flags. | Debe trabajar con catálogo ampliado.
| `POST /api/missions/link-daily` | Vigente para asociación manual. | Deprecar/ocultar; mantener 410 o 404 tras limpieza. | Documentar migración automática por tags/stat.
| `POST /api/missions/reroll` + flags | Usa `slot` enum, sin control de market 3×3. | Añadir control de stock y contadores por propuesta. | --
| `POST /api/missions/:id/claim` | Protegido por header `x-missions-claim-source`. | Mantener idempotencia y devolver efectos (sellos/booster). | Ajustar validaciones tras quitar boss.

## Modelo de datos y persistencia
- Persistencia actual: snapshot JSON (archivo o tabla `missions_v2_state`). Sin estructura relacional.
- Requerido para v2.2:
  - Tablas `missions_v2_board`, `missions_v2_slots`, `missions_v2_slot_runs`, `missions_v2_market_proposals`, `missions_v2_heartbeat_log`, `missions_v2_claims`, `missions_v2_effects` (ver blueprint previo para base relacional).
  - Nuevo tipo `missions_v2_effect` con `type = 'skill_seal'`, payload `{ stat: string, permanent: true }` para sellos de stat.
  - Tabla/catalogo de propuestas por slot con prioridad y campos para carrusel (mínimo 3 activas por tipo).
  - Campos adicionales en claims para registrar `booster_bonus_xp` aplicado y bandera `skill_seal_awarded`.

## Flujo Daily ↔ Misiones
- `submitDailyQuest` ya calcula XP antes/después y aplica `applyHuntXpBoost`; reutilizar esta ruta para inyectar el bono fijo +3 XP y marcar misiones Hunt completadas.【F:apps/api/src/services/dailyQuestService.ts†L594-L655】
- El payload `missions_v2.tasks` debe incluir `mission_type`, `stat`, `seal_icon` y `is_mission_spawned` para que la web renderice sellos y borde animado.
- Heartbeat previo: mantener `registerMissionHeartbeat` como gate para habilitar `booster_active` y registrar sello diario.
- Asociación automática: determinar misión Hunt en curso y mapear por tags/stat/fricción (sin endpoint manual).

## UI/UX técnico
- Reutilizar `MissionsV2Board` para tabs y carruseles; eliminar renderizado de boss y ajustar copy al Market 3×3.
- Cada carta flip encapsula su carrusel vertical (`missions-market-card__stack`); se debe limitar a 3 propuestas visibles y bloquear scroll infinito hasta completar catálogos.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L3111-L3339】
- Componentes compartidos: `Card`, `ProgressBar`, chips/tags existentes, toasts para feedback de heartbeat y errores.【F:apps/web/src/components/common/ToastBanner.tsx†L1-L120】
- Sellos visuales: definir tokens (color/icono) para Main, Hunt, New Skill y sellos permanentes por stat; reutilizar badges de Rewards cuando exista data.
- Manejo de scroll: carrusel horizontal externo ya usa refs; carrusel vertical necesita `snap` y bloqueo de scroll lateral para accesibilidad.
- Feature flag: mantener `FEATURE_MISSIONS_V2` y agregar sub-flag (`missionsV2Market`) si se necesita rollout gradual.

## Telemetría y flags
- Front: `emitMissionsV2Event` soporta eventos de view, market y claims; agregar payloads para sellos, boosters y cuestionario.【F:apps/web/src/lib/telemetry.ts†L43-L79】
- Backend: `recordMissionsV2Event` registra `missions_v2_selected`, `missions_v2_reroll`, `missions_v2_heartbeat`, `missions_v2_progress_tick`, `missions_v2_reward_claimed`; extender con `missions_v2_market_view`, `missions_v2_market_proposal_select`, `missions_v2_market_reroll` según tablero 3×3.【F:apps/api/src/services/missionsV2Telemetry.ts†L1-L52】
- Feature flags: seguir centralizando en `featureFlags.ts`; documentar flags nuevos relacionados a cuestionario/market ampliado.

## Riesgos y mitigaciones
- **Idempotencia de claims**: ya controlada por estado `claimed`; validar que nuevas tablas mantengan locks y respuestas consistentes.
- **Doble contabilidad de XP**: asegurar que el bono +3 XP se aplique una sola vez por día/slot (`submissionKey` ya cubre), ajustando logs para detectar duplicados.【F:apps/api/src/services/missionsV2Service.ts†L1166-L1212】
- **Sincronía con Daily**: la eliminación del endpoint `link-daily` requiere mapping robusto (tags/stat/fricción) para evitar slots sin bono.
- **Rendimiento Market 3×3**: cargar 9 propuestas con assets puede impactar; considerar precarga lazy y caché.
- **Migración de estado**: pasar del archivo JSON a SQL implica job de migración/seed y limpieza de data demo.

## Checklist de aceptación (MVP)
- Tabs “Misiones Activas” y “Market” visibles/navegables.
- Market: 3 cartas flip, reverso con carrusel vertical de 3 propuestas por tipo (total 9), CTAs habilitados según slot libre/cooldown.
- Hunt: booster +3 XP aplicado correctamente (1→3, 3→6, 7→10); requiere Heartbeat previo; sin doble conteo.
- New Skill: al completar misión, queda sello y +1 XP permanente a la stat; visible en Rewards; una sola mejora por stat.
- Main: tareas integradas 14 días, sin Boss.
- Daily: tareas con sellos por tipo de misión; tareas creadas para misión con borde animado; progreso actualizado al enviar Daily.
- Claim idempotente; Link Daily legacy oculto/deprecado.

## Backlog técnico (priorizado)
1. **Migrar almacenamiento de Misiones v2 a SQL (épica)**
   - Criterios: tablas board/slots/propuestas/heartbeats/claims/effects creadas, seed inicial desde catálogo; estado existente migrado.
2. **Actualizar `missionsV2Service` para versión 2.2 (épica)**
   - Criterios: sin boss, booster +3 XP, catálogo 3 propuestas/slot, efectos `skill_seal`, endpoint `link-daily` retirado y contratos ajustados.
3. **Instrumentar Market 3×3 en frontend (épica)**
   - Criterios: UI sin boss, cartas flip limitadas a 3 propuestas, estado/telemetría coherente con nuevas propiedades.
4. **Metadatos de Daily Quest para sellos y borde animado (quick win)**
   - Criterios: payload `missions_v2.tasks` incluye `mission_type`, `stat`, `seal`, `is_mission_spawned`; web muestra sellos.
5. **Deprecación segura de `POST /api/missions/link-daily` (quick win)**
   - Criterios: endpoint retorna 410 o queda oculto tras feature flag; UI elimina botón y telemetría actualizada.
6. **Integrar sello permanente en Rewards (quick win)**
   - Criterios: Rewards muestra sellos de stat desde nuevo modelo `skill_seal`; tests de render actualizados.
7. **Cuestionario de activación integrado con onboarding (épica)**
   - Criterios: endpoint para respuestas, persistencia, telemetría y gating por flag; board se nutre con resultados.

Documento generado en docs/missions-v2.2-technical.md + backlog propuesto.
