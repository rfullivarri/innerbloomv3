# Intro Journey · React + Clerk

## Flujo general

1. **Step 0 – Clerk Gate**
   - Si no hay sesión activa, se muestran tabs para `Crear cuenta` (`<SignUp />`) o `Ya tengo cuenta` (`<SignIn />`).
   - Tras autenticar, sincronizamos `answers.email` y `answers.user_id` con Clerk y exponemos `getToken()` en el store.
   - Si el usuario llega con sesión válida, se salta automáticamente a la selección de modo.
2. **Step 1 – Game Mode**
   - Selección de `LOW | CHILL | FLOW | EVOLVE`.
   - Desbloquea la ruta específica (ver abajo) y habilita el HUD.
3. **Pasos por modo**
   - Cada pantalla vive dentro de `IntroJourney` y utiliza componentes reutilizables (`ChecklistStep`, `OpenTextStep`, `ChoiceStep`).
   - Micro-animaciones de 120–160ms con `framer-motion`.
   - Botón continuar deshabilitado hasta completar el criterio mínimo.
4. **HUD**
   - Barra global sticky y barras de XP por pilar (`Body`, `Mind`, `Soul`).
   - Snack animado muestra `+13/+21 XP` al desbloquear por primera vez.
5. **Summary**
   - Resumen contextual según el modo elegido + foundations.
   - Botón `Generar plan` construye el payload y hoy sólo hace `console.log`.

### Rutas por modo

- **LOW**: `low-body → low-soul → low-mind → low-note → summary`
- **CHILL**: `chill-open → chill-motiv → foundations-body → foundations-soul → foundations-mind → summary`
- **FLOW**: `flow-goal → flow-imped → foundations-body → foundations-soul → foundations-mind → summary`
- **EVOLVE**: `evolve-goal → evolve-trade → evolve-att → foundations-body → foundations-soul → foundations-mind → summary`

### XP & validaciones

- `+13 XP` para checklists confirmadas la primera vez (`Body/Mind/Soul` o `ALL` según el paso).
- `+21 XP` al confirmar campos de texto (notas, objetivos, actitud) sólo la primera vez y si hay contenido.
- Checklists con límite de 5 ítems para LOW y Foundations.
- El botón de confirmación permanece deshabilitado hasta que haya mínimo un ítem seleccionado o texto válido.

## Estado local (`apps/web/src/onboarding/state.ts`)

```ts
interface Answers {
  user_id: string;      // Clerk userId
  email: string;        // Clerk email (lowercase en payload)
  mode: GameMode | null;
  low:    { body: string[]; soul: string[]; mind: string[]; note: string; };
  chill:  { oneThing: string; motiv: string[]; };
  flow:   { goal: string; imped: string[]; };
  evolve: { goal: string; trade: string[]; att: string; };
  foundations: {
    body: string[]; soul: string[]; mind: string[];
    bodyOpen: string; soulOpen: string; mindOpen: string;
  };
}
```

- El `OnboardingProvider` expone acciones puras: `setMode`, `toggleChecklist`, `setTextValue`, `setEvolveAtt`, `awardChecklist`, `awardOpen`, navegación (`goNext`, `goPrevious`, `goToStep`) y `syncClerkSession`.
- `awardChecklist` y `awardOpen` bloquean XP duplicado usando mapas internos (`awardedChecklists`, `awardedOpen`).
- `applyChecklistSelection` aplica el límite de 5 y se testea en `state.test.ts`.

## Payload

`buildPayload(answers, xp)` devuelve:

```json
{
  "ts": "2024-01-01T12:00:00.000Z",
  "client_id": "uuid-like",
  "email": "usuario@example.com",
  "mode": "FLOW",
  "data": {
    "low": { "body": [], "soul": [], "mind": [], "note": "" },
    "chill": { "oneThing": "", "motiv": [] },
    "flow": { "goal": "", "imped": [] },
    "evolve": { "goal": "", "trade": [], "att": "" },
    "foundations": {
      "body": [],
      "soul": [],
      "mind": [],
      "bodyOpen": "",
      "soulOpen": "",
      "mindOpen": ""
    }
  },
  "xp": { "total": 0, "Body": 0, "Mind": 0, "Soul": 0 },
  "meta": {
    "tz": "America/Argentina/Buenos_Aires",
    "lang": "es-ar",
    "device": "desktop",
    "version": "forms-intro-react",
    "user_id": "user_123"
  }
}
```

Notas:
- `client_id` se guarda en `localStorage` (`gj_client_id`).
- `meta.device` detecta mobile/desktop vía `userAgent`.
- `meta.version` fijo en `forms-intro-react`.
- `answers.email` se normaliza en minúsculas.
- `getToken()` queda expuesto en el store para futuras integraciones.

## Tests

`vitest` cubre:
- Sumas de XP (`distributeXp`).
- Límite de 5 en checklists (`applyChecklistSelection`).
- Rutas dinámicas por modo (`computeRouteForMode`).
