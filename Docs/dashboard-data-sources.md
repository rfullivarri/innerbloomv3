# Mapeo de endpoints → vistas del dashboard

| Endpoint | Vista / Insight | Datos consumidos | Descripción funcional |
| --- | --- | --- | --- |
| `GET /users/me` | Hook `useBackendUser` → Navbar + layout general | Perfil (`user_id`, `game_mode`, `weekly_target`, `image_url`) | Determina el identificador interno que usan el resto de llamadas y muestra modo de juego/avatar. |
| `GET /users/:id/summary/today` | Hero del dashboard legacy · `DashboardPage` | XP del día y conteo de quests (`total`/`completed`) | Llena los titulares del snapshot diario y los contadores que aparecen en la tarjeta principal. |
| `GET /users/:id/xp/total` + `GET /users/:id/level` | Tarjeta "Progreso general" (V3) · `MetricHeader` | Total de XP, nivel actual, porcentaje y XP faltante | Renderiza los KPIs principales del jugador en la cabecera del dashboard nuevo. |
| `GET /users/:id/level` (derivado vía `getProgress`) | Tarjeta legacy "Level Progress" · `LevelCard` | Total XP, nivel, XP restante, etiqueta del próximo nivel | Replica el módulo de progreso histórico del MVP en la vista legacy. |
| `GET /users/:id/xp/daily` | "Daily Cultivation" (V3) · `DailyCultivationSection` | Serie diaria `{ date, xp_day }` | Grafica la tendencia mensual y resume total/promedio de XP por mes. |
| `GET /users/:id/xp/daily` | Panel de rachas legacy · `LegacyStreaksPanel` | Serie diaria `{ date, xp_day }` | Calcula XP semanal aproximado cuando la API aún no entrega métricas específicas. |
| `GET /users/:id/xp/daily` | Tarjeta legacy "Streak" · `StreakCard` | Serie diaria `{ date, xp_day }` | Computa `current` y `longest streak` contando días con XP positivo. |
| `GET /users/:id/streaks/panel` | Panel de rachas V3 · `StreaksPanel` | `topStreaks` y `tasks` con métricas por rango | Alimenta el ranking de misiones consistentes y detalla XP/completitud por semana, mes y trimestre. |
| `GET /users/:id/tasks` | "Missions" (V3) · `MissionsSection` | Lista de tareas activas (`task`, `pillar_id`, `xp_base`) | Presenta el backlog de misiones hasta que exista un endpoint dedicado a quests. |
| `GET /users/:id/tasks` | Panel de rachas legacy · `LegacyStreaksPanel` | Lista de tareas activas | Muestra las misiones filtrables por pilar junto al XP base. |
| `GET /users/:id/daily-energy` | Tarjeta "Daily Energy" (V3) · `EnergyCard` | Porcentajes normalizados de HP, Mood y Focus | Dibuja las barras de energía con el promedio móvil de 7 días. |
| `GET /users/:id/xp/by-trait` | Tarjeta "Radar Chart" (V3) · `RadarChartCard` | Totales de XP por rasgo/pilar | Calcula el polígono de fuerzas (Body/Mind/Soul) con acumulados por trait. |
| `GET /users/:id/emotions` | "Emotion Timeline" (V3) · `EmotionChartCard` | Lista `{ date, emotion_id }` | Genera el heatmap y resumen de emociones destacadas en el periodo seleccionado. |
| `GET /users/:id/emotions` | Heatmap legacy · `EmotionHeatmap` | Lista `{ date, emotion_id }` | Replica la cuadrícula de estados de ánimo usada en el MVP. |
| `GET /users/:id/achievements` | Tarjeta legacy "Achievements" · `AchievementsList` | Array de logros con progreso (`current`, `target`, `pct`) | Muestra hitos desbloqueados y el avance hacia los próximos objetivos. |
| `GET /users/:id/journey` | Banner de alertas (V3) · `Alerts` | `days_of_journey`, `quantity_daily_logs` | Decide si mostrar recordatorios para confirmar base o agendar Daily Quest. |
