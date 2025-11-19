# Plan de app móvil nativa de Innerbloom

## Diagnóstico del stack actual
### Backend (apps/api)
- **Runtime y servidor**: Node.js 20.x ejecuta un servidor Fastify que monta la app de Express como middleware. Fastify agrega utilidades como `@fastify/express`, `fastify-raw-body` y expone `/healthz`, mientras que Express resuelve CORS, rutas REST, Webhooks y manejo de errores centralizado.【F:package.json†L1-L32】【F:apps/api/src/index.ts†L1-L84】【F:apps/api/src/app.ts†L15-L165】
- **Framework / estructura**: el router principal vive en `apps/api/src/routes`. La app Express monta rutas de depuración, webhooks (Clerk), `express.json`, estáticos (`/exports`) y, finalmente, un router `/api` con controladores versionados (health, daily quest, missions, tasks, users, etc.). El servidor Fastify sólo delega en Express y maneja lifecycle hooks (`onClose`).【F:apps/api/src/app.ts†L46-L165】【F:apps/api/src/routes/index.ts†L1-L120】
- **Persistencia**: Postgres (via `pg`, `drizzle-orm`) con scripts auxiliares (`db.ts`, `scripts/db-snapshot.ts`). Hay servicios y repositorios desacoplados (por ej. `services/auth-service.ts`) y middleware de autenticación (`auth-middleware.ts`).【F:apps/api/package.json†L1-L42】【F:apps/api/src/middlewares/auth-middleware.ts†L11-L169】
- **Autenticación backend**: el middleware exige `Authorization: Bearer <Clerk JWT>`, valida con el `AuthService` y permite overrides locales (`X-Innerbloom-Demo-User`, `X-User-Id`) sólo en dev. Los usuarios se resuelven por `clerk_user_id` y se inyectan en `req.user`.【F:apps/api/src/middlewares/auth-middleware.ts†L11-L169】

### Frontend web (apps/web)
- **Tooling**: Vite + React 18 + TypeScript con Tailwind. Se ejecuta vía `npm run dev` y compila con `vite build`. Depedencias clave: `react-router-dom` 7, `@clerk/clerk-react`, `@innerbloom/missions-v2-contracts`, Testing Library y Playwright.【F:apps/web/package.json†L1-L40】
- **Bootstrap**: `main.tsx` monta `ClerkProvider` y `BrowserRouter`, habilita logging de API y requiere `VITE_CLERK_PUBLISHABLE_KEY`.【F:apps/web/src/main.tsx†L1-L47】
- **Routing**: `App.tsx` define rutas públicas (`/`, `/login`, `/sign-up`, onboarding) y protegidas (`/dashboard`, `/editor`, `/admin`). El componente `RequireUser` verifica sesión con Clerk, monta `ApiAuthBridge` (que comparte `getToken()` con el cliente HTTP) y redirige si falta sesión. `RedirectIfSignedIn` evita repetir el login. El dashboard real vive en `/dashboard-v3/*` y reutiliza alias (`/dashboard`, `/dashboard-v3`).【F:apps/web/src/App.tsx†L1-L201】
- **Dashboard interno**: `DashboardV3Page` organiza secciones (overview, missions, rewards) y documenta explícitamente qué endpoints usa: `GET /users/:id/xp/total`, `/level`, `/state`, `/xp/daily`, `/xp/by-trait`, `/emotions`, `/tasks`, `/journey`. Usa `useBackendUser` para obtener `/users/me` y deriva `backendUserId` para las demás llamadas.【F:apps/web/src/pages/DashboardV3.tsx†L1-L74】

### Cliente HTTP actual
- `apps/web/src/lib/api.ts` implementa un cliente `fetch` con logging, manejo de errores (`ApiError`) y soporte para el “dev user switch”. Normaliza la base (`VITE_API_BASE_URL`), compone rutas (`/api/...`), y aplica `Authorization` con el token de Clerk obtenido por `ApiAuthBridge`. Expone helpers como `apiAuthorizedGet`, `apiAuthorizedFetch`, `getCurrentUserProfile`, `getDailyQuestStatus`, `getMissionsV2Board`, `getUserTasks`, `getDailyReminderSettings`, etc.【F:apps/web/src/lib/api.ts†L1-L220】【F:apps/web/src/lib/api.ts†L1701-L1944】
- El hook `useBackendUser` monitoriza `isApiAuthTokenProviderReady()`, espera a que `ApiAuthBridge` registre el proveedor de tokens y llama `getCurrentUserProfile()` para poblar `backendUserId`, `profile`, estado y errores.【F:apps/web/src/hooks/useBackendUser.ts†L1-L62】

