1. Resumen

Misiones v2 reutiliza la infraestructura actual de Dashboard v3, Daily Quest y los servicios prototipo de Misiones para exponer un tablero operativo con mínima fricción, centrado en contratos claros entre front, API y datos. Este documento delimita qué piezas existentes se conservan, qué extensiones puntuales requiere cada capa y cuáles son los elementos netamente nuevos para cubrir el alcance aprobado de Misiones v2.

2. Referencias de producto

- Léxico oficial y reglas base (Heartbeat, Pétalos, Cooldown 15d, Amuletos/Auras, Boss condicionado al Acto 2) provienen del diseño aprobado.【F:Docs/missions-v2.md†L7-L109】
- La estructura debe respetar tres slots activos (Main/Hunt/Skill) y un Market inferior, con UI de cards que muestren estado, progreso, pétalos, countdown y CTAs contextuales.【F:Docs/missions-v2.md†L32-L134】
- El Boss quincenal se habilita únicamente con Main en Acto 2 y combina escudo ligado a dailies + golpe final con proof.【F:Docs/missions-v2.md†L87-L105】
- El claim de recompensas es idempotente y exclusivo de `/dashboard-v3/missions-v2`, alineado con el flujo de Daily “Tareas de Misión”.【F:Docs/missions-v2.md†L126-L134】【F:Docs/missions-v2.md†L168-L170】

3. Reuso de código existente

- Componentes UI reutilizables:
  - `apps/web/src/components/ui/Card.tsx` para la estructura accesible de cards secciones.【F:apps/web/src/components/ui/Card.tsx†L1-L46】
  - `apps/web/src/components/common/ProgressBar.tsx` para barras de progreso en slots y recompensas.【F:apps/web/src/components/common/ProgressBar.tsx†L1-L18】
  - `apps/web/src/components/common/ToastBanner.tsx` y el banner de MissionsV2Board para errores/contexto.【F:apps/web/src/components/common/ToastBanner.tsx†L1-L18】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L19-L170】
  - `apps/web/src/components/layout/Navbar.tsx` y `apps/web/src/components/layout/MobileBottomNav.tsx` mantienen navegación y feature gating por sección.【F:apps/web/src/components/layout/Navbar.tsx†L5-L103】【F:apps/web/src/components/layout/MobileBottomNav.tsx†L1-L74】
  - `apps/web/src/hooks/useRequest.ts` para normalizar fetch async y estados de carga en board/rewards/daily.【F:apps/web/src/hooks/useRequest.ts†L1-L70】
- Servicios/endpoints que se reutilizan y extienden:
  - `apps/api/src/routes/missions.ts` + `apps/api/src/services/missionsV2Service.ts` sostienen selección, reroll, boss y claim; se adaptan a los nuevos contratos REST y persistencia sin duplicar reglas de booster, shield y eventos.【F:apps/api/src/routes/missions.ts†L1-L169】【F:apps/api/src/services/missionsV2Service.ts†L200-L720】
  - `apps/api/src/services/dailyQuestService.ts` ya calcula bonus y llama a `applyHuntXpBoost`, devolviendo redirect a Misiones v2 tras submit.【F:apps/api/src/services/dailyQuestService.ts†L586-L616】
  - `apps/web/src/lib/api.ts` expone helpers para board, select, reroll, heartbeat, claim; se mantiene la capa central cambiando únicamente las rutas base.【F:apps/web/src/lib/api.ts†L1826-L1967】
  - `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx` contiene la UI del tablero con modales y telemetría reutilizable.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L1-L170】
- Feature flags, auth, tracking y notificaciones:
  - `apps/web/src/lib/featureFlags.ts` controla `missionsV2`; se conserva para gatear ruta y UI.【F:apps/web/src/lib/featureFlags.ts†L1-L59】
  - `apps/web/src/App.tsx` + `apps/api/src/middlewares/auth-middleware.ts` aseguran acceso Clerk y verificación Bearer en todas las rutas protegidas.【F:apps/web/src/App.tsx†L98-L175】【F:apps/api/src/middlewares/auth-middleware.ts†L1-L110】
  - Telemetría front (`emitMissionsV2Event`) y backend (`recordMissionsV2Event`) centralizan logging de eventos misiones; se amplían con nuevos nombres sin duplicar loggers.【F:apps/web/src/lib/telemetry.ts†L54-L75】【F:apps/api/src/services/missionsV2Telemetry.ts†L1-L37】
  - `apps/web/src/components/DailyQuestModal.tsx` ya dispara toasts con CTA a Misiones v2 cuando hay bonus; se reusa para “Heartbeat listo”.【F:apps/web/src/components/DailyQuestModal.tsx†L889-L926】

