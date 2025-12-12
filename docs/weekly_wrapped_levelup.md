# Weekly Wrapped · Slide de Level Up

## Objetivo
Insertar un slide celebratorio cuando el usuario sube de nivel durante la semana, manteniendo la experiencia de Preview sin efectos laterales.

## Lógica
- Entrada de datos: resumen de nivel vía `getUserLevel(userId)` + XP semanal (suma de logs 7d).
- Se compara el XP inicial de la semana contra `xp_required_current`; si estaba por debajo y hoy está arriba, se considera Level Up.
- En Preview, se puede forzar el slide con el flag `forceLevelUpMock` desde Feedback Manager (no escribe métricas ni estado).
- Mock: usa niveles consecutivos (p.ej. 11 → 12) para validar animación.

## UI
- Slide full-screen con bordes multicolor, glow y contador de nivel grande.
- Copy corto: “Subiste a Nivel X” + transición del nivel previo y XP sumado.
- Animaciones simples (fade/scale/burst) sin librerías adicionales.
- Solo se muestra si `happened` es true; si no, se omite del storytelling.
