# Emotion Chart: Funcionamiento actualizado

El componente que alimenta el Emotion Chart en el dashboard V3 es `EmotionChartCard`
(`apps/web/src/components/dashboard/EmotionChartCard.tsx`). A continuación se resume la
lógica clave que controla qué días aparecen en la grilla y cómo se rellenan las celdas.

## Rango visible

* La grilla se ancla en el primer día con registro disponible y se proyecta exactamente 26
  semanas (182 días) hacia adelante. `computeTimelineStart` encuentra esa fecha inicial y
  `computeTimelineEnd` calcula el extremo derecho sumando 26 semanas menos un día.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L293-L320】
* El conjunto de registros se recorta al nuevo intervalo y, si el límite del 75 % elimina los
  primeros meses, el rango vuelve a ajustarse para conservar las 26 semanas a partir del primer
  día visible.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L323-L389】【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L643-L665】

## Control de cobertura (máximo 3/4)

* Para evitar que la grilla esté completamente ocupada, `trimExcessMonths` limita la cantidad de
  días con emociones almacenadas a un 75 % del total (hasta 136 días sobre 182).【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L22-L24】【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L342-L389】
* Cuando hay más registros que ese límite, se eliminan meses completos empezando por el más
  antiguo hasta quedar por debajo del umbral. Esos días se muestran como `Sin registro` en la
  grilla, liberando espacio visual para los meses nuevos.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L357-L388】

## Renderizado de la grilla

* `buildColumns` recorre las semanas del intervalo proyectado y genera una celda por día. Los
  días futuros (más allá de hoy) se pintan con el gris de "Sin registro" y los días anteriores
  muestran la emoción almacenada si existe un registro.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L391-L486】
* Las etiquetas de meses (`monthSegments`) se recalculan automáticamente para reflejar sólo los
  meses que permanecen visibles tras el recorte.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L439-L486】

## Resumen e indicadores

* El resumen inferior (`highlight`) sigue calculando la emoción más frecuente de los últimos 15
  días con registros válidos dentro del rango visible. Los meses ocultos no influyen en este
  cálculo.【F:apps/web/src/components/dashboard/EmotionChartCard.tsx†L488-L527】

En conjunto, esta lógica garantiza que siempre haya un espacio libre aproximado de un 25 % en la
grilla, que el mapa cubra exactamente los últimos seis meses y que los registros más recientes
reciban prioridad visual.