4. Cambios mínimos sobre lo existente

1. `apps/web/src/lib/api.ts`: actualizar las rutas de Misiones v2 para apuntar a los nuevos endpoints `/api/missions/*`, manteniendo los helpers y `logShape` existentes para no duplicar cliente HTTP.【F:apps/web/src/lib/api.ts†L1860-L1967】
2. `apps/web/src/components/dashboard-v3/MissionsV2Board.tsx`: ajustar parseo/estado a los contratos definitivos (incluir ownership/idempotencia de heartbeat, claims bloqueados), reutilizando Card/Toast/ProgressBar ya importados.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L19-L171】
3. `apps/web/src/pages/DashboardV3.tsx`: conservar la ruta `missions-v2` gateada por `FEATURE_MISSIONS_V2`, agregando breadcrumb/PageTitle definitivo cuando el board esté productivo.【F:apps/web/src/pages/DashboardV3.tsx†L160-L285】
4. `apps/web/src/components/DailyQuestModal.tsx`: extender la sección de éxito para embedir la lista “Tareas de Misión” reutilizando toasts y CTA existentes sin romper el modal principal.【F:apps/web/src/components/DailyQuestModal.tsx†L889-L926】
5. `apps/api/src/routes/missions.ts`: alinear rutas REST (`/missions/board`, `/missions/select`, etc.) a los contratos nuevos, aplicando el mismo `authMiddleware` y `parseWithValidation` para evitar duplicación de validaciones.【F:apps/api/src/routes/missions.ts†L1-L169】
6. `apps/api/src/services/missionsV2Service.ts`: reemplazar el store en memoria por persistencia real y exponer heartbeat/claim idempotentes reutilizando lógica de booster, boss y telemetría actual.【F:apps/api/src/services/missionsV2Service.ts†L200-L720】
7. `apps/api/src/services/dailyQuestService.ts`: anexar la sección “Tareas de Misión” al payload de submit (sin tocar el flujo existente) y registrar heartbeat diario contra Misiones v2 antes de devolver bonus.【F:apps/api/src/services/dailyQuestService.ts†L586-L616】
8. `apps/web/src/components/dashboard-v3/MissionsSection.tsx`: marcar como legacy (solo lectura) para evitar colisiones con v2, reutilizando copy existente pero enlazando a la ruta nueva vía CTA condicional.【F:apps/web/src/components/dashboard-v3/MissionsSection.tsx†L1-L64】

5. Elementos nuevos necesarios

- Ruta web aislada `/dashboard-v3/missions-v2`: mantiene acceso directo (sin menú) y redirige al índice si el flag está off, como hoy, pero cargando el board definitivo y bloqueando claims fuera de esta vista.【F:apps/web/src/pages/DashboardV3.tsx†L174-L185】【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L155-L170】
- Contratos API:
  - `GET /api/missions/board`: `{} → { season_id, generated_at, slots[], boss, gating, communications[] }`. Slots incluyen `{ id, slot, mission, state, petals { total, remaining }, heartbeat_today, progress { current, target, percent }, countdown, actions[], claim { enabled, cooldown_until } }`. Respuesta cacheable por 60s. Ownership: `userId` inferido del token; devuelve 403 si board pertenece a otro usuario.
  - `POST /api/missions/heartbeat`: body `{ mission_id }`; marca heartbeat diario, idempotente por usuario/día/slot; responde `{ status: 'ok', petals_remaining, heartbeat_date }`.
  - `POST /api/missions/select`: `{ slot, mission_id }` → `{ board }` actualizado; valida cooldown y ownership, responde 409 si slot ocupado.
  - `POST /api/missions/reroll`: `{ slot }` → `{ board }`, respetando límites y `next_reset_at`.
  - `POST /api/missions/link-daily`: `{ slot, task_id }` vincula Hunt/Boss fase 1, idempotente; responde `{ board, linked_task_id }`.
  - `POST /api/boss/phase2`: `{ mission_id, proof }` registra golpe final; responde `{ boss_state, rewards_preview }`, exige Main Acto 2 activo.
  - `POST /api/missions/:id/claim`: sin body adicional; ejecuta claim exclusivo, idempotente; responde `{ rewards { xp, currency, items }, board }`. Todos los endpoints verifican `user_id` del token y retornan 404 si la misión no pertenece al usuario.
