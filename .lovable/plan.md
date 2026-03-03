

## Plan: Ejercicios predefinidos + gestión de administración

### Concepto

Crear una tabla `predefined_exercises` separada de `exercises`. Los predefinidos son visibles para todos los usuarios (SELECT público), pero solo tú (admin) puedes crearlos/editarlos/eliminarlos. Los usuarios siguen creando sus ejercicios personales en la tabla `exercises` existente. Al seleccionar ejercicios (en rutinas, sesiones), se muestran ambos: predefinidos + personales.

### Fase 1: Base de datos

**Nueva tabla `predefined_exercises`** con la misma estructura que `exercises` pero sin `user_id`:
- `id` (uuid), `name` (text, unique), `tracking_type` (tracking_type enum), `primary_muscle_ids` (int[]), `secondary_muscle_ids` (int[]), `created_at`

**RLS**:
- SELECT: público para usuarios autenticados (`true`)
- INSERT/UPDATE/DELETE: restringido a admin vía función `has_role`

**Sistema de roles** (tabla `user_roles` con enum `app_role`):
- Crear enum `app_role` ('admin', 'user')
- Crear tabla `user_roles` (user_id, role) con RLS
- Función `has_role(uuid, app_role)` security definer
- Asignar rol admin a tu usuario

**Insertar los ~45 ejercicios predefinidos únicos** (deduplicados de la lista proporcionada) con sus muscle_ids mapeados a la tabla `muscles`.

### Fase 2: API

Añadir a `src/lib/api.ts`:
- `getPredefinedExercises()` — SELECT de `predefined_exercises`
- `createPredefinedExercise()`, `updatePredefinedExercise()`, `deletePredefinedExercise()` — CRUD admin
- `getAllExercises()` — combina predefinidos + personales para selección en rutinas/sesiones
- `isAdmin()` — consulta `user_roles`

### Fase 3: UI

**Página Ejercicios (`Exercises.tsx`)**:
- Añadir tabs o secciones: "Predefinidos" y "Mis ejercicios"
- Los predefinidos muestran badge "Predefinido" y solo son editables/eliminables si el usuario es admin
- Los personales funcionan como ahora
- Admin ve botones de crear/editar/eliminar en predefinidos

**Selección de ejercicios** (en RoutineDetail, SessionDetail):
- Mostrar ambas listas (predefinidos + personales) al añadir ejercicio, agrupados

### Fase 4: Mapeo de músculos para los ejercicios

Mapear cada ejercicio de la lista a los IDs de la tabla `muscles` existente. Algunos músculos mencionados (como "psoas ilíaco", "lumbares") no existen en la tabla actual, por lo que se añadirán a la tabla `muscles`.

**Músculos nuevos a insertar**: Psoas ilíaco, Erectores lumbares (o usar Erectores espinales id:12 como equivalente).

### Archivos afectados

| Acción | Archivo |
|---|---|
| Migración SQL | Nueva tabla, roles, seed de ejercicios |
| Modificar | `src/lib/api.ts` — nuevas funciones |
| Modificar | `src/pages/Exercises.tsx` — tabs predefinidos/personales, lógica admin |
| Modificar | `src/pages/RoutineDetail.tsx` — mostrar ambos tipos al seleccionar |
| Modificar | `src/pages/SessionDetail.tsx` — igual |

