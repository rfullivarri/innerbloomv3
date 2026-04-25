# Mobile App Setup

## Arquitectura elegida

Se creó `apps/mobile` como una app Capacitor que empaqueta la build estática de `apps/web`.

No hay una segunda UI mobile, no se duplicaron pantallas ni componentes, y la app iOS consume exactamente la misma aplicación React/Vite que ya existe para web. La capa nativa solo añade el contenedor Capacitor, la plataforma iOS y los ajustes mínimos necesarios para que la web funcione de forma razonable dentro de una app.

## Por qué Capacitor

Capacitor encaja con las restricciones del proyecto:

- reutiliza la web existente como fuente única de UI
- permite generar una app iOS local sin migrar producto a React Native ni Expo
- reduce el riesgo sobre `apps/web` y backend
- deja Android disponible para una segunda pasada con la misma base

## Estructura creada

- `apps/mobile/package.json`
- `apps/mobile/capacitor.config.ts`
- `apps/mobile/ios/`
- `apps/web/src/mobile/capacitor.ts`
- `apps/web/src/mobile/NativeMobileBridge.tsx`
- `apps/web/src/mobile/MobileAppEntry.tsx`

Cambios mínimos adicionales en web:

- `apps/web/src/main.tsx` monta el bridge nativo solo cuando corre dentro de Capacitor
- `apps/web/src/App.tsx` decide entrada distinta para web pública y app nativa
- `apps/web/index.html`
- `apps/web/login/index.html`
- `apps/web/onboarding/index.html`
- `apps/web/src/index.css`
- `apps/web/src/hooks/useOnboardingProgress.ts`
- `apps/web/src/pages/Login.tsx`
- `apps/web/src/pages/SignUp.tsx`

Cambios mínimos adicionales en iOS:

- `apps/mobile/ios/App/App/Info.plist` registra el esquema `innerbloom://`

## Scripts disponibles

Desde `apps/mobile`:

- `pnpm run build:web`: build de `apps/web` y saneado de atributos extendidos
- `pnpm run copy`: build web + `cap copy`
- `pnpm run sync`: build web + `cap sync`
- `pnpm run sync:ios`: build web + `cap sync ios`
- `pnpm run build:ios:sim`: compila para iOS Simulator sin code signing
- `pnpm run install:ios:booted`: instala la app en el simulador booted
- `pnpm run launch:ios:booted`: lanza la app instalada en el simulador booted
- `pnpm run run:ios:booted`: hace `sync`, compila, instala y lanza en simulador
- `pnpm run open:ios`: abre el proyecto iOS en Xcode
- `pnpm run run:ios`: flujo estándar `cap run ios`
- `pnpm run doctor`: diagnóstico de Capacitor

## Variables de entorno necesarias

La app mobile depende de la misma configuración que `apps/web`.

Variables críticas:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL` o `VITE_API_URL`

Variables relevantes según despliegue/auth:

- `VITE_CLERK_TOKEN_TEMPLATE`
- `VITE_WEB_BASE_URL`
- `VITE_DASHBOARD_PATH`
- `VITE_GA4_MEASUREMENT_ID`

### Estado real actual

En esta máquina, la app ya renderiza una entrada mobile propia y ya no abre en la landing web.

La key de Clerk ya no falta, pero quedó expuesto un bloqueo distinto:

- dentro del WebView nativo de Capacitor, `ClerkProvider` no está resolviendo `isLoaded` de forma confiable con la integración actual basada en `@clerk/clerk-react`
- por eso la capa de entrada usa un bootstrap corto y luego degrada a la welcome screen en vez de dejar la app clavada en splash infinito

Eso permite una buena experiencia de entrada para usuario sin sesión, pero deja auth nativa todavía parcialmente abierta.

## Cómo correr iOS en esta Mac

Prerequisitos prácticos:

- Xcode instalado
- CocoaPods disponible
- `pnpm install` ejecutado en la raíz
- variables de entorno de `apps/web` cargadas en la shell actual

Flujo recomendado:

1. Arrancar un simulador de iOS desde Simulator.app o desde Xcode.
2. Desde la raíz del repo, ejecutar `pnpm --dir apps/mobile run run:ios:booted`.

Flujo paso a paso:

1. `pnpm install`
2. exportar `VITE_CLERK_PUBLISHABLE_KEY`
3. exportar `VITE_API_BASE_URL` o `VITE_API_URL`
4. `pnpm --dir apps/mobile run sync:ios`
5. `pnpm --dir apps/mobile run build:ios:sim`
6. `pnpm --dir apps/mobile run install:ios:booted`
7. `pnpm --dir apps/mobile run launch:ios:booted`

Para abrir en Xcode:

1. `pnpm --dir apps/mobile run open:ios`
2. abrir `apps/mobile/ios/App/App.xcodeproj`

## Ajustes mobile aplicados

Se añadieron solo los ajustes necesarios para ejecutar la web dentro de una app:

- `viewport-fit=cover` en las entradas HTML relevantes
- clase `capacitor-native` en `html` y `body` para controlar safe areas y overscroll
- bridge nativo para:
  - deep links de apertura de app
  - apertura de links externos con `@capacitor/browser`
  - configuración de `StatusBar`
  - configuración de `Keyboard`

## Nueva lógica de entrada

La app instalada ya no usa la landing pública como pantalla inicial.

### Web pública

- `/` sigue mostrando la landing normal cuando la app corre en navegador

### App nativa en Capacitor

- `/` entra en `MobileAppEntry`
- `MobileAppEntry` muestra primero un splash/bootstrap corto
- si no hay sesión resuelta, muestra una welcome screen mobile propia de Innerbloom
- si hay sesión y el backend responde, consulta `/users/me` y `/onboarding/progress`
- si el onboarding está incompleto, navega a `/intro-journey`
- si el onboarding está completo, navega a `DASHBOARD_PATH`

### Rutas y componentes reutilizados

- login sigue en `/login`
- signup sigue en `/sign-up`
- onboarding sigue en `/intro-journey`
- dashboard sigue en `DASHBOARD_PATH`

No se duplicó el producto. Solo se reemplazó la capa de entrada nativa.

## Estado de autenticación

Auditoría actual:

- la web usa Clerk con `ClerkProvider`
- login y sign-up usan rutas path-based (`/login`, `/sign-up`)
- onboarding usa routing virtual
- el backend protege CORS con allowlist explícita

Estado exacto tras esta pasada:

- la app iOS abre y puede lanzar el contenedor Capacitor en simulador
- la app ya no cae en la landing web: ahora entra por splash + welcome screen mobile propia
- la publishable key real ya está siendo usada en el flujo local
- se dejó preparado el esquema `innerbloom://` para deep linking nativo
- se dejó preparado el listener nativo para `appUrlOpen`
- login/signup vuelven a `/` en mobile en vez de volver a la landing pública

