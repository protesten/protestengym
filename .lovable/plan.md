

## Rediseño de la Pantalla de Sesión de Entrenamiento

### Problemas identificados
1. La UI está saturada: cada fila de serie muestra badges de RPE pautado (@10), rangos pautados (10-15r), selector de tipo de serie, delta badges, todo en una línea — demasiada información visual.
2. La `WarmupCalculator` se reemplaza por una calculadora de peso sugerido basada en histórico.
3. Los datos de sesión anterior no cargan correctamente — la query `getPreviousSetsForExercise` usa `.order('sessions(date)')` que puede fallar en Supabase (ordering by joined table).
4. La referencia de sesión anterior ocupa mucho espacio vertical.

### Cambios propuestos

**1. Simplificar `SetRow`** (`SessionDetail.tsx`)
- Eliminar `PlannedRangeBadge` completamente (los rangos pautados ya están como placeholder en los inputs).
- Eliminar el badge de RPE pautado (`@10` naranja) — el RPE pautado se muestra solo como placeholder en el selector.
- Eliminar los `DeltaBadge` inline por serie (las flechas de tendencia). Mantener solo el borde lateral de color como indicador.
- Hacer el selector de tipo de serie más compacto: en vez de dropdown, usar un chip de texto corto ("T" para Trabajo, "C" para Calentamiento, "A" para Aproximación) con un tap para ciclar entre tipos.
- Resultado: cada fila tiene solo `[chip tipo] [input peso] [input reps] [RPE selector] [🗑️]` — mucho más limpio.

**2. Compactar la referencia de sesión anterior** (`PreviousSessionReference.tsx`)
- Cambiar de lista vertical a una línea resumen compacta por serie, inline debajo del header del ejercicio, tipo: `Anterior (4 mar): 80kg×12, 85kg×10, 85kg×8`.
- Ocupar una sola línea en vez del bloque actual.

**3. Reemplazar `WarmupCalculator` por `WeightSuggestion`**
- Eliminar `WarmupCalculator` del proyecto.
- Crear un nuevo componente que, dado el ejercicio y su historial, sugiera el peso para la siguiente serie usando la media de las últimas sesiones.
- Mostrar como un icono de "calculadora" que al pulsar muestra un popover con el peso sugerido y un botón para aplicarlo al input.

**4. Fix carga de datos de sesión anterior**
- El query actual usa `.order('sessions(date)', { ascending: false })` que puede no funcionar correctamente. Cambiar a un approach más fiable: buscar las session_exercises del ejercicio, hacer join con sessions para obtener la fecha, y ordenar por fecha en el lado del cliente, o usar un sub-select/RPC.

**5. Simplificar header de ejercicio**
- Reducir los botones de reordenar (▲▼) a solo iconos más pequeños o swipe.
- Agrupar los iconos de acción (notas, peso sugerido, eliminar) de forma más compacta.

**6. Eliminar archivo `WarmupCalculator.tsx`**

### Archivos afectados

| Archivo | Acción |
|---|---|
| `src/pages/SessionDetail.tsx` | Rediseño mayor: simplificar SetRow, eliminar badges, nuevo layout compacto |
| `src/components/PreviousSessionReference.tsx` | Formato compacto en una línea |
| `src/components/WarmupCalculator.tsx` | Eliminar |
| `src/components/WeightSuggestion.tsx` | Nuevo: calculadora de peso basada en historial |
| `src/lib/api.ts` | Fix query de sesión anterior + nueva función para historial de pesos |

