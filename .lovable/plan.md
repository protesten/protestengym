

## Plan: Drop Sets, Repeticiones Parciales y Corrección de Ejercicios por Tiempo

### 1. Nuevos tipos de serie: Drop Set y Parcial

**Migración SQL**: Añadir dos valores al enum `set_type`:
```sql
ALTER TYPE public.set_type ADD VALUE 'drop_set';
ALTER TYPE public.set_type ADD VALUE 'partial';
```

**`src/lib/constants.ts`**: Actualizar `SetType`, `SET_TYPE_LABELS` y `PlannedSet`:
- `SetType` → añadir `'drop_set' | 'partial'`
- `SET_TYPE_LABELS` → `drop_set: 'Drop Set'`, `partial: 'Parcial'`

**`src/pages/SessionDetail.tsx`**: Actualizar `SET_TYPE_CHIPS` y `SET_TYPE_ORDER`:
- `drop_set: { label: 'D', color: 'bg-purple-400/20 text-purple-400' }`
- `partial: { label: 'P', color: 'bg-yellow-400/20 text-yellow-400' }`
- Añadir ambos al array de ciclo

**`src/pages/RoutineDetail.tsx`**: Los selects de `PlannedSetRow` ya usan `SET_TYPE_LABELS` dinámicamente, así que se actualizarán automáticamente.

### 2. Corrección de ejercicios por tiempo en rutinas

El problema está en `PlannedSetRow` (RoutineDetail): cuando el `trackingType` es `time_only`, los inputs de tiempo se muestran correctamente pero la fila se desborda horizontalmente por tener demasiados elementos en una línea (set type select + RPE select + time inputs + delete button).

**Solución**: Reorganizar `PlannedSetRow` para que en ejercicios de tiempo/distancia use un layout de 2 filas (wrap) en lugar de una sola línea. Aplicar `flex-wrap` y ajustar anchos para que todo quepa en móvil.

También verificar que `getDefaultPlannedSet('time_only')` genera valores correctos (ya lo hace: `min_time_seconds: 30, max_time_seconds: 60`).

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | `ALTER TYPE set_type ADD VALUE 'drop_set'` y `'partial'` |
| `src/lib/constants.ts` | Ampliar `SetType` y `SET_TYPE_LABELS` |
| `src/pages/SessionDetail.tsx` | Añadir chips para drop_set y partial |
| `src/pages/RoutineDetail.tsx` | Aplicar `flex-wrap` en `PlannedSetRow` para mejorar layout en móvil |

