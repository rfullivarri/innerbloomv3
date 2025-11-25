# Innerbloom Mobile v2 (base mínima React Native)

## 1. Introducción
Esta carpeta contiene una base mínima de proyecto React Native enfocada únicamente en el lado JavaScript/TypeScript. Por políticas de Codex **no versionamos** las carpetas nativas `ios/` ni `android/`; se generan localmente en tu máquina y permanecerán ignoradas por Git gracias al `.gitignore` incluido. Aquí encontrarás el punto de entrada (`index.js`) y un componente de ejemplo (`src/App.tsx`) que muestra un mensaje "Hello World 👋".

## 2. Requisitos previos
Asegúrate de contar con lo siguiente en tu Mac:
- macOS con Xcode instalado desde la App Store.
- Node.js (cualquier versión LTS reciente funciona bien).
- Un gestor de paquetes: preferimos **pnpm**, pero puedes usar npm o yarn si lo deseas.
- CocoaPods: `sudo gem install cocoapods`.

## 3. Paso a paso: preparar el proyecto JS
1. Abre Terminal.
2. Ve a la raíz del repositorio: `cd ruta/al/repositorio`.
3. Instala dependencias de la raíz si aplica: `pnpm install` (o `npm install`/`yarn`).
4. Entra a la app: `cd apps/mobilev2`.
5. Instala dependencias de la app: `pnpm install` (o `npm install`/`yarn`).

## 4. Paso a paso: generar las carpetas nativas (LOCAL, NO VERSIONADO)
Las carpetas `ios/` y `android/` **no vienen en el repo**; debes generarlas localmente y quedarán ignoradas por Git.

Ejemplo usando React Native CLI con TypeScript desde `apps/mobilev2`:
```bash
cd apps/mobilev2
npx react-native@latest init InnerbloomMobileV2Native \
  --directory ios-temp \
  --template react-native-template-typescript
```
Esto creará un proyecto temporal en `apps/mobilev2/ios-temp`. Luego:
1. Mueve las carpetas nativas al nivel actual: `mv ios-temp/ios ios-temp/android .` (puedes ajustar si solo necesitas iOS).
2. Elimina el resto del proyecto temporal: `rm -rf ios-temp`.
3. Verifica que `ios/` y `android/` aparecen en `.gitignore` (ya está configurado).

Si prefieres generar solo iOS, puedes crear el proyecto en un directorio temporal y mover únicamente `ios/`. El punto clave: **no subir `ios/` ni `android/` al repo**.

## 5. Paso a paso: correr en iOS
1. Desde `apps/mobilev2`, abre dos terminales.
2. Terminal 1 (Metro bundler):
   ```bash
   pnpm start
   ```
   Metro sirve el bundle JS; si ya está corriendo, te indicará el puerto (usualmente 8081).
3. Terminal 2 (lanzar simulador):
   ```bash
   pnpm ios
   ```
   Esto ejecuta `react-native run-ios`, instala pods si hace falta y abre el simulador de iOS. Alternativa: abrir el workspace/proyecto generado en Xcode y ejecutar desde ahí.

## 6. Cómo verificar que todo salió bien
En el simulador de iOS deberías ver la pantalla con el texto **"Hello World 👋"** y el subtítulo indicando que la base nativa funciona. Ese contenido proviene de `src/App.tsx`.

## 7. Troubleshooting básico
- **CocoaPods no instalado**: si `pod` no se encuentra, ejecuta `sudo gem install cocoapods`. Si hay problemas de permisos, prueba con `sudo gem install -n /usr/local/bin cocoapods`.
- **Metro colgado o con caché corrupta**: reinicia con `pnpm start -- --reset-cache`.
- **Simulador no abre**: abre Xcode > Open Developer Tool > Simulator y vuelve a correr `pnpm ios`.

¡Listo! Con estos pasos tendrás un proyecto React Native mínimo listo para trabajar, manteniendo las carpetas nativas fuera del control de versiones.
