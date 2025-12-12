# Weekly Wrapped Preview · Scroll Storytelling

## Enfoque
- El modal de Weekly Wrapped ahora es una narrativa de 4 bloques verticales con `scroll-snap`, ocupando ~100% del viewport y avanzando slide por slide con el scroll.
- Cada bloque usa animaciones suaves (`fade` + `translateY`) con delays escalonados para dar sensación premium sin librerías nuevas.
- Se reorganizó el contenido en aperturas, hábitos constantes, progreso/foco y cierre motivacional; cada bloque mezcla datos reales/mock del payload en un relato unificado (sin side effects ni cambios en feedback manager).

## Estructura de bloques
1. **Apertura:** header con rango de fechas, chips de data source/variant/pilar, bienvenida y logros principales en una sola pantalla.
2. **Hábitos constantes:** lista con emojis y badges de racha, con stagger en la entrada.
3. **Progreso y foco:** level up, pilar dominante con color/acento y highlight 🔥 de la semana en un solo plano narrativo.
4. **Cierre:** mensaje motivacional y CTA suaves (cerrar/seguir/ir al Daily Quest) dentro del preview.
