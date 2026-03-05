

## Protección de Ejercicios antes de Eliminar

### Problema
Al eliminar un ejercicio, se pueden romper datos históricos en `session_exercises`, `routine_exercises` y los análisis que dependen de ellos. No hay advertencia al usuario.

### Solución

**1. `src/lib/api.ts`** — Nueva función `getExerciseUsage(exerciseId)`:
- Query a `session_exercises` contando cuántas sesiones lo usan
- Query a `routine_exercises` contando cuántas rutinas lo usan
- Retorna `{ sessionCount, routineCount }`

**2. `src/pages/Exercises.tsx`** — Reemplazar el botón de eliminar directo por un flujo con AlertDialog:
- Al pulsar eliminar, llamar a `getExerciseUsage`
- Si no tiene uso → AlertDialog simple: "¿Eliminar ejercicio?"
- Si tiene uso → AlertDialog detallado con:
  - Info: "Este ejercicio se usa en X sesiones y Y rutinas"
  - Opción 1: **"Eliminar todo"** — Borra el ejercicio y en cascada los datos relacionados
  - Opción 2: **"Cancelar"**
  - Advertencia: "Se perderán los datos históricos de este ejercicio en análisis y sesiones"

**3. Base de datos** — Migración para añadir `ON DELETE CASCADE` en las foreign keys de `session_exercises.exercise_id` y `routine_exercises.exercise_id` (si no lo tienen ya), para que al borrar el ejercicio se limpien las referencias automáticamente.

### Archivos afectados

| Archivo | Acción |
|---|---|
| `src/lib/api.ts` | Nueva función `getExerciseUsage` |
| `src/pages/Exercises.tsx` | AlertDialog con advertencia antes de eliminar |
| Migración SQL | Asegurar CASCADE en foreign keys |

