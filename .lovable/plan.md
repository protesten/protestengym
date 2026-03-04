

## Sistema Inteligente de Recomendación de Peso por Objetivo

### Concepto

Reemplazar el `WeightSuggestion` actual (que solo muestra media/máximo) por un sistema basado en 1RM que calcule pesos objetivo según el enfoque de entrenamiento (Fuerza/Hipertrofia/Resistencia), integre peso corporal para ejercicios de bodyweight, y dé feedback inteligente basado en RPE al completar series.

### Cambios

**1. DB Migration: Añadir `training_goal` a `routines` y `program_weeks`**

- `routines.training_goal` (text, nullable, default null): `'strength'` | `'hypertrophy'` | `'endurance'`
- `program_weeks.training_goal` (text, nullable, default null): mismo enum
- Esto permite definir el objetivo a nivel de rutina o semana del programa

**2. `src/lib/constants.ts`**: Añadir constantes de objetivos

```typescript
export type TrainingGoal = 'strength' | 'hypertrophy' | 'endurance';
export const TRAINING_GOALS: Record<TrainingGoal, { label: string; pct: number; reps: string }> = {
  strength: { label: 'Fuerza', pct: 0.85, reps: '3-5' },
  hypertrophy: { label: 'Hipertrofia', pct: 0.75, reps: '8-12' },
  endurance: { label: 'Resistencia', pct: 0.60, reps: '15+' },
};
```

**3. `src/lib/api.ts`**: Nuevas funciones
- `get1RMForExercise(exerciseId)`: obtener el mejor 1RM histórico usando Epley (ya existe `calculate1RM` en calculations.ts, reusar)
- `getLatestBodyWeight()`: obtener el último `weight_kg` de `body_measurements`

**4. `src/components/WeightSuggestion.tsx`**: Rediseñar completamente

Reemplazar el popover simple por un sistema que:
- Calcule 1RM del ejercicio desde historial
- Muestre peso objetivo según el goal de la sesión (Fuerza/Hipertrofia/Resistencia)
- Para ejercicios de peso corporal (`reps_only` con flag o detección por nombre: dominadas, flexiones, fondos): sume peso corporal al cálculo y reste para dar el lastre
- Muestre el peso objetivo directamente en la tarjeta del ejercicio (no solo en popover)

**5. `src/components/RPEFeedback.tsx`** (nuevo)

Componente que aparece tras registrar RPE en una serie:
- RPE ≤ 7: mensaje verde "Muy fácil. Sube un 5% en la próxima sesión" + peso sugerido
- RPE 8-9: mensaje amarillo "Carga óptima. Mantén o sube un 2%"
- RPE 10: mensaje rojo "Límite alcanzado. Mantén este peso hasta dominar la técnica"
- Aparece como un toast o inline debajo de la serie

**6. `src/pages/SessionDetail.tsx`**: Integración

- Mostrar peso objetivo encima de las series de cada ejercicio (badge visible antes de escribir datos)
- Tras actualizar RPE de una serie, mostrar el feedback inteligente
- Pasar el `training_goal` de la rutina/sesión al cálculo

**7. `src/pages/RoutineDetail.tsx`**: Selector de objetivo

- Añadir selector de `training_goal` en la cabecera de la rutina (Fuerza/Hipertrofia/Resistencia)
- Guardar en DB

**8. `src/pages/Programs.tsx`**: Selector por semana (si aplica)

- En la vista de programa, permitir asignar goal por semana

### Lógica de Cálculo

```
1RM = mejor (peso × (1 + reps/30)) del historial
Peso objetivo = 1RM × %goal

Para bodyweight (dominadas, fondos, flexiones):
  1RM_total = (peso_corporal + lastre) × (1 + reps/30)
  peso_objetivo_total = 1RM_total × %goal
  lastre_sugerido = peso_objetivo_total - peso_corporal
```

### Archivos afectados

| Archivo | Acción |
|---|---|
| DB `routines`, `program_weeks` | Migración: añadir `training_goal` |
| `src/lib/constants.ts` | Tipos y constantes de goals |
| `src/lib/api.ts` | `get1RMForExercise`, `getLatestBodyWeight` |
| `src/components/WeightSuggestion.tsx` | Rediseño completo con 1RM + goals |
| `src/components/RPEFeedback.tsx` | Nuevo: feedback inteligente post-RPE |
| `src/pages/SessionDetail.tsx` | Mostrar peso objetivo + integrar RPE feedback |
| `src/pages/RoutineDetail.tsx` | Selector de training_goal |

