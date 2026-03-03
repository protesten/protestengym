

## Plan: Sistema completo de progreso

Se ampliará la página de Análisis con las 4 funcionalidades solicitadas, añadiendo nuevas pestañas y funciones de cálculo.

---

### 1. Historial por ejercicio

En la pestaña "Ejercicio" actual, debajo de las comparativas, añadir una sección **"Historial"** que muestre una lista cronológica descendente de todas las sesiones donde se usó ese ejercicio, con:
- Fecha de la sesión
- Resumen de series work (ej: "3×80kg×10", "5×12 reps", "3×60s")
- Métrica total (volumen, reps o tiempo)

**Archivo**: `src/db/calculations.ts` — nueva función `getExerciseHistory(exerciseId, trackingType)` que devuelve un array de `{ date, sessionId, sets: WorkoutSet[], totalMetric }`.

**Archivo**: `src/pages/Analysis.tsx` — renderizar la lista bajo las ComparisonRows.

---

### 2. Récords personales (PRs)

Añadir una nueva pestaña **"PRs"** al TabsList.

Funciones en `src/db/calculations.ts`:
- `getPersonalRecords()` — recorre todos los ejercicios y calcula PRs según tracking_type:
  - `weight_reps`: peso máximo en una serie, mayor volumen en una serie (peso×reps)
  - `reps_only`: máximo reps en una serie
  - `time_only`: máximo duración en una serie
  - `distance_time`: máxima distancia, máximo tiempo
- Devuelve para cada PR: valor, fecha, nombre del ejercicio

UI: lista de ejercicios con sus PRs, mostrando valor y fecha.

---

### 3. Gráficos de evolución

En la pestaña "Ejercicio", debajo del historial, añadir un gráfico lineal usando **recharts** (ya instalado) que muestre la métrica total por sesión a lo largo del tiempo.

- Eje X: fechas de las sesiones
- Eje Y: métrica (volumen, reps, tiempo según tracking_type)
- Línea simple con puntos

Se reutilizará la data de `getExerciseHistory`.

---

### 4. Resumen semanal/mensual

Nueva pestaña **"Resumen"** que muestre una tabla con:
- Filas por semana (últimas 8 semanas) o por mes (últimos 6 meses), seleccionable con toggle
- Columnas: período, nº sesiones, volumen fuerza total, tiempo isométrico, tiempo cardio
- Barra de progreso visual comparando con el mejor período

Función en `src/db/calculations.ts`: `getPeriodSummaries(granularity: 'week' | 'month')` que agrupa sesiones por período.

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/db/calculations.ts` | Añadir `getExerciseHistory`, `getPersonalRecords`, `getPeriodSummaries` |
| `src/pages/Analysis.tsx` | Añadir pestañas PRs y Resumen, historial + gráfico en pestaña Ejercicio |

### Estructura de pestañas resultante

```text
[ Ejercicio | Músculo | Sesión | PRs | Resumen ]
```

