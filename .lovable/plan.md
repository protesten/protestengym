

## Creación Inline de Ejercicios + Sistema de Músculos Activables

### Concepto

En lugar de crear músculos nuevos, el sistema tendrá una **lista maestra completa de todos los músculos posibles** ya en la base de datos. Los músculos estarán **deshabilitados por defecto** y el usuario podrá **activarlos** cuando los necesite para un ejercicio. El heatmap SVG solo mostrará músculos activos (los que aparecen en al menos un ejercicio del usuario o en predefinidos).

### Cambios

**1. DB Migration: Ampliar tabla `muscles`**

Añadir columnas a `muscles`:
- `recovery_category` (text, default `'medium'`): `'fast'` | `'medium'` | `'slow'` — para cálculos de fatiga
- `body_region` (text, nullable): agrupación visual (pecho, espalda, etc.)
- `is_active` (boolean, default `true`): si el músculo está habilitado para uso

Poblar `recovery_category` con los datos actuales de `fatigue-config.ts` (UPDATE masivo para los 49 músculos existentes).

Insertar músculos adicionales comunes que no están en el sistema (ej: Psoas, Supraespinoso, Piriforme, etc.) con `is_active = false`.

Añadir RLS policy para UPDATE por usuarios autenticados (para poder activar/desactivar).

No se necesita INSERT ya que la lista maestra viene precargada.

**2. `src/lib/api.ts`**: Nuevas funciones
- `getActiveMuscles()`: músculos con `is_active = true`
- `getAllMusclesIncludingInactive()`: todos los músculos (para la pantalla de activación)
- `toggleMuscleActive(id, isActive)`: actualizar `is_active`

**3. `src/components/CreateExerciseDialog.tsx`** (nuevo)
- Componente reutilizable con formulario de ejercicio (nombre, tracking type, músculos primarios/secundarios)
- Usado desde `ExerciseSearchSelect` y `Exercises.tsx`
- Props: `open`, `onOpenChange`, `onCreated(exercise)`

**4. `src/components/ExerciseSearchSelect.tsx`**: Añadir "Crear ejercicio"
- Opción al final de la lista / cuando no hay resultados
- Abre `CreateExerciseDialog`
- Auto-selecciona el ejercicio creado y lo añade

**5. `src/components/MuscleSelect.tsx`**: Añadir "Activar más músculos"
- Botón al final de la lista que abre un dialog/panel mostrando músculos inactivos
- Permite activar músculos con un toggle
- Al activar, el músculo aparece disponible en el selector

**6. `src/components/MuscleActivationDialog.tsx`** (nuevo)
- Muestra todos los músculos inactivos agrupados por `body_region`
- Toggle para activar/desactivar
- Muestra info: nombre, categoría de recuperación

**7. `src/lib/fatigue-config.ts`**: Hacer dinámico
- `computeFatigue` acepta un mapa `muscleId → recovery_category` desde la DB
- Fallback a `'medium'` para IDs sin categoría
- Eliminar el hardcoded `MUSCLE_RECOVERY` como fuente principal (mantener como fallback)

**8. `src/components/BodyHeatmap.tsx`**: Filtrar por músculos activos
- Recibir prop `activeMuscleIds: Set<number>` (músculos presentes en ejercicios del usuario)
- Solo renderizar regiones SVG cuyos IDs intersecten con `activeMuscleIds`
- Los SVG paths de los 49 músculos actuales se mantienen hardcodeados (no tiene sentido moverlos a DB)

**9. `src/pages/Fatigue.tsx`**: Adaptar
- Cargar `recovery_category` desde muscles de la DB
- Pasar `activeMuscleIds` al heatmap
- Construir mapa de recovery desde DB en lugar del hardcoded

**10. `src/pages/Exercises.tsx`**: Refactorizar
- Usar `CreateExerciseDialog` compartido en lugar del form inline

### Archivos afectados

| Archivo | Acción |
|---|---|
| DB `muscles` | Migración: columnas + datos + RLS UPDATE |
| `src/lib/api.ts` | Funciones para músculos activos/inactivos |
| `src/lib/fatigue-config.ts` | Recovery dinámico desde DB |
| `src/components/CreateExerciseDialog.tsx` | Nuevo |
| `src/components/MuscleActivationDialog.tsx` | Nuevo |
| `src/components/MuscleSelect.tsx` | Botón "Activar más" |
| `src/components/ExerciseSearchSelect.tsx` | Opción "Crear ejercicio" |
| `src/components/BodyHeatmap.tsx` | Filtrar por activos |
| `src/pages/Fatigue.tsx` | Recovery dinámico + filtro activos |
| `src/pages/Exercises.tsx` | Refactorizar con dialog compartido |

