# AI Taskgen Debug Bypass <!-- #REMOVE_ME_DEBUG_BYPASS -->

> ⚠️ **Temporal**: todo este flujo está marcado con `// #REMOVE_ME_DEBUG_BYPASS`. Elimina este documento y los archivos relacionados cuando ya no sea necesario.

## Resumen

Este bypass expone una página y endpoints internos para iterar prompts de generación de tareas directamente desde el browser sin ejecutar el CLI.

- **UI**: `/_debug/ai-taskgen` (formulario sencillo con inputs para `user_id`, modo, seed, dry-run, override y toggle de persistencia).
- **API**: `POST /_debug/ai-taskgen/run` aplica el pipeline real (contexto desde la base, renderizado de prompt, validación AJV y llamada a OpenAI salvo dry-run).
- **Persistencia**: sólo activa si `store=true`. Caso contrario, jamás escribe en la base.

## Seguridad y toggles

1. Requiere `ENABLE_TASKGEN_TRIGGER=true` para registrar rutas.
2. En producción también necesita `DEBUG_ALLOW_IN_PROD=true`.
3. El endpoint `/run` exige header `x-admin-token` igual a `ADMIN_TRIGGER_TOKEN`.
4. Usa `OPENAI_MODEL` (opcional, default `gpt-4.1-mini`) y `OPENAI_API_KEY`.

Si cualquiera de las condiciones falla, la ruta responde 404/401.

## Uso rápido

### Variables de entorno mínimas

```bash
ENABLE_TASKGEN_TRIGGER=true
ADMIN_TRIGGER_TOKEN="coloca-un-token-seguro"
OPENAI_API_KEY="sk-..."
# Opcional
OPENAI_MODEL="gpt-4.1-mini"
DEBUG_ALLOW_IN_PROD=false
```

> 💡 Para seleccionar modelos más recientes (por ejemplo, GPT-5), exporta `OPENAI_MODEL="gpt-5.0"` antes de levantar el API o ejecutar el CLI. Cualquier valor presente en la variable tomará prioridad sobre el default `gpt-4.1-mini`.

### Flujo desde el navegador (desarrollo)

1. Levanta `apps/api` (`pnpm --filter api dev`) y `apps/web` (`pnpm --filter web dev`).
2. Abre `http://localhost:3000/_debug/ai-taskgen` (API sirve HTML mínimo). También puedes usar la página React en `apps/web`.
3. Completa el UUID del usuario y deja **Dry run** activado para obtener placeholders y `prompt_used` sin costos.
4. Cuando quieras invocar OpenAI, desactiva dry run, coloca el admin token (en dev se toma de `VITE_ADMIN_TRIGGER_TOKEN`) y envía.
5. Marca **Persistir en DB** sólo si quieres escribir en `tasks` (respeta mapeos reales de catálogos).

### cURL

```bash
curl -X POST "http://localhost:3000/_debug/ai-taskgen/run" \
  -H "content-type: application/json" \
  -H "x-admin-token: $ADMIN_TRIGGER_TOKEN" \
  -d '{
    "user_id": "c299a7d2-a05c-4106-8b41-6cd1dc49e297",
    "mode": "evolve",
    "dry_run": true,
    "seed": 42
  }'
```

## Cómo eliminarlo

1. Buscar `#REMOVE_ME_DEBUG_BYPASS` y borrar los archivos/módulos marcados.
2. Quitar rutas y variables (`ENABLE_TASKGEN_TRIGGER`, `ADMIN_TRIGGER_TOKEN`, etc.).
3. Eliminar este documento.
