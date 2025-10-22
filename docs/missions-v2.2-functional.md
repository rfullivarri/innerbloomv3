# 🌌 Misiones v2.2 — Diseño funcional actualizado
*Versión 2.2 · Estado: Consolidado para documentación de producto*
*Proyecto Innerbloom — Sistema de Misiones Integradas con Daily Quest*

## 0) Propósito general
Misiones v2.2 redefine el sistema de misiones como un motor de progresión real, donde cada jugador combina propósito, desafío y entrenamiento de habilidades personales dentro del flujo diario del Daily Quest.
El objetivo de esta versión es alinear la lógica narrativa y funcional entre:
- el onboarding inicial (perfil de usuario y stats),
- el cuestionario de activación de misiones,
- y la IA generadora de misiones personalizadas.

## 1) Estructura de navegación
La vista de Misiones está dividida en dos tabs principales:

| Tab | Contenido | Descripción |
|-----|------------|-------------|
| **Misiones Activas** | Carrusel horizontal con hasta 3 slots (Main, Hunt, New Skill). | Muestra las misiones en curso, su progreso, pétalos, countdown y acciones contextuales. |
| **Market** | Carrusel horizontal con 3 cartas principales (una por tipo de misión). | Cada carta se da vuelta al tocarla, revelando un carrusel vertical con 3 misiones propuestas de ese tipo. Total: 9 misiones disponibles. |

💡 UX: cada carta del Market tiene un flip animado; al girar, el reverso permite scrollear verticalmente entre misiones alternativas (3 por tipo).

## 2) Activación de Misiones y Cuestionario
Todas las misiones se activan mediante un cuestionario guiado, que complementa el onboarding y alimenta a la IA generadora de misiones.
El cuestionario tiene tres secciones (una por tipo de misión):

| Tipo | Propósito del cuestionario | Fuente de datos combinada |
|------|-----------------------------|----------------------------|
| **Main Quest** | Identificar el objetivo principal actual del usuario y las tareas necesarias para alcanzarlo. | Onboarding + respuestas nuevas. |
| **Hunt Mission** | Detectar tareas con alta fricción o desuso prolongado y entender por qué. | Historial de tareas + onboarding + respuestas nuevas. |
| **New Skill** | Determinar qué habilidad (stat) desea fortalecer o desarrollar. | Stats del onboarding + preferencias actuales. |

## 3) Tipos de Misión
### 🧭 Main Quest — Tu objetivo principal
... (contenido completo de la versión consolidada) ...
