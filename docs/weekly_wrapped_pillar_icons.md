# Weekly Wrapped · Iconografía de pilares

- **Resolución de pilar por task**: el pilar de cada hábito proviene de `log.pillar` y se consolida en `aggregateHabits` dentro de `apps/web/src/lib/weeklyWrapped.ts`, que pasa el valor al payload de la sección de hábitos.
- **Fallback cuando falta pilar**: si un hábito no trae pilar, `getPillarIcon` devuelve una cadena vacía y la UI no muestra icono (estado neutro).
