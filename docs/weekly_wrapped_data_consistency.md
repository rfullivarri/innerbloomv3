# Weekly Wrapped · Consistencia de datos

## Fuente de verdad
- Los conteos de actividad semanales usan el mismo origen que el Detalle de tarea: los registros de `daily_log` expuestos por el endpoint de admin logs. Cada fila incluye la fecha y `timesInRange` (cantidad de repeticiones en ese día), que coinciden con lo que consume el modal de insights por tarea.

## Fórmula exacta de "X/7"
- Se normalizan los logs reales a un rango de 7 días consecutivos (fin = último log disponible).
- Para cada tarea se arma un set de fechas (`dateKey`) con estado distinto de `red`.
- `X` = número de fechas únicas en ese set dentro del rango; nunca se suman múltiples envíos del mismo día.
- El total de completions usa la cantidad real (`timesInRange`) por día, no solo la cantidad de filas.

## Fallback si falta data
- Si un log carece de fecha válida, se excluye del conteo y el copy se degrada a mensajes sin números concretos ("Ritmo sólido esta semana").
- Si no hay hábitos con días activos, se muestra el texto de ausencia de datos ya existente.

## Por qué antes estaba desalineado
- El Wrapped contaba filas de logs como días completados. Si un hábito tenía múltiples registros o cantidades > 1 en el mismo día, mostraba valores como `5/7` aunque el Detalle de tarea registraba solo 4 días activos. Ahora ambos usan fechas únicas y cantidades reales como en el Task Detail.
