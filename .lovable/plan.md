

## Problema: Análisis de Músculos extremadamente lento

### Causa raíz

La función `getMuscleComparisons` en `src/db/calculations.ts` (línea 140) itera sobre **cada músculo × cada ejercicio** y llama a `exerciseMetricInRange` para cada combinación. Esa función a su vez hace **3 queries secuenciales** a la base de datos (sessions → session_exercises → sets). Con ~50 músculos y ~30 ejercicios, esto genera **miles de queries secuenciales** a la DB.

El mismo patrón afecta a `getPersonalRecords`, `getAll1RMs`, `get1RMHistory` y `getPeriodSummaries` — todas hacen queries individuales dentro de bucles `for`.

### Solución: Batch-fetch y cómputo en memoria

Refactorizar `src/db/calculations.ts` para que todas las funciones pesadas hagan **máximo 4-5 queries totales** y computen todo en memoria:

1. **`getMuscleComparisons`** — En vez de N×M queries:
   - 1 query: muscles
   - 1 query: exercises (ya cacheado)
   - 1 query: sessions en el rango total (curr + prev)
   - 1 query: session_exercises de esas sesiones
   - 1 query: sets de esos session_exercises
   - Luego agrupar y calcular todo en JS

2. **`getPersonalRecords`** — Mismo patrón: fetch all sessions → all session_exercises → all sets en 3 queries, luego agrupar por ejercicio en memoria.

3. **`getAll1RMs`** — Mismo batch-fetch.

4. **`get1RMHistory`** — Batch-fetch sessions + session_exercises + sets para el ejercicio.

5. **`getPeriodSummaries`** — Fetch all sessions del rango completo (8 semanas o 6 meses) de una vez, con sus session_exercises y sets. Agrupar por período en memoria.

6. **`getExerciseComparisons`** — Refactorizar `exerciseMetricInRange` para que reciba datos pre-fetched en vez de hacer queries propias.

7. **Helper `prefetchSessionData`** — Nueva función que hace el batch-fetch reutilizable:
   ```typescript
   async function prefetchSessionData(dateFrom: string, dateTo: string) {
     // 3 queries total: sessions, session_exercises, sets
     // Returns maps indexed for fast lookup
   }
   ```

### Archivos afectados

| Archivo | Acción |
|---|---|
| `src/db/calculations.ts` | Refactorizar todas las funciones de análisis para usar batch-fetch |

No se necesitan migraciones ni cambios de UI — solo optimización de queries.