- Telemetría (añadir en `emitMissionsV2Event` y `recordMissionsV2Event`): `missions_v2_view`, `missions_v2_select_open`, `missions_v2_proposals_created`, `missions_v2_selected`, `missions_v2_reroll`, `missions_v2_heartbeat`, `missions_v2_progress_tick`, `missions_v2_boss_phase1_tick`, `missions_v2_boss_phase2_finish`, `missions_v2_reward_claimed`. Los cuatro primeros ya existen; se agregan los restantes manteniendo el formateo compartido.【F:apps/web/src/lib/telemetry.ts†L54-L75】【F:apps/api/src/services/missionsV2Telemetry.ts†L1-L37】【F:apps/api/src/services/missionsV2Types.ts†L6-L33】
- Gating de Claim: la API devolverá `claim.enabled=false` fuera de `/dashboard-v3/missions-v2`; el front validará `window.location.pathname` antes de llamar a `claimMissionsV2Slot` para reforzar exclusividad.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L155-L170】
- UI mínima: cada slot se renderiza con Card + ProgressBar mostrando `nombre`, `tipo`, `estado`, `requisitos/meta`, `countdown`, `pétalos`, `barra de progreso`, `heartbeat_today`, CTA principal (Heartbeat, Evidence, Link Daily, Reroll, Claim) y CTA secundaria (Honorable Abandon). Se reutilizan chips existentes para estados y `ToastBanner` para errores globales.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L19-L170】
- Integración Daily: la sección de éxito del modal incluirá “Tareas de Misión” listadas desde el board (slots activos), con CTA “Marcar Heartbeat” que abre `/dashboard-v3/missions-v2`; no rompe el flujo actual ni la estructura del toast.【F:apps/web/src/components/DailyQuestModal.tsx†L889-L926】

6. Modelo de estados y reglas

- Máquina de estados por misión: `idle → active → succeeded | failed`, con cooldown 15d antes de volver a `idle`, reflejado en las transiciones actuales del servicio (status `active/completed/claimed`).【F:apps/api/src/services/missionsV2Types.ts†L52-L71】
- Heartbeat: una acción diaria por slot (`POST /api/missions/heartbeat`) que fija progreso del día, activa booster Hunt para el siguiente submit y evita consumir pétalos; el estado `heartbeat_today` ya existe en el board y se persistirá por día.【F:Docs/missions-v2.md†L66-L75】【F:apps/api/src/services/missionsV2Service.ts†L633-L720】
- Pétalos: cada misión arranca con 3; `−1` por día sin heartbeat, y al llegar a 0 → `failed` + cooldown 15d. La API debe exponer `petals` y cooldown en `claim`/`status` para que la UI muestre countdown.【F:Docs/missions-v2.md†L66-L75】
- Boss: sólo visible cuando Main está activa y en Acto 2; Fase 1 baja escudo al completar dailies con heartbeat (reutiliza `missions_v2_boss_phase1_tick`); Fase 2 requiere proof y finaliza con `missions_v2_boss_phase2_finish` + recompensa (medalla/auras).【F:Docs/missions-v2.md†L87-L105】【F:apps/api/src/services/missionsV2Service.ts†L633-L720】

7. Datos y persistencia

