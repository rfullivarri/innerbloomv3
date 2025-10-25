# Misiones v2 — Contrato API (front-first)

La UI de Misiones v2 consume los siguientes contratos bajo el flag `missionsV2`. El backend expone stubs que respetan estos shapes para habilitar la integración end-to-end sin lógica de base de datos todavía.

## Feature flag y rutas
- **Flag**: `missionsV2` (se lee desde `FEATURE_FLAGS`, `FEATURE_MISSIONSV2`, `VITE_FEATURE_MISSIONSV2`). Si el flag está apagado se mantiene el comportamiento legacy de `/missions/*`.
- **Base path**: `/api/missions/*` (autenticado via middleware existente).

## Tipos compartidos
Los tipos públicos están definidos en `@innerbloom/missions-v2-contracts` y son consumidos tanto por el frontend como por los stubs del backend:

- `MissionsV2BoardResponse`
- `MissionsV2MarketResponse`
- `MissionsV2HeartbeatResponse`
- `MissionsV2ClaimResponse`
- `MissionsV2ActivatePayload`
- `MissionsV2AbandonPayload`
- `MissionsV2HeartbeatPayload`
- `MissionsV2ClaimPayload`

Los campos marcados como **derivados** son calculados por servicio y el backend debe entregarlos ya normalizados para evitar duplicar lógica en el front (`progress.percent`, `countdown.label`, `market.proposals.locked`, `market.proposals.isActive`, `market.proposals.available_at`, `boss.countdown.label`, `board.generated_at`).

## Endpoints y shapes

### GET `/missions/board`
- **Response**: `MissionsV2BoardResponse`.
- **Uso**: hidrata el carrusel de Misiones Activas, el banner del boss y el market (cuando viene embebido en la respuesta).

### GET `/missions/market`
- **Response**: `MissionsV2MarketResponse`.
- **Uso**: refrescar únicamente las cartas del market (3×3). Permite orquestar futuros swaps sin tocar el board completo.

### POST `/missions/heartbeat`
- **Body**: `MissionsV2HeartbeatPayload` (`{ missionId: string }`).
- **Response**: `MissionsV2HeartbeatResponse` con `petals_remaining` y `heartbeat_date` ya sellados.

### POST `/missions/:id/claim`
- **Response**: `MissionsV2ClaimResponse` (`board` + `rewards`).
- **Notas**: mantiene el gating por header `x-missions-claim-source`/`referer`. Cuando el flag está activo, los stubs responden el mismo board actualizado para facilitar la UI de claim.

### POST `/missions/activate`
- **Body**: `MissionsV2ActivatePayload` (`{ slot, proposal_id }`).
- **Response**: `MissionsV2BoardResponse` con el slot actualizado y el market sincronizado.

### POST `/missions/abandon`
- **Body**: `MissionsV2AbandonPayload` (`{ slot, mission_id }`).
- **Response**: `MissionsV2BoardResponse` con el slot reseteado y cooldown preparado.

## Ejemplos de payloads reales
Los siguientes ejemplos son serializados a partir de los stubs actuales. Copiarlos permite alimentar el front en mocks o tests visuales.

<details>
<summary>GET /missions/board</summary>

El payload completo está disponible para copy/paste en [`docs/missions-v2-board-sample.json`](./missions-v2-board-sample.json). Fragmento principal:

