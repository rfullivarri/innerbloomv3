# Gamification Platform (Next.js + Railway + Neon + Clerk)

Esta carpeta contiene una re-implementación moderna del landing de gamificación utilizando un stack basado en **Next.js**. El objetivo es preparar el proyecto para ejecutarse en Railway, utilizar Neon como proveedor de PostgreSQL y Clerk como solución de autenticación. Además, toda la maquetación se estandariza con Tailwind CSS.

## Estructura

- `app/`: Rutas del App Router de Next.js, incluyendo la página pública y rutas protegidas.
- `components/`: Componentes reutilizables del frontend.
- `lib/`: Utilidades compartidas (conexión a base de datos, clientes de Clerk, helpers de estilos).
- `public/`: Recursos estáticos compartidos.
- `styles/`: Hojas de estilo globales.
- `env.example`: Variables de entorno requeridas para desplegar la aplicación.

## Instalación

Este repositorio utiliza workspaces de npm, por lo que todos los paquetes comparten el `package-lock.json` de la raíz. Antes de ejecutar cualquier comando (`npm ci`, `npm run dev`, etc.) asegúrate de instalar las dependencias desde la carpeta raíz del monorepo:

```bash
npm install
```

Si ves el error `The "npm ci" command can only install with an existing package-lock.json`, significa que la instalación se ejecutó en un directorio sin `package-lock.json`. Vuelve a la raíz del proyecto (`/workspace/innerbloomv3`) o genera el archivo con `npm install` y vuelve a intentarlo.

## Variables de entorno

Copia `env.example` a `.env.local` (para desarrollo local) o configúralas como variables en Railway:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_SIGN_IN_URL=/sign-in
CLERK_SIGN_UP_URL=/sign-up
DATABASE_URL=postgresql://<usuario>:<password>@<host>/<database>?sslmode=require
NEXT_PUBLIC_APP_URL=https://<tu-subdominio>.up.railway.app
```

Para Neon, obtén la cadena de conexión en la consola y pégala en `DATABASE_URL`.

## Scripts disponibles

- `npm run dev`: Ejecuta Next.js en modo desarrollo.
- `npm run build`: Construye la aplicación para producción.
- `npm run start`: Sirve la build de producción (ideal para Railway).
- `npm run lint`: Ejecuta los chequeos de ESLint.

> [!NOTE]
> Todos los comandos anteriores delegan en `scripts/run-next.mjs`, que fuerza la variable de entorno `NEXT_IGNORE_INCORRECT_LOCKFILE` para evitar que Next.js intente "parchear" el `package-lock.json` cuando se trabaja sin conexión o detrás de proxys restringidos. Esto elimina las advertencias como `Found lockfile missing swc dependencies` y permite desarrollar sin fricciones en entornos offline o con políticas de red estrictas.

## Despliegue en Railway

1. Crea un nuevo proyecto en Railway y sube este repositorio.
2. Añade un servicio de base de datos PostgreSQL en Neon y configura la variable `DATABASE_URL` en Railway.
3. Configura las variables de Clerk (publishable y secret key).
4. Ejecuta `npm install` y `npm run build` como parte del deploy.

## Deploy → Railway + Neon

- **Validación local:** usa `npm run db:validate` para ejecutar todos los archivos SQL dentro de transacciones desechables y detectar errores de sintaxis antes de subir cambios.
- **Aplicación completa:** ejecuta `npm run db:all` para aplicar los archivos de `apps/api/sql` en orden lexicográfico; también puedes pasar un archivo específico con `npm run db:file -- apps/api/sql/050_progress_views.sql`.
- **Railway Build Command:** `npm install && npm run build`.
- **Railway Pre-deploy Command:** `npm run db:all` (refresca la base Neon antes de cada release).
- **Railway Start Command:** `node dist/index.js`.

> [!TIP]
> Asegúrate de que `DATABASE_URL` incluya `sslmode=require`. El runner lo añadirá automáticamente si falta para mantener la compatibilidad con Neon.

## Clerk

La aplicación está integrada con Clerk mediante el middleware y los componentes que provee `@clerk/nextjs`. Las rutas bajo `/dashboard` están protegidas y requieren sesión válida.

## Recordatorios diarios por email

El worker de recordatorios vive en `apps/api`. Para habilitar los envíos necesitas:

1. Definir `EMAIL_PROVIDER_NAME`. Usa `console` en desarrollo para imprimir los payloads y `resend` en producción para entregar correos reales.
2. Cuando `EMAIL_PROVIDER_NAME=resend`, también debes definir `EMAIL_PROVIDER_API_KEY` (API key de Resend) y `EMAIL_FROM` (por ejemplo `Innerbloom <daily-quest@example.com>`).
3. Configurar `DAILY_REMINDER_CTA_URL` si querés personalizar el enlace del botón (default `https://innerbloom.app/daily-quest`).
4. Establecer `CRON_SECRET` tanto en el servicio API como en el scheduler que dispare el job.

### Cron en producción

- Configura un HTTP cron (Railway, GitHub Actions, etc.) que ejecute `POST https://<tu-api>/internal/cron/daily-reminders` con la cabecera `X-CRON-SECRET: <CRON_SECRET>` cada 5 minutos (`*/5 * * * *`).
- El endpoint devuelve `attempted`, `sent`, `skipped` y `errors` para auditar cada corrida. Ante fallos, sólo los recordatorios entregados actualizan `last_sent_at`, por lo que los pendientes se reintentará automáticamente en la siguiente ejecución.
- Puedes reprocesar manualmente una ventana puntual con `curl -X POST -H "X-CRON-SECRET: $CRON_SECRET" https://<tu-api>/internal/cron/daily-reminders`.

Consulta `docs/daily-reminders.md` para una descripción completa de la arquitectura y el flujo de datos del job.

## Estado actual

Esta migración crea la base del proyecto moderno sin eliminar los archivos originales. Puedes continuar desarrollando nuevas funcionalidades dentro de la carpeta `npm`.

## Integración continua

El repositorio cuenta con un workflow de GitHub Actions que se ejecuta en cada _push_ a `main` y en los _pull requests`. El pipeline utiliza Node.js 20 y realiza las siguientes tareas de calidad:

- Instala las dependencias del monorepo con `npm ci`.
- Ejecuta los linters con `npm run lint`.
- Corre la suite de pruebas con `npm run test`, generando reportes de cobertura y fallando si la cobertura global de líneas, funciones, ramas o sentencias baja de 80 %.

### Variables de entorno en CI

Las pruebas unitarias de `apps/api` se ejecutan sin configuración adicional. Las pruebas de integración de dashboard se omiten automáticamente si no están definidas las variables sensibles; configura estas variables como _secrets_ en GitHub si deseas habilitarlas en el pipeline:

| Variable        | Descripción                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`  | Cadena de conexión a PostgreSQL utilizada por los tests de integración.     |
| `TEST_USER_ID`  | Identificador de usuario con datos cargados para validar los endpoints API. |

### Reportes de cobertura

Vitest genera un resumen de cobertura directamente en los logs del job (`Run tests with coverage`). Además, el workflow publica la carpeta `apps/api/coverage` como artefacto llamado **api-coverage** para que puedas descargar el reporte completo (incluyendo `lcov-report/index.html`) desde la pestaña **Artifacts** del run en GitHub Actions.