Bloqueo real actual:

- en mobile nativo, Clerk no termina de resolver `isLoaded` con la integración actual basada en web embebida
- por ese motivo no quedó cerrado un login end-to-end real en el simulador
- la app degrada correctamente a welcome screen para evitar splash infinito, pero la autenticación nativa aún necesita una integración compatible de Clerk para `capacitor://localhost`

Lo que falta para cerrar auth correctamente:

- resolver la estrategia correcta de Clerk para mobile nativo con Capacitor y `capacitor://localhost`
- validar redirects de login, sign-up y cualquier callback OAuth/social si existen
- confirmar si Clerk necesita configuración adicional de deep link / redirect URL en dashboard para `innerbloom://`

No se introdujo una segunda arquitectura de auth ni un frontend paralelo.

## Problemas abiertos reales

- Clerk no resuelve el estado de sesión nativo de forma fiable dentro del WebView actual, así que el flujo real de login móvil sigue pendiente.
- La build estándar firmada de Xcode puede fallar en esta máquina con `resource fork, Finder information, or similar detritus not allowed` por atributos extendidos en assets copiados. La compilación para simulador sin code signing sí quedó validada.
- `apps/web` mantiene errores de typecheck preexistentes ajenos a esta pasada mobile.
- El workspace declara Node `20.x`; en esta máquina se ejecutó con Node `24.11.1`, lo que genera warnings aunque no bloqueó la build web ni la compilación del simulador.

## Validación realizada

Quedó validado localmente:

- `apps/mobile` creada
- plataforma iOS generada con Capacitor
- `apps/mobile/ios/App/App.xcodeproj` existente y abrible
- build de `apps/web` correcta
- build de `apps/api` correcta después de rehacer `pnpm install`
- compilación de iOS Simulator correcta
- instalación y lanzamiento en simulador correctos
- la app abre en splash/bootstrap propio de app
- la app degrada a welcome screen mobile propia en vez de abrir la landing pública
- la lógica de entrada nativa ya separa web pública y app instalada
- login/signup ya no usan “volver al inicio” hacia la landing pública cuando se está en mobile

Lo que no quedó validado:

- entrada autenticada real hasta onboarding o dashboard dentro del simulador
- login real con Clerk dentro del simulador
- callback/deep link post-login cerrado end-to-end

## Próximos pasos priorizados

1. Resolver la estrategia de Clerk compatible con Capacitor/iOS para que `isLoaded` y la sesión funcionen de verdad dentro del WebView nativo.
2. Repetir login, sign-up, logout y recuperación de sesión dentro del simulador.
3. Validar que usuario autenticado sin onboarding entra a `/intro-journey`.
4. Validar que usuario autenticado con onboarding completo entra al dashboard.
5. Si hay OAuth/social login, registrar y probar los redirects/deep links exactos en Clerk.
6. Resolver, fuera de esta pasada mobile, los errores preexistentes de typecheck de `apps/web`.
