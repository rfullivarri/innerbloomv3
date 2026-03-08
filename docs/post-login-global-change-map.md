# Innerbloom · Mapa operativo post-login (living doc)

> **Objetivo**
> Este documento existe para que, cuando aparezca un pedido tipo **"modificá todo esto después del login"**, no se escape ninguna pantalla/modal/popup/feedback.
>
> Es un **mapa operativo** pensado para ejecución de cambios globales (ej: ES/EN, visual refresh, reglas de copy, tracking, QA).

---

## 1) Alcance post-login (usuario autenticado)

### 1.1 Rutas protegidas principales
- `/dashboard-v3` (base; puede variar por `VITE_DASHBOARD_PATH`)
- `/dashboard-v3/misiones`
- `/dashboard-v3/missions`
- `/dashboard-v3/missions-v2` *(feature flag)*
- `/dashboard-v3/missions-v3` *(feature flag)*
- `/dashboard-v3/dquest`
- `/dashboard-v3/rewards`
- `/editor`
- `/pricing`
- `/subscription`
- `/settings/billing` (alias de subscription)
- `/premium` (alias de subscription)

### 1.2 Flujos relacionados (después de acciones post-login)
- `/billing/success`
- `/billing/cancel`
- `/intro-journey`
- `/premium-timeline` *(demo)*

### 1.3 Área admin (si aplica permiso)
- `/admin`
- `/admin/taskgen`
- `/admin/feedback-manager`
- `/admin/users/:userId/taskgen`

---

## 2) Inventario de UI superpuesta (modales/popups/sheets/drawers/toasts)

## 2.1 Dentro de dashboard-v3
- `DashboardMenu` (overlay de menú)
- `ReminderSchedulerDialog`
- `DailyQuestModal`
- `WeeklyWrappedModal`
- `NotificationPopup` (feedback de racha / level up)
- `JourneyReadyModal`
- `ModerationEditSheet`
- `ModerationOnboardingSuggestion`
- `TaskInsightsModal` (detalle en panel de rachas)
- `ClaimModal` (misiones v2/v3)
- `PlanChip` popover/modal (estado de plan)
- iOS quick-access instructions modal (desde menú)
- `ToastBanner` (varios puntos de dashboard/misiones)

## 2.2 Dentro de Editor
- `CreateTaskModal`
- `EditTaskModal`
- `DeleteTaskModal`
- `ToastBanner` (feedback de acciones)

## 2.3 Dentro de Admin
- `JobLogsDrawer`

---

## 3) Checklist obligatorio para cambios globales

Cuando la tarea diga algo como “cambiar todo después del login”, revisar este checklist **en orden**:

1. **Rutas protegidas**
   - Confirmar impacto en dashboard + subrutas + editor + pricing/subscription.
2. **UI superpuesta**
   - Revisar menús, modales, popups, sheets, drawers y toasts.
3. **Feedbacks/eventos del usuario**
   - Rachas, level up, wrapped semanal, errores de carga.
4. **Alias/rutas duplicadas**
   - Verificar paths equivalentes (`/premium`, `/settings/billing`, alias dashboard).
5. **Flags y variantes**
   - Revisar ramas con feature flags (`missions-v2`, `missions-v3`, toggles de paneles).
6. **ES/EN + consistencia de copy**
   - Detectar textos hardcodeados y asegurar estrategia de idioma.
7. **QA visual mínima**
   - Navegación por rutas + apertura de overlays clave.
8. **Telemetría/trackeo**
   - Validar que feedback popups/events no se rompan.

---

## 4) Tabla viva de mantenimiento

> Regla: **cada vez que se crea una pantalla/modal/popup post-login, se agrega acá en el mismo PR**.

