# Innerbloom Mobile (apps/mobile)

Cliente nativo (Expo + React Native) que replica el dashboard web usando las mismas APIs y autenticación de Clerk.

## Requisitos
- Node.js 20.x
- npm 10 (el repositorio ya usa workspaces)
- Xcode / Android Studio para emuladores nativos (opcional)
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) se instala automáticamente al correr los scripts (`npx expo ...`).

## Variables de entorno
Crea un archivo `.env` en `apps/mobile` o exporta las siguientes variables antes de levantar la app:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<tu publishable key>
EXPO_PUBLIC_CLERK_TOKEN_TEMPLATE=<opcional: template de Clerk>
EXPO_PUBLIC_API_BASE_URL=https://api.innerbloom.dev (o el host de Railway/local)
```

Estas variables se leen desde `App.tsx` y `src/api/client.ts` para inicializar Clerk y componer las rutas `/api/*`.

## Instalación
Desde la raíz del monorepo:

```
npm install
```

## Comandos principales
- `npm run --workspace @innerbloom/mobile start`: levanta Metro/Expo (`expo start`).
- `npm run --workspace @innerbloom/mobile android`: build & run en un dispositivo/emulador Android (`expo run:android`).
- `npm run --workspace @innerbloom/mobile ios`: equivalente para iOS (`expo run:ios`).
- `npm run --workspace @innerbloom/mobile web`: vista previa web vía Expo.
- `npm run --workspace @innerbloom/mobile typecheck`: `tsc --noEmit` para validar tipos.

## Builds de prueba
Para generar un APK local sin pasar por las tiendas:

```
cd apps/mobile
npx expo run:android --variant release
```

Esto produce un APK en `android/app/build/outputs/apk/release/`. En iOS puedes usar `npx expo run:ios --configuration Release` y distribuir el `.app` resultante vía TestFlight/instalación manual.

## Estado actual
- Pantalla de login con Clerk (email + password).
- Stack de navegación protegido (`DashboardHome`, `DailyQuest`, `Missions`, `Tasks`, `Scheduler`).
- Cliente HTTP compartido (`src/api/client.ts`) que consume `/users/me`, `/daily-quest/definition`, `/missions/board`, `/users/:id/tasks`, `/me/daily-reminder` usando los mismos contratos que la web.
- Hook `BackendUserProvider` hidrata el perfil y comparte `backendUserId` con todas las pantallas.

Sigue el plan descrito en `docs/mobile-app-plan.md` para futuras iteraciones (Daily Quest submit, scheduler editable, misiones interactivas, etc.).
