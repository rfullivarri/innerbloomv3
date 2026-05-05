# Diagnóstico pipeline Habit Achievement (caso “Minoxidil noche”)

## Resultado
El punto más probable de quiebre está entre el cierre mensual y la detección:

1. **La detección mensual de Habit Achievement solo toma candidatos con `source = 'cron'` y en la ventana exacta del mes recién agregado** (`period_end >= periodStart` y `< nextPeriodStart`).
2. **La UI de “Resultado últimos meses” usa otra lógica/fuente**: mezcla `task_difficulty_recalibrations` de `source IN ('cron', 'admin_monthly_backfill')` + mes actual proyectado, por lo que puede mostrar “3 meses fuertes” aunque no haya 3 cierres cron válidos para el detector.
3. Si abril no tuvo filas `cron` (o no cayó en el rango exacto), no habrá candidato y no se crea `task_habit_achievements`.

## Evidencia técnica en código

### 1) Entrada del cron y orden de ejecución
`/internal/cron/monthly-task-difficulty` ejecuta, en orden:
- calibración mensual (`runMonthlyTaskDifficultyCalibration`),
- agregación mensual (`runUserMonthlyModeUpgradeAggregation`),
- y luego detección (`runMonthlyHabitAchievementDetection`) con la ventana de agregación.

Esto implica que el detector depende directamente de que la corrida de calibración haya dejado filas utilizables para ese mes.

### 2) Filtro estricto del detector mensual
`runMonthlyHabitAchievementDetection` selecciona candidatos con:
- `r.source = 'cron'`
- `r.period_end` dentro de `[periodStart, nextPeriodStart)`
- task elegible por lifecycle (`buildHabitAchievementFilter`).

Si no hay filas cron del mes, ese task ni siquiera entra a evaluación.

### 3) Agregación mensual también depende de `cron`
`runUserMonthlyModeUpgradeAggregation` para `user_monthly_mode_upgrade_stats` filtra también `r.source = 'cron'` y misma ventana mensual. Si abril no aparece ahí, es señal fuerte de que no hubo material cron procesable.

### 4) Diferencia con la UI del modal
`getTaskPreviewAchievement` (que alimenta “Resultado últimos meses”) consulta cerrados con:
- `source = ANY(['cron', 'admin_monthly_backfill'])`

Además agrega el mes en curso proyectado. Por eso puede mostrar feb/mar/abr muy altos y may proyectado, aunque el detector mensual (estricto a cron) no haya disparado.

## Riesgo adicional de lifecycle flags
Aunque haya filas cron, el candidato se excluye si task no cumple filtro de lifecycle/eligibilidad (active, excluded_from_habit_achievement, estados de lifecycle ya cerrados, etc.).

## Checklist operativo para validar causa raíz en datos
Ejecutar estas queries en producción/staging para el task real:
- resolver `task_id` por nombre y usuario,
- inspeccionar `task_difficulty_recalibrations` por task,
- inspeccionar `task_habit_achievements`,
- inspeccionar flags de `tasks`,
- verificar `user_monthly_mode_upgrade_stats` para `2026-04`,
- verificar conteo de filas cron abril.

## Conclusión de hipótesis
La hipótesis propuesta por producto es consistente con el código actual: **si faltan filas `cron` (o abril no fue procesado en ventana), el achievement no dispara aunque el preview visual luzca “fuerte”**.

## Fix mínimo y seguro (propuesto)
1. **Observabilidad** (sin cambiar reglas):
   - log estructurado en detector cuando `candidateResult.rows.length === 0` por período,
   - endpoint/admin diagnóstico que compare:
     - meses preview (cron + backfill + proyectado),
     - meses válidos para detector (solo cron).
2. **Alineación UX**:
   - en modal, etiqueta explícita: “Preview (incluye backfill/proyección)” y mostrar contador “Meses cron consecutivos válidos para achievement”.
3. **Política de fuente (opcional, decisión de producto):**
   - si se quiere equivalencia visual/achievement, permitir en detector `source IN ('cron','admin_monthly_backfill')` para runs retroactivos o para mensual bajo flag.