```json
{
  "season_id": "season-aurora-2024",
  "generated_at": "2024-12-01T15:04:05.000Z",
  "slots": [
    {
      "id": "slot-main-aurora",
      "slot": "main",
      "mission": {
        "id": "mission-main-001",
        "name": "Guardianes del Bloom",
        "type": "main",
        "summary": "Defiende la flor central completando tareas coordinadas.",
        "requirements": "Completar briefing semanal · Equipo de 3 agentes",
        "objective": "Resistir tres oleadas de amenazas al núcleo.",
        "objectives": ["Completar la ronda de reconocimiento", "Entregar reporte de vulnerabilidades", "Coordinar defensa con el squad"],
        "reward": { "xp": 450, "currency": 120, "items": ["Llave Prisma"] },
        "tasks": [
          { "id": "mission-main-001-task-1", "name": "Coordinar defensa", "tag": "coordination" },
          { "id": "mission-main-001-task-2", "name": "Sellar primer pétalo", "tag": "action" }
        ],
        "tags": ["story", "team"],
        "metadata": { "spotlight": true, "boosterMultiplier": 1.5 }
      },
      "state": "active",
      "petals": { "total": 5, "remaining": 3 },
      "heartbeat_today": false,
      "progress": { "current": 2, "target": 5, "percent": 40 },
      "countdown": { "ends_at": "2024-12-03T15:04:05.000Z", "label": "Termina en 2 días" },
      "actions": [
        { "id": "slot-main-aurora:heartbeat", "type": "heartbeat", "label": "Registrar Heartbeat", "enabled": true },
        { "id": "slot-main-aurora:link", "type": "link_daily", "label": "Vincular Daily", "enabled": true },
        { "id": "slot-main-aurora:claim", "type": "claim", "label": "Reclamar botín", "enabled": false }
      ],
      "claim": { "available": false, "enabled": false, "cooldown_until": null }
    }
  ],
  "boss": {
    "id": "boss-aurora-001",
    "name": "Centinela de Cristal",
    "status": "ready",
    "description": "Coordina golpes especiales para romper el escudo del jefe estacional.",
    "countdown": { "ends_at": "2024-12-01T19:04:05.000Z", "label": "Escudo vulnerable por 4h" },
    "actions": [
      { "id": "boss-phase2", "type": "special_strike", "label": "Activar Fase 2", "enabled": true },
      { "id": "boss-submit-evidence", "type": "submit_evidence", "label": "Enviar evidencia", "enabled": true }
    ]
  },
  "gating": { "claim_url": "/dashboard-v3/missions-v2" }
}
```

</details>

<details>
<summary>GET /missions/market</summary>

Payload completo listo para pruebas en [`docs/missions-v2-market-sample.json`](./missions-v2-market-sample.json). Fragmento inicial:

```json
{
  "market": [
    {
      "slot": "main",
      "proposals": [
        {
          "id": "mission-main-001",
          "slot": "main",
          "name": "Guardianes del Bloom",
          "summary": "Defiende la flor central completando tareas coordinadas.",
          "requirements": "Completar briefing semanal · Equipo de 3 agentes",
          "objective": "Resistir tres oleadas de amenazas al núcleo.",
          "objectives": ["Completar la ronda de reconocimiento", "Entregar reporte de vulnerabilidades", "Coordinar defensa con el squad"],
          "reward": { "xp": 450, "currency": 120, "items": ["Llave Prisma"] },
          "difficulty": "high",
          "tags": ["story", "team"],
          "metadata": { "spotlight": true, "boosterMultiplier": 1.5 },
          "duration_days": 5,
          "locked": true,
          "isActive": true,
          "available_at": "2024-12-02T03:04:05.000Z"
        }
      ]
    }
  ]
}
```

</details>

> **Nota:** los timestamps de los ejemplos usan valores ilustrativos (`2024-12-01T15:04:05Z`). Los stubs generan ISO strings en tiempo real al responder.

## Seeds sugeridas para QA manual
Hasta contar con queries reales, estas semillas permiten cubrir los estados principales:

1. **Usuario "slot activo"**: misión main activa con pétalos intermedios y heartbeat pendiente.
2. **Usuario "claim disponible"**: slot hunt completado con `claim.available=true` y mercado marcando la propuesta como `locked` + `isActive`.
3. **Usuario "cooldown skill"**: slot skill en cooldown con `cooldown_until` futuro y market libre.
4. **Tablero vacío**: todos los slots en `idle`, market lleno (sirve para probar activaciones masivas).

Cada seed debe poblar misiones activas, progreso, registros de heartbeat y propuestas de market alineadas con las tablas descritas en `missions-v2-db-schema-proposal.md`.
