# Editor de tareas

El editor vive dentro de la aplicación web (`apps/web`) y está disponible en la ruta protegida `/editor`. Esta pantalla reutiliza la navegación del dashboard y comparte estilos con el resto del proyecto.

## Rutas relevantes

- `/editor`: renderiza `TaskEditorPage`, incluyendo filtros, lista de tareas y los modales de creación/edición/eliminación.
- `/dashboard-v3`: redirige cuando el usuario sale del editor mediante la navegación global.

## Componentes principales

- `TaskList`: imprime tarjetas individuales con estado, métricas y accesos directos para editar o eliminar. Exportado desde `pages/editor/index.tsx` para facilitar pruebas.
- `CreateTaskModal`: flujo guiado para crear misiones personalizadas. Valida pilar, rasgo, título y usuario antes de enviar.
- `EditTaskModal`: permite actualizar título, dificultad, notas y estado. Los campos de Pilar/Rasgo/Stat permanecen solo lectura por decisión de producto.
- `DeleteTaskModal`: cuadro de confirmación con protección al cerrar mientras hay una operación en curso.
- `TaskFilters`, `TaskListEmpty`, `TaskListError`: utilidades internas para búsqueda y estados vacíos.

## Hooks públicos

- `useUserTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`: encapsulan el store con optimismos y telemetría.
- `useBackendUser`: resuelve el `userId` de backend a partir de Clerk y expone recarga segura.
- `usePillars`, `useTraits`, `useStats`, `useDifficulties`: exponen catálogos normalizados con manejo de estados `idle/loading/success/error`.

## Decisiones clave

- **Pilar, Rasgo y Stat son inmutables** en la edición para evitar inconsistencias con la misión original; el modal comunica la restricción y solo permite ajustar metadatos.
- Se usan actualizaciones optimistas para crear/editar/eliminar, con rollbacks automáticos ante errores.
- Los catálogos se aíslan en hooks que reutilizan `useRequest`, lo que permite deshabilitar peticiones hasta que exista un identificador válido (por ejemplo, esperar a que se elija un pilar antes de buscar rasgos).
- El editor depende de Clerk; para entornos de prueba existe un mock (`src/testSupport/mockClerk.tsx`) habilitable mediante `MOCK_CLERK=true`.
