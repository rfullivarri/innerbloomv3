# Dashboard Alert State Machine (Fuente de verdad)

Este documento define **una única máquina de estados derivada** para controlar:

- el popup de “Journey listo”, y
- los avisos/banners del dashboard.

Objetivo: evitar estados simultáneos contradictorios y garantizar que ambos puntos de UI lean exactamente el mismo estado.

## Principios

1. **Single source of truth**: el frontend deriva un único `dashboard_alert_state` desde los mismos datos base.
2. **Prioridad estricta**: si varias condiciones son verdaderas a la vez, solo se renderiza el estado de mayor prioridad.
3. **Consistencia cross-surface**: popup “Journey listo” y avisos del dashboard consumen el mismo estado derivado.

## Estados canónicos

Los estados permitidos son:

1. `journey_generating`
2. `journey_ready_unseen`
3. `needs_base_edit`
4. `needs_first_daily_quest`
5. `needs_scheduler_setup`
6. `all_set`

## Señales de entrada (flags derivados)

Para derivar el estado se usan estos flags lógicos:

- `taskgen_status`: `pending | running | completed | failed` (u otros internos)
- `has_tasks`: hay tareas/journey generado y disponible
- `welcome_modal_seen`: usuario ya vio/cerró el modal de bienvenida de Journey listo
- `base_edited`: usuario editó/guardó su base por primera vez
- `first_daily_quest_done`: usuario completó su primer daily quest
- `scheduler_configured`: usuario guardó la programación del scheduler

> Nota: este documento asume que `has_tasks` representa disponibilidad real para mostrar Journey.

## Mapeo de señales (DB + LocalStorage)

Para alinear backend y frontend, estas son las señales fuente y su equivalencia funcional:

| Señal lógica usada por el derivador | Backend (fuente persistente) | Frontend instantáneo (LocalStorage) | Regla de reconciliación |
|---|---|---|---|
| `base_edited` | `first_tasks_confirmed` | `ib.baseEdited:<userId>` | UI usa LocalStorage primero. Luego confirma con backend; si difiere, backend gana. |
| `first_daily_quest_done` | `quantity_daily_logs > 0` | `ib.firstDailyQuestDone:<userId>` | UI optimista local; backend corrige en hydrate/re-fetch. |
| `scheduler_configured` | `first_programmed` | `ib.firstProgrammed:<userId>` | Misma política: instantáneo local + reconciliación con backend. |
| `taskgen_status` | Estado TaskGen (`pending\|running\|completed\|failed`) desde endpoint de generación | N/A | Siempre backend (no persistir local como fuente de verdad). |
| `welcome_modal_seen` | `journey_ready_modal_seen_at` (vía endpoint de marcado) | `ib.journeyReadySeen:<userId>:<generationKey>` | Local habilita cierre inmediato; backend confirma visto. Backend prevalece en conflicto. |

### Regla de sincronización obligatoria

1. **Reacción inmediata en UI**: cualquier acción de usuario impacta primero el flag local para feedback instantáneo.
2. **Confirmación asíncrona**: se llama al backend correspondiente.
3. **Resolución de conflicto**: al llegar respuesta o en refetch, **backend sobrescribe** estado local si hay discrepancia.
4. **Login/refresh**:
   - Hidratar todos los flags derivados desde backend.
   - Limpiar flags obsoletos de `ib.journeyReadySeen:<userId>:<generationKey>` cuando cambie `generationKey`.

## Tabla de verdad (normalizada)

La siguiente tabla resume la derivación con variables ya normalizadas (`T/F`), donde:

- `TG` = taskgen en curso (`taskgen_status in {pending,running}`)
- `HT` = `has_tasks`
- `WM` = `welcome_modal_seen`
- `BE` = `base_edited`
- `DQ` = `first_daily_quest_done`
- `SC` = `scheduler_configured`

| Prioridad | TG | HT | WM | BE | DQ | SC | `dashboard_alert_state` |
|---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | T | F | * | * | * | * | `journey_generating` |
| 2 | * | T | F | * | * | * | `journey_ready_unseen` |
| 3 | * | T | T | F | * | * | `needs_base_edit` |
| 4 | * | * | * | T | F | * | `needs_first_daily_quest` |
| 5 | * | * | * | * | T | F | `needs_scheduler_setup` |
| 6 | * | * | * | * | * | T | `all_set` |

`*` = no relevante para esa fila porque una regla de mayor prioridad ya fija el estado.

## Prioridad de render (de mayor a menor)

La evaluación debe hacerse en este orden y retornar el **primer match**:

1. `journey_generating`
2. `journey_ready_unseen`
3. `needs_base_edit`
4. `needs_first_daily_quest`
5. `needs_scheduler_setup`
6. `all_set`

### Reglas por estado

#### 1) `journey_generating`

**Condición:**

- `taskgen_status in {pending, running}`
- `has_tasks = false`

**Render esperado:**

