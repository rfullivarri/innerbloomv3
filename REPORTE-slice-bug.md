# Informe TypeError `.slice`

## Stack trace mapeado
- **`index-*.js:70:29803` → `apps/web/src/components/dashboard/EmotionHeatmap.tsx:68`**
  ```tsx
  const moodDisplay = moodLabelRaw ? moodLabelRaw.slice(0, 6) : '—';
  ```
  La llamada original era `entry.mood?.slice(0, 6)` en el mismo archivo antes del fix. Con los source maps habilitados en Vite (`build.sourcemap = true`) el stack ahora apunta directamente a esta línea del componente.

## Logs instrumentados
- Ejemplo de payload crudo para `/task-logs` (emisión previa al mapeo en `RecentActivity`):
  ```text
  [SHAPE] task-logs { isArray: true, length: 6, sample: [ … ] }
  [TASK-LOGS] raw types [
    { typeof_date: 'number', sample_date: 1728326400000, keys: ['id','taskTitle','completedAt',…] },
    …
  ]
  ```
- Otros endpoints ahora publican su shape automáticamente, por ejemplo:
  ```text
  [SHAPE] emotions { isArray: false, keys: ['from','to','emotions'] }
  [SHAPE] user-daily-xp { isArray: false, keys: ['from','to','series'] }
  ```
  Estos logs se pueden habilitar/deshabilitar en runtime con `window.setDbg(false)`.

## Root cause
El endpoint `/users/:id/emotions` puede devolver `emotion_id` como número o identificador no normalizado. Al mapearlo 1:1 el componente `EmotionHeatmap` recibía valores como `3`, y la expresión `entry.mood?.slice(0, 6)` intentaba invocar `.slice` sobre un `number`. El operador `?.` sólo evita la llamada cuando el valor es `null`/`undefined`, por lo que terminaba lanzando `TypeError: l.slice is not a function` y el dashboard se quedaba en blanco.

## Cambios por componente/archivo
- **`vite.config.ts`**: sourcemaps forzados para poder mapear stacks en dev/staging.
- **`components/DevErrorBoundary.tsx`** + **`pages/Dashboard*.tsx`** + **`main.tsx`**: ErrorBoundary global y flag `__DBG`/`setDbg` para evitar pantallas en blanco y controlar el logging.
- **`lib/api.ts`**: helper `logShape`, normalización defensiva (`extractArray`) y shape-logs por endpoint (`task-logs`, `emotions`, `tasks`, `user-daily-xp`, etc.). El mapeo de emociones ahora fuerza strings.
- **`lib/safe.ts`**: helper `safeMap` para evitar `.map` sobre no-arrays.
- **`components/dashboard/RecentActivity.tsx`**: dataset protegido (`rows` normalizado), log `[TASK-LOGS] raw types`, `safeMap` + `dateStr` en vez de accesos directos.
- **`components/dashboard/EmotionHeatmap.tsx`**: normalización de `mood` a string antes de truncar.

Con esto, cualquier dataset inesperado queda registrado, el UI se mantiene visible gracias al `DevErrorBoundary` y los `.slice(...)` sólo se ejecutan sobre strings válidos.