### Autenticación / sesión end-to-end
- **Web**: `ClerkProvider` controla sesión. `LoginPage` renderiza `<SignIn routing="path" path="/login" signUpUrl="/sign-up" ...>` y, tras autenticarse, `RedirectIfSignedIn` dirige al dashboard. Todo el estado se almacena en Clerk y se propaga al cliente HTTP via `ApiAuthBridge`.【F:apps/web/src/pages/Login.tsx†L1-L32】【F:apps/web/src/App.tsx†L17-L114】
- **API**: cada request pasa por `auth-middleware`, que valida el JWT emitido por Clerk y resuelve el usuario interno antes de ejecutar los controladores. Los webhooks de Clerk (`/api/webhooks/clerk`) sincronizan los perfiles en la base de datos.【F:apps/api/src/app.ts†L66-L165】【F:apps/api/src/middlewares/auth-middleware.ts†L11-L169】

### Navegación
- El router principal (`App.tsx`) usa `Routes` para agrupar flujos: landing, onboarding, auth, dashboard, admin y páginas de depuración. Dentro de `DashboardV3Page`, `getDashboardSections` determina qué secciones se muestran (Daily Cultivation, Missions V2, Rewards, Scheduler) y `Navbar`/`MobileBottomNav` permiten navegar entre ellas. Los modales (`DailyQuestModal`, `ReminderSchedulerDialog`) se controlan localmente pero consumen datos centralizados (p.ej. `getDailyQuestDefinition`, `getDailyReminderSettings`).【F:apps/web/src/App.tsx†L115-L201】【F:apps/web/src/pages/DashboardV3.tsx†L14-L74】

### Llamadas a la API relevantes para la “app”
- **Perfil / sesión**: `GET /users/me` → `CurrentUserProfile`. Base para obtener `backendUserId` y atributos como `game_mode` o `timezone`.【F:apps/web/src/lib/api.ts†L1664-L1689】
- **Dashboard metrics**: `GET /users/:id/xp/total`, `/level`, `/state`, `/xp/daily`, `/xp/by-trait`, `/emotions`, `/tasks`, `/journey` (comentados dentro de `DashboardV3Page`).【F:apps/web/src/pages/DashboardV3.tsx†L1-L11】
- **Daily Quest**: `GET /daily-quest/status`, `GET /daily-quest/definition`, `POST /daily-quest/submit`. Entregan emoción del día, tareas disponibles y persistencia de envíos.【F:apps/web/src/lib/api.ts†L1784-L1883】
- **Missions v2**: `GET /missions/board`, `POST /missions/heartbeat`, `POST /missions/link-daily`, `POST /missions/:id/claim`. Las respuestas usan los contratos de `packages/missions-v2-contracts`.【F:apps/web/src/lib/api.ts†L1886-L1944】
- **Scheduler / recordatorios**: `GET /me/daily-reminder` y `PUT /me/daily-reminder` manejan canal, horario y zona horaria. Se exponen desde la web a través del diálogo `ReminderSchedulerDialog`.【F:apps/web/src/lib/api.ts†L1730-L1782】
- **Tareas / editor**: `GET /users/:id/tasks` (y POST/PATCH/DELETE) alimenta el panel de rachas, misiones y el editor de tareas. Estos endpoints también se reaprovecharán para la vista móvil del scheduler y la lista de tareas.【F:apps/web/src/lib/api.ts†L878-L1189】

## Qué partes del frontend web constituyen la “app”
1. **Flujo de autenticación**: `LoginPage` + `Clerk` + `RequireUser` protegen el dashboard. La app móvil debe replicar exactamente este flujo (misma publishable key, mismo template opcional `VITE_CLERK_TOKEN_TEMPLATE`).【F:apps/web/src/App.tsx†L17-L114】【F:apps/web/src/pages/Login.tsx†L1-L32】
2. **Dashboard interno (Dashboard v3)**: la estructura modular (overview, energía, misiones, rewards, scheduler) y los endpoints citados en el comentario inicial definen el corazón de la experiencia. La app nativa debe ofrecer los mismos datos y secciones.【F:apps/web/src/pages/DashboardV3.tsx†L1-L74】
3. **Daily Quest**: modales y lógica (`DailyQuestModal`, endpoints `/daily-quest/*`) forman parte del “journey” diario y deben existir en mobile como pantallas dedicadas.【F:apps/web/src/lib/api.ts†L1784-L1883】
4. **Missions / Missions v2**: tablero, acciones (heartbeat, claim, link daily) y market se alimentan del endpoint `/missions/board` y sus mutaciones. Se consideran núcleo de la app.【F:apps/web/src/lib/api.ts†L1886-L1944】
5. **Menús de edición de tareas y scheduler**: dependen de `/users/:id/tasks` y `/me/daily-reminder`, así que la app nativa debe consumirlos para permitir revisar tareas activas y gestionar recordatorios. Las vistas de editor pueden migrarse gradualmente, pero el scheduler mínimo debe existir desde la primera iteración.【F:apps/web/src/lib/api.ts†L878-L1189】【F:apps/web/src/lib/api.ts†L1730-L1782】