- Mostrar aviso de generación en curso.
- No mostrar popup de “Journey listo”.

---

#### 2) `journey_ready_unseen`

**Condición:**

- `has_tasks = true`
- `welcome_modal_seen = false`

**Render esperado:**

- Mostrar popup “Journey listo”.
- Dashboard usa este mismo estado (si hay banner asociado, no debe contradecir el popup).

---

#### 3) `needs_base_edit`

**Condición:**

- `has_tasks = true`
- `welcome_modal_seen = true`
- `base_edited = false`

**Render esperado:**

- Mostrar aviso para editar base.

---

#### 4) `needs_first_daily_quest`

**Condición:**

- `base_edited = true`
- `first_daily_quest_done = false`

**Render esperado:**

- Mostrar aviso para completar primer daily quest.

---

#### 5) `needs_scheduler_setup`

**Condición:**

- `first_daily_quest_done = true`
- `scheduler_configured = false`

**Render esperado:**

- Mostrar aviso para configurar scheduler.

---

#### 6) `all_set`

**Condición:**

- `scheduler_configured = true`

**Render esperado:**

- No mostrar avisos de onboarding pendientes (o mostrar estado de “todo listo”).

## Función de derivación (referencia)

```ts
type DashboardAlertState =
  | 'journey_generating'
  | 'journey_ready_unseen'
  | 'needs_base_edit'
  | 'needs_first_daily_quest'
  | 'needs_scheduler_setup'
  | 'all_set';

function deriveDashboardAlertState(input: {
  taskgen_status: 'pending' | 'running' | 'completed' | 'failed' | string;
  has_tasks: boolean;
  welcome_modal_seen: boolean;
  base_edited: boolean;
  first_daily_quest_done: boolean;
  scheduler_configured: boolean;
}): DashboardAlertState {
  if ((input.taskgen_status === 'pending' || input.taskgen_status === 'running') && !input.has_tasks) {
    return 'journey_generating';
  }

  if (input.has_tasks && !input.welcome_modal_seen) {
    return 'journey_ready_unseen';
  }

  if (input.has_tasks && input.welcome_modal_seen && !input.base_edited) {
    return 'needs_base_edit';
  }

  if (input.base_edited && !input.first_daily_quest_done) {
    return 'needs_first_daily_quest';
  }

  if (input.first_daily_quest_done && !input.scheduler_configured) {
    return 'needs_scheduler_setup';
  }

  return 'all_set';
}
```

## Transiciones exactas por evento

A continuación se documentan las transiciones esperadas ante eventos de producto.

### Evento A: click “Iniciar mi Journey”

**Efecto esperado en flags:**

- `taskgen_status` pasa a `pending` (o `running` según backend)
- `has_tasks = false` durante generación

**Transición de estado:**

- `* -> journey_generating` (si todavía no hay tareas)

---

### Evento B: TaskGen completed

**Efecto esperado en flags:**

- `taskgen_status = completed`
- `has_tasks = true`
- `welcome_modal_seen = false` (hasta que usuario lo vea/cierre)

**Transición de estado:**

- `journey_generating -> journey_ready_unseen`

---

### Evento C: usuario ve/cierra popup “Journey listo”

**Efecto esperado en flags:**

- `welcome_modal_seen = true`

**Transición de estado:**

- `journey_ready_unseen -> needs_base_edit` (si `base_edited = false`)
- Si `base_edited = true`, el derivador puede avanzar al siguiente estado aplicable por prioridad.

---

### Evento D: edición base (guardado exitoso por primera vez)

**Efecto esperado en flags:**

- `base_edited = true`

**Transición de estado:**

- `needs_base_edit -> needs_first_daily_quest` (si aún no hay primer daily quest)

---

### Evento E: primer daily quest completado

**Efecto esperado en flags:**

- `first_daily_quest_done = true`

**Transición de estado:**

- `needs_first_daily_quest -> needs_scheduler_setup` (si scheduler aún no está configurado)

---

### Evento F: guardado scheduler

**Efecto esperado en flags:**

- `scheduler_configured = true`

**Transición de estado:**

- `needs_scheduler_setup -> all_set`

## Contrato de implementación recomendado

- Centralizar `deriveDashboardAlertState` en un módulo compartido (sin duplicar lógica por componente).
- Hacer que:
  - popup “Journey listo”, y
  - dashboard alerts
  consuman el mismo valor de estado.
- Instrumentar analytics por transición de estado para detectar loops o regresiones.

## Casos límite

- Si `taskgen_status = running` pero `has_tasks = true`, prevalece `journey_ready_unseen` (por orden de prioridad, ya no está “sin tareas”).
- Si un usuario ya tiene `scheduler_configured = true`, el estado final es `all_set` aunque flags intermedios estén desactualizados; se recomienda corregir consistencia de datos en background.
- Si TaskGen falla (`failed`) y `has_tasks = false`, este documento no define un estado de error; manejar fuera de esta máquina o extender con `journey_generation_failed`.
