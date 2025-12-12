# Weekly Wrapped · Highlight emocional

## Objetivo
Reemplazar el highlight clásico por uno centrado en la emoción predominante de la semana y la quincena, reutilizando los mismos datos del **Emotion Chart**.

## Lógica
- Fuente única: `getEmotions(userId, { days: 15 })` (misma fuente que el Emotion Chart).
- Se normaliza por día y se calcula la emoción dominante en ventanas de 7 y 15 días.
- Desempate: gana la emoción más reciente dentro de la ventana.
- Mensajes fijos (sin aleatoriedad) definidos en `apps/web/src/lib/weeklyWrapped.ts` para estas 7 emociones: Felicidad, Motivación, Calma, Cansancio, Ansiedad, Tristeza, Frustración.
- Si faltan registros recientes, se muestra copy neutro invitando a registrar más emociones.

## UI
- El bloque de "Highlight emocional" muestra:
  - Emoción dominante 7 días + mensaje curado.
  - Emoción dominante 15 días como contexto.
  - Badge de tono (positiva / neutral / desafiante) y círculo de color.
- Se mantiene el estilo narrativo, sin métricas crudas.