## Endpoints a reutilizar en la app móvil
| Dominio | Endpoint | Uso actual | Reutilización móvil |
| --- | --- | --- | --- |
| Sesión | `GET /users/me` | Resolve backend user y perfil, gating de secciones | Obtener `backendUserId`, `timezone` y `game_mode` antes de cargar cualquier pantalla. |
| Dashboard | `GET /users/:id/xp/total`, `/level`, `/state`, `/xp/daily`, `/xp/by-trait`, `/emotions`, `/journey` | Tarjetas de progreso, radar, alerts | Mostrar resumen en el dashboard móvil y permitir gráficas básicas en versiones futuras. |
| Daily Quest | `GET /daily-quest/status`, `GET /daily-quest/definition`, `POST /daily-quest/submit` | Modal “Daily Quest” | Pantalla Daily Quest con las mismas opciones y envíos. |
| Missions v2 | `GET /missions/board`, `POST /missions/:id/claim`, `POST /missions/heartbeat`, `POST /missions/link-daily` | Sección de misiones | Pantalla “Missions” que refleje slots, progreso y acciones. |
| Tasks / Scheduler | `GET /users/:id/tasks`, `POST/PATCH/DELETE /users/:id/tasks`, `GET /me/daily-reminder`, `PUT /me/daily-reminder` | Panel de tareas y diálogo de recordatorios | Listado editable (iteración futura) y scheduler inicial que al menos muestre la configuración actual. |
| Recordatorios / Alerts | `GET /users/:id/journey`, `GET /me/daily-reminder` | Banners y scheduler | Alimentar secciones “Onboarding reminders” del dashboard móvil. |

## Arquitectura propuesta para la app nativa
1. **Tecnología**: React Native con Expo (SDK 52) + TypeScript. Motivos:
   - El frontend web ya usa React 18 y un cliente HTTP custom; React Native permite reutilizar patrones (hooks, componentes declarativos) sin introducir otro paradigma.【F:apps/web/package.json†L13-L39】
   - Expo provee tooling unificado (Metro, dev client, builds OTA) y librerías oficiales (`expo-secure-store`, `expo-constants`) necesarias para Clerk en mobile.
   - Clerk ofrece SDK oficial para Expo (`@clerk/clerk-expo`) con `SignIn` y `ClerkProvider`, alineado con la configuración web.
2. **Estructura**:
   - Nuevo workspace `apps/mobile` dentro del monorepo, con scripts `expo start`, `expo run:android/ios`, `tsc --noEmit`.
   - Entry `App.tsx` monta `ClerkProvider` (publishable key `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`), `tokenCache` en `expo-secure-store` y `NavigationContainer` (React Navigation stack).
   - `RootNavigator` maneja dos ramas: `Login` (con `<SignIn routing="virtual" />`) y `DashboardStack` (pantalla principal + secciones). El stack interno expone rutas `DashboardHome`, `DailyQuest`, `Missions`, `Tasks`, `Scheduler` replicando el orden mental del dashboard.
   - `BackendUserProvider` (hook) carga `/users/me`, comparte `backendUserId`, `profile` y estado a todas las pantallas. Los datos específicos de cada sección se cargan mediante hooks `useApiQuery` reutilizando el mismo proveedor de tokens.
   - Cliente HTTP nativo (`apps/mobile/src/api/client.ts`) que replica la lógica crítica del archivo web: normaliza la base `EXPO_PUBLIC_API_BASE_URL`, prefija `/api`, aplica `Authorization` y reusa los contratos `@innerbloom/missions-v2-contracts`.
