# DB Snapshot & Debug Toolkit

El script de snapshot consulta la instancia de Postgres configurada mediante `DATABASE_URL` y genera un archivo `db-snapshot.json` con la estructura y muestras de datos de la base.

## Cómo generarlo

Ejecutá cualquiera de los siguientes comandos desde la raíz del monorepo:

- `pnpm --filter api tsx scripts/db-snapshot.ts`
- `pnpm --filter api run db:snapshot`

El resultado se guarda en `apps/api/db-snapshot.json`.

> En el repo se versiona un snapshot sanitizado con datos **sintéticos** que replica la estructura completa de la base
> productiva. También existe `apps/api/db-snapshot.sample.json`, que contiene el mismo esquema y se usa como
> **fallback** automático cuando el archivo principal no está disponible. Para refrescar el snapshot compartido,
> regeneralo localmente contra la base real y commiteá el resultado (`pnpm --filter api run db:snapshot`).

## Endpoint de snapshot

Para habilitar temporalmente la ruta de snapshot en el backend desplegado, configurá la variable de entorno `ENABLE_DB_SNAPSHOT=true` en el servicio Web service (backend). La URL pública queda disponible en `https://<API>/_admin/db-snapshot`.

Con la variable habilitada, podés descargar el archivo actualizado y guardarlo en `apps/api/db-snapshot.json` ejecutando:

```bash
curl -fsS https://<API>/_admin/db-snapshot -H 'Accept: application/json' -o apps/api/db-snapshot.json
```

Cada request al endpoint vuelve a consultar la base de datos en vivo, reconstruye la metadata (tablas, columnas, vistas, índices y claves foráneas), toma hasta 50 filas de muestra por tabla y devuelve un `generated_at` nuevo. Además, el handler envía `Cache-Control: no-store`, así que no reutiliza snapshots anteriores ni se cachea en intermediarios.【F:apps/api/src/routes/debug-db-snapshot.ts†L71-L110】

> **Última ejecución:** `apps/api/db-snapshot.json` fue regenerado el `2025-10-16T09:28:25.075Z` (campo `generated_at`).【F:apps/api/db-snapshot.json†L2592-L2592】

## Contenido del snapshot

El JSON incluye:

- `schema.tables`: información de `information_schema.tables` para tablas base del esquema `public`.
- `schema.columns`: definición completa de columnas desde `information_schema.columns`.
- `schema.foreign_keys`: claves foráneas con tablas y columnas relacionadas.
- `schema.indexes`: índices del esquema público a partir de `pg_indexes`.
- `schema.views`: nombre, esquema y SQL de cada vista (via `pg_get_viewdef`).
- `sample.<tabla>`: hasta 50 filas de muestra por cada tabla base.

## Nota de seguridad

El snapshot no incluye credenciales ni secretos, pero contiene estructura y datos sensibles de la base. **No lo ejecutes ni expongas en producción. No dejes `ENABLE_DB_SNAPSHOT` activado en entornos productivos reales.**

## Validar endpoints con el snapshot

Usá el archivo generado para replicar consultas locales y validar handlers sin tocar la base real. Algunos tips:

- Los servicios del API apuntan a tablas y vistas existentes en el snapshot; verificá rápidamente la estructura con
  `curl -fsS http://localhost:5173/_admin/db-snapshot | jq .schema.tables` cuando el backend expone la ruta `_admin`.
- Reutilizá el JSON desde los tests o scripts para confirmar que la SQL en los controladores coincide con la estructura real
  (`cat_game_mode`, `cat_trait`, `v_user_daily_energy`, etc.).
- Antes de tocar un endpoint como `/users/:id/state` o `/users/:id/xp/by-trait`, contrastá los campos usados en las consultas con
  los disponibles en el snapshot para evitar referencias a columnas inexistentes.
