## Evolución de Fuerza Relativa — Nueva sección en Análisis

### Concepto

Nueva pestaña "F. Relativa" en la página de Análisis que muestra el ratio 1RM/Peso Corporal a lo largo del tiempo, con filtro por ejercicio, tarjeta de "Top Ratio Histórico" e interpretación del Coach IA.

### Cambios

**1. `src/db/calculations.ts**` — Nueva función `getRelativeStrengthHistory`:

- Recibe `exerciseId` y `DateRange` opcional
- Reutiliza `prefetchSessionData` + query a `body_measurements` (último `weight_kg` por fecha)
- Para cada sesión del ejercicio, calcula `best1RM / bodyWeight` del día más cercano
- Retorna `{ date, ratio, estimated1RM, bodyWeight }[]` y `topRatio` con el máximo histórico
- Todo en 4-5 queries máximo (ya batch-fetched), cómputo en memoria con `useMemo` en el componente

**2. `src/components/RelativeStrengthPanel.tsx**` — Nuevo componente:

- Selector de ejercicio (solo `weight_reps`)
- `useMemo` para recalcular el ratio al cambiar de ejercicio (instantáneo)
- Gráfico de líneas: eje Y = ratio, eje X = fechas
- Tarjeta "Top Ratio Histórico" (ej: "En Press Banca mueves 1.8× tu peso corporal")
- Interpretación IA: texto condicional basado en tendencia del ratio vs peso corporal:
  - Ratio sube + peso baja/estable → mensaje positivo
  - Ratio baja → mensaje de alerta

**3. `src/pages/Analysis.tsx**` — Añadir nueva pestaña "F.Relativa" en el TabsList (grid pasa a 5 columnas en la segunda fila o se ajusta)

### Lógica de interpretación IA (in-component, sin llamada a edge function)

```typescript
// Comparar primer y último punto del gráfico
const first = data[0], last = data[data.length - 1];
const ratioTrend = last.ratio - first.ratio;
const weightTrend = last.bodyWeight - first.bodyWeight;

if (ratioTrend > 0 && weightTrend <= 0) → "¡Eficiencia brutal!..."
if (ratioTrend < 0) → "Ojo, tu peso está subiendo..."
```

4. quita la pestaña racha del análisis ya que la tenemos en el inicio.

&nbsp;

### Archivos afectados


| Archivo                                    | Acción                                     |
| ------------------------------------------ | ------------------------------------------ |
| `src/db/calculations.ts`                   | Nueva función `getRelativeStrengthHistory` |
| `src/components/RelativeStrengthPanel.tsx` | Nuevo componente completo                  |
| `src/pages/Analysis.tsx`                   | Añadir pestaña + import                    |
