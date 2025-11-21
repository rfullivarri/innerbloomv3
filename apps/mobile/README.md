# Innerbloom Mobile (apps/mobile)

Cliente nativo (Expo + React Native) que replica el dashboard web usando las mismas APIs y autenticación de Clerk.

## Requisitos
- Node.js 20.x
- pnpm (el monorepo está configurado como workspace de pnpm)
- Xcode / Android Studio para emuladores o builds nativos
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) se ejecuta vía `pnpm exec expo ...`

## Variables de entorno
Crea un archivo `.env` en `apps/mobile` o exporta las siguientes variables antes de levantar la app:

```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=<tu publishable key>
EXPO_PUBLIC_CLERK_TOKEN_TEMPLATE=<opcional: template de Clerk>
EXPO_PUBLIC_API_BASE_URL=https://api.innerbloom.dev (o el host de Railway/local)
```

Estas variables se leen desde `App.tsx` y `src/api/client.ts` para inicializar Clerk y componer las rutas `/api/*`.

### Apuntar la app al backend local o de Railway

- **Backend de producción**: usa `https://api.innerbloom.dev` en `EXPO_PUBLIC_API_BASE_URL` (requiere HTTPS, no necesita excepciones ATS).
- **Backend de Railway**: coloca la URL del servicio Railway (generalmente HTTPS). No requiere cambios adicionales si la URL es segura.
- **Backend local**: usa `http://localhost:3000` o `http://127.0.0.1:3000` para los simuladores. Las builds de desarrollo/preview habilitan una excepción de ATS automáticamente para permitir HTTP en iOS.

Cuando quieras probar llamadas HTTP en el simulador iOS, asegúrate de ejecutar con un perfil de desarrollo o preview (`pnpm --filter @innerbloom/mobile exec expo start --dev-client` o `pnpm exec eas build --profile development --platform ios`). Las builds de producción mantienen ATS con HTTPS obligatorio.

## Instalación de dependencias
Desde la raíz del monorepo:

```
pnpm install
```

## Scripts rápidos
- `pnpm --filter @innerbloom/mobile start`: levanta Metro/Expo (`expo start`).
- `pnpm --filter @innerbloom/mobile exec expo start --dev-client`: arranca Metro en modo Dev Client.
- `pnpm --filter @innerbloom/mobile android`: build & run en un dispositivo/emulador Android (`expo run:android`).
- `pnpm --filter @innerbloom/mobile ios`: equivalente para iOS (`expo run:ios`).
- `pnpm --filter @innerbloom/mobile web`: vista previa web vía Expo.
- `pnpm --filter @innerbloom/mobile typecheck`: `tsc --noEmit` para validar tipos.

## Flujo Dev Client + EAS (iPhone real)
1. Desde la raíz, instala dependencias con `pnpm install` (una sola vez).
2. Enlaza tu cuenta y el proyecto con EAS (solo la primera vez):
   - `cd apps/mobile`
   - `pnpm exec eas login`
   - `pnpm exec eas init` (esto guardará el `projectId` en la app si aún no existe).
3. Genera un Dev Build para iOS (usa el perfil `development` definido en `eas.json`):
   - `cd apps/mobile`
   - `pnpm exec eas build --profile development --platform ios`
   - Para Android es análogo: `pnpm exec eas build --profile development --platform android`.
4. Instala el Dev Client en el dispositivo real con el enlace generado por EAS (QR interno o TestFlight). No necesitas Expo Go.
5. Con el Dev Client instalado y en la misma red que tu máquina, levanta el servidor de desarrollo:
   - `pnpm --filter @innerbloom/mobile exec expo start --dev-client`
6. Abre el cliente en el iPhone y escanea el QR/usa el enlace `exp+innerbloom://` que muestra el dev server.

## Generar proyectos nativos localmente (opcional)
- `cd apps/mobile && pnpm exec expo prebuild`
- Esto crea `apps/mobile/ios` y `apps/mobile/android` para Xcode/Android Studio. **No** comitees estos directorios ni ningún `.ipa` generado.

## Abrir el proyecto iOS en Xcode y correr el simulador
1. Genera el proyecto nativo con `pnpm exec expo prebuild --clean --platform ios` (no se comitea la carpeta `ios/`).
2. Abre `apps/mobile/ios/Innerbloom Mobile.xcworkspace` en Xcode (`open ios/Innerbloom\ Mobile.xcworkspace` desde `apps/mobile`).
3. En la pestaña **Signing & Capabilities** selecciona tu _Team_ para que Xcode configure automáticamente el provisioning profile.
4. Elige un dispositivo de simulador en la barra superior (por ejemplo, *iPhone 16 Pro*).
5. Corre la app con **Product → Run** (`⌘ + R`); puedes detenerla con `⌘ + .` y limpiar la build con `⇧ + ⌘ + K` si cambias de bundle ID.
6. Cada vez que regeneres el proyecto, verifica que la carpeta `ios/` y su `Podfile` sigan fuera del control de versiones.

## Recordatorio sobre artefactos binarios
- No se comitean `.ipa`, `.apk`, carpetas `ios/` o `android/` generadas por `expo prebuild`, ni builds de distribución.
- Si necesitas un proyecto nativo, genera las carpetas localmente con el comando anterior y mantenlas fuera del control de versiones.

## Estado actual
- Pantalla de login con Clerk (email + password).
- Stack de navegación protegido (`DashboardHome`, `DailyQuest`, `Missions`, `Tasks`, `Scheduler`).
- Cliente HTTP compartido (`src/api/client.ts`) que consume `/users/me`, `/daily-quest/definition`, `/missions/board`, `/users/:id/tasks`, `/me/daily-reminder` usando los mismos contratos que la web.
- Hook `BackendUserProvider` hidrata el perfil y comparte `backendUserId` con todas las pantallas.

Sigue el plan descrito en `docs/mobile-app-plan.md` para futuras iteraciones (Daily Quest submit, scheduler editable, misiones interactivas, etc.).

## Archivos actualizados y comandos clave
- Archivos tocados en esta configuración: `apps/mobile/package.json`, `apps/mobile/app.json`, `eas.json`, `apps/mobile/README.md`.
- Generar proyectos nativos (si necesitas Xcode/Android Studio): `cd apps/mobile && pnpm exec expo prebuild`.
- Build de desarrollo iOS con Dev Client: `cd apps/mobile && pnpm exec eas build --profile development --platform ios`.
- Lanzar la app con Dev Client ya instalada: `pnpm --filter @innerbloom/mobile exec expo start --dev-client`.
