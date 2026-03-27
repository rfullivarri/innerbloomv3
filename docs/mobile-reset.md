# Mobile reset (base limpia)

Fecha: 2026-03-27

## Qué se eliminó

- Se eliminó por completo `apps/mobile/` (código, assets, config Expo/React Native, scripts y local packages de la implementación mobile previa).

## Referencias limpiadas

- Se limpiaron ignores del repo raíz que apuntaban únicamente a la app mobile anterior:
  - `.gitignore`: entradas `apps/mobile/ios/`, `apps/mobile/android`, `apps/mobile/**/*.ipa`, `.expo-shared/`.
  - `.eslintignore`: entrada `apps/mobile/ios/`.
- Se actualizaron docs que referenciaban rutas concretas ya eliminadas de `apps/mobile`.
- Se regeneró `pnpm-lock.yaml` para remover el workspace `apps/mobile` y sus dependencias Expo/React Native asociadas.

## Qué no se tocó

- `apps/web` (sin cambios funcionales).
- `apps/api` / backend (sin cambios funcionales).
- `packages/*` compartidos (sin cambios de lógica).

## Estado final

- El repositorio queda sin implementación mobile heredada.
- La base queda lista para construir una nueva `apps/mobile` desde cero con Capacitor, sin reutilizar arquitectura Expo/React Native previa.