| Tipo | Ruta/Contexto | Componente/archivo base | Estado | Última revisión |
|---|---|---|---|---|
| Sección | `/dashboard-v3` | `pages/DashboardV3.tsx` | Activo | 2026-03-06 |
| Sección | `/dashboard-v3/misiones` | `pages/DashboardV3.tsx` + `dashboardSections.tsx` | Activo | 2026-03-06 |
| Sección | `/dashboard-v3/dquest` | `pages/DashboardV3.tsx` | Activo | 2026-03-06 |
| Sección | `/dashboard-v3/rewards` | `pages/DashboardV3.tsx` | Activo | 2026-03-06 |
| Sección | `/editor` | `pages/editor/index.tsx` | Activo | 2026-03-06 |
| Sección | `/pricing` | `pages/Pricing.tsx` | Activo | 2026-03-06 |
| Sección | `/subscription` (+ aliases) | `pages/Subscription.tsx` + `App.tsx` | Activo | 2026-03-06 |
| Modal | Dashboard | `components/DailyQuestModal.tsx` | Activo | 2026-03-06 |
| Dialog | Dashboard | `components/dashboard-v3/ReminderSchedulerDialog.tsx` | Activo | 2026-03-06 |
| Modal | Dashboard | `components/feedback/WeeklyWrappedModal.tsx` | Activo | 2026-03-06 |
| Popup | Dashboard | `components/feedback/NotificationPopup.tsx` | Activo | 2026-03-06 |
| Modal | Dashboard | `components/dashboard-v3/JourneyReadyModal.tsx` | Activo | 2026-03-06 |
| Sheet | Dashboard | `components/dashboard-v3/ModerationEditSheet.tsx` | Activo | 2026-03-06 |
| Modal | Dashboard | `components/dashboard-v3/ModerationOnboardingSuggestion.tsx` | Activo | 2026-03-06 |
| Modal | Dashboard | `components/dashboard-v3/StreakTaskInsightsModal.tsx` | Activo | 2026-03-06 |
| Modal | Dashboard Misiones | `components/dashboard-v3/MissionsV2Board.tsx` (ClaimModal) | Activo | 2026-03-06 |
| Modal | Dashboard Misiones | `components/dashboard-v3/MissionsV3Board.tsx` (ClaimModal) | Activo | 2026-03-06 |
| Popover | Dashboard | `components/dashboard-v3/PlanChip.tsx` | Activo | 2026-03-06 |
| Overlay | Dashboard | `components/dashboard-v3/DashboardMenu.tsx` | Activo | 2026-03-06 |
| Infra | Post-login global | `apps/web/src/i18n/postLoginLanguage.tsx` | Activo | 2026-03-08 |
| Modal | Dashboard Menu iOS | `components/dashboard-v3/DashboardMenu.tsx` (quick access) | Activo | 2026-03-06 |
| Modal | Editor | `pages/editor/index.tsx` (CreateTaskModal) | Activo | 2026-03-06 |
| Modal | Editor | `pages/editor/index.tsx` (EditTaskModal) | Activo | 2026-03-06 |
| Modal | Editor | `pages/editor/index.tsx` (DeleteTaskModal) | Activo | 2026-03-06 |
| Drawer | Admin | `components/admin/taskgen/JobLogsDrawer.tsx` | Activo | 2026-03-06 |

---

## 5) Protocolo de actualización (para el agente)

Cada vez que se toque UI post-login:

1. Revisar si se creó/renombró una ruta protegida o alias.
2. Revisar si se agregó una UI superpuesta nueva.
3. Actualizar la tabla de la sección 4 en el mismo PR.
4. Si hay copy visible al usuario, marcar si impacta ES/EN.
5. En el resumen del PR, incluir una línea: **"Updated post-login map"**.

Último cambio global registrado: rollout base i18n ES/EN post-login (detección + selector manual en menú).

---

## 6) Nota de uso rápido

Si el pedido es amplio (“cambiá todo post-login”), usar este orden de ejecución:

1. `App.tsx` (entry de rutas)
2. `pages/DashboardV3.tsx` + `pages/dashboardSections.tsx`
3. `pages/editor/index.tsx`
4. `pages/Pricing.tsx` + `pages/Subscription.tsx`
5. Componentes de overlays en dashboard/editor/admin
6. QA por ruta + modales críticos