3. **Autenticación móvil**:
   - `ClerkProvider` + `@clerk/clerk-expo` + `tokenCache` de `expo-secure-store`.
   - `useAuth()` entrega `getToken`; `createTokenProvider()` respeta `EXPO_PUBLIC_CLERK_TOKEN_TEMPLATE` (si existe) para pedir tokens compatibles con la API existente, igual que `ApiAuthBridge` en web.【F:apps/web/src/App.tsx†L17-L61】
   - Cada request se firma con el mismo JWT que consume el backend, sin cambios en Express/Fastify.

## Lista de pantallas iniciales
1. **Login**: idéntico flujo Clerk; permite iniciar sesión con cualquier usuario existente y navega automáticamente al dashboard al detectar `isSignedIn`.
2. **DashboardHome**: muestra perfil, modo de juego, timezone y enlaces hacia Daily Quest, Missions, Tasks y Scheduler. Reutiliza `BackendUserProvider` para hidratar los datos inmediatamente después del login.
3. **Daily Quest**: consulta `GET /daily-quest/definition` para listar emoción + tareas por pilar, muestra estado (pendiente/enviado) y prepara el terreno para enviar respuestas (iteración futura).
4. **Missions v2**: consume `GET /missions/board` y renderiza slots, estado y acciones disponibles (solo lectura en esta iteración). Utiliza los contratos de `packages/missions-v2-contracts` para mantener tipos consistentes.
5. **Tasks**: consulta `GET /users/:id/tasks` con el `backendUserId` actual y lista tareas activas, destacando si están archivadas/completadas.
6. **Scheduler / Daily Reminder**: lee `GET /me/daily-reminder` y muestra configuración (canal, hora local, timezone). Se añadirá edición en iteraciones futuras.

## Pasos de implementación (fase actual y siguientes)
1. **(Actual)** Documentar el stack y diseñar la arquitectura móvil (este archivo).✔️
2. **(Actual)** Crear workspace `apps/mobile` con Expo + React Native + Clerk, sin tocar `apps/api` ni `apps/web`.✔️
3. **(Actual)** Implementar:
   - Cliente HTTP nativo y hook `useApiQuery`.
   - `BackendUserProvider` + navegación autenticada (Root + Dashboard stack).
   - Pantallas iniciales (Login, DashboardHome, DailyQuest, Missions, Tasks, Scheduler) consumiendo los mismos endpoints (`/users/me`, `/daily-quest/definition`, `/missions/board`, `/users/:id/tasks`, `/me/daily-reminder`).✔️
4. **Siguientes iteraciones**:
   - Añadir escritura: `POST /daily-quest/submit`, `POST /missions/heartbeat`, `claim`, CRUD de tareas, `PUT /me/daily-reminder`.
   - Portar componentes visuales avanzados (gráficas XP, radar, timeline) reutilizando datos ya disponibles en los endpoints enumerados.
   - Incorporar `DailyQuestModal` y `ReminderSchedulerDialog` como pantallas completas, respetando exactamente los mismos contratos y manejo de errores.
   - Sincronizar configuraciones compartidas (por ej. feature flags) a través de un paquete común (`packages/shared-config`) para evitar divergencias.

## Plan para migrar más pantallas sin romper nada
1. **Crear capa compartida de contratos**: extraer tipos de `/apps/web/src/lib/api.ts` a un paquete compartido para que web y mobile compilen contra los mismos esquemas. Esto reducirá riesgos al migrar componentes como el editor de tareas.
2. **Modularizar secciones**: cada sección (Daily Quest, Missions, Scheduler, Editor) debe exponerse como `FeatureModule` con hooks `useFeatureData()` y componentes presentacionales. Mobile puede reutilizar la lógica sin importar el contenedor (modal vs pantalla).
3. **Sincronizar feature flags**: replicar `FEATURE_MISSIONS_V2`, `FEATURE_STREAKS_PANEL_V1`, etc., mediante un endpoint o paquete de configuración que ambas apps lean al arrancar.
4. **Testing cruzado**: añadir suites compartidas (por ejemplo, snapshot JSON) para garantizar que los endpoints no cambian mientras mobile los consume. Cuando se agregue una pantalla nueva, primero se valida el contrato en web y luego se habilita la navegación móvil.
5. **Entrega incremental**: cada nueva pantalla móvil debe:
   - Consumir exclusivamente endpoints existentes.
   - Compartir componentes/estilos donde sea posible.
   - Contar con feature flag para habilitarla gradualmente.

_No se modificó código existente en esta fase de documentación; las siguientes secciones del repo (apps/mobile) implementan la arquitectura descrita manteniendo intactos `apps/api` y `apps/web`._