- Datos reutilizables: `daily_log` captura tareas completadas por usuario/día (clave para heartbeat y boosters).【F:apps/api/db-snapshot.sample.json†L248-L306】 Las vistas `v_user_daily_xp`, `v_user_quests_today`, `v_user_total_xp`, `v_user_xp_by_pillar` sustentan métricas de XP, adherencia y progreso mostradas en Dashboard/Rewards.【F:apps/api/src/controllers/logs/get-user-daily-xp.ts†L21-L47】【F:apps/api/src/routes/users/summary-today.ts†L58-L97】【F:apps/api/src/controllers/users/get-user-total-xp.ts†L15-L29】【F:apps/api/src/routes/users/pillars.ts†L166-L245】 El tablero usa `xp_bonus` para sumar recompensas extras.【F:apps/api/db-snapshot.sample.json†L1560-L1604】
- Gaps detectados: no existe tabla persistente para board/slots (el servicio usa `Map` en memoria), ni registros de heartbeat, pétalos, cooldowns, claims o amuletos/aura. Tampoco hay mapeo de boss progress ni enlace a daily tasks más allá del booster in-memory.【F:apps/api/src/services/missionsV2Service.ts†L200-L479】 Se documentan los DDL propuestos y estrategia en `docs/missions-v2-db-gaps.md`.

8. Seguridad y permisos

- Todas las rutas se protegen vía Clerk: front exige `RequireUser` y backend valida Bearer con `authMiddleware`, que crea usuarios automáticamente si el token es válido.【F:apps/web/src/App.tsx†L98-L175】【F:apps/api/src/middlewares/auth-middleware.ts†L1-L110】【F:apps/api/src/services/auth-service.ts†L1-L192】
- Ownership: cada misión/claim se busca por `user_id` + `mission_id`; respuestas 404/403 si no pertenece al usuario. Claims deben ser idempotentes: si ya se reclamó, devolver estado `claimed` sin duplicar recompensa.【F:apps/api/src/services/missionsV2Service.ts†L600-L616】
- Validación de estados: select/reroll/claim/link daily usan zod y `parseWithValidation`; se mantienen para evitar mutaciones inválidas.【F:apps/api/src/routes/missions.ts†L17-L169】

9. Riesgos y decisiones

- Conflicto potencial con `apps/api/src/modules/missions-v2/board-store.ts`, prototipo en memoria usado por rutas `/users/:id/missions/v2`; se consolidará en el servicio único para evitar divergencia de reglas de acciones/future notes.【F:apps/api/src/modules/missions-v2/board-store.ts†L1-L200】
- Duplicación UI con `MissionsSection` legacy: se mantendrá read-only con CTA a la vista nueva, evitando doble mantenimiento de slots.【F:apps/web/src/components/dashboard-v3/MissionsSection.tsx†L1-L64】
- Integración XP/rewards: `applyHuntXpBoost` ya muta progreso e impacta boss shield; migrar a persistencia sin cuidado puede duplicar bonus o romper boss. Se decidirá guardar booster/boss en tablas dedicadas antes de eliminar el `Map` para asegurar consistencia.【F:apps/api/src/services/missionsV2Service.ts†L633-L717】
- Telemetría: front y backend ya registran algunos eventos; extender lista sin normalizar puede inflar logs. Se opta por ampliar los enum existentes para centralizar filtros y evitar múltiples pipelines.【F:apps/web/src/lib/telemetry.ts†L54-L75】【F:apps/api/src/services/missionsV2Types.ts†L6-L33】

10. Plan de integración (alto nivel)

1. Activar flag `missionsV2` y mantener ruta oculta mientras se migran servicios a `/api/missions/*` (feature flag + ruta aislada).【F:apps/web/src/lib/featureFlags.ts†L1-L59】【F:apps/web/src/pages/DashboardV3.tsx†L174-L185】
2. Implementar contratos API y persistencia (board, heartbeat, boss, claim) reutilizando `missionsV2Service` y asegurando cobertura con zod/auth existentes.【F:apps/api/src/routes/missions.ts†L1-L169】【F:apps/api/src/services/missionsV2Service.ts†L200-L720】
3. Integrar UI definitiva (slots, cards, gating de claim) y la sección Daily “Tareas de Misión”, reforzando exclusividad de claims vía ruta.【F:apps/web/src/components/dashboard-v3/MissionsV2Board.tsx†L19-L170】【F:apps/web/src/components/DailyQuestModal.tsx†L889-L926】
4. Paralelizables: backend de persistencia vs. rediseño UI (mientras usen contratos simulados); telemetría puede activarse junto a la API. Daily integration depende del endpoint heartbeat.
5. Criterios de aceptación MVP: board con tres slots y Market operativo, heartbeat diario funcional, boss fase 1+2 con shield, claim idempotente exclusivo, integración con Daily que muestra tareas de misión y CTA de heartbeat, telemetría completa registrada en ambos extremos.
