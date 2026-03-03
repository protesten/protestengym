

## Plan: Series pautadas en plantillas + RPE + Rango de repeticiones

### Resumen

Tres cambios principales:
1. **Series pautadas en rutinas**: Cada ejercicio en una plantilla puede tener series pre-configuradas con tipo, RPE objetivo y rango de repeticiones
2. **RPE en series de sesión**: Campo RPE (1-10) en cada serie durante el entrenamiento
3. **Rango de repeticiones**: Las series pautadas definen un rango (ej: 8-12, 6-8) que se muestra como referencia durante el entreno

### Base de datos (2 migraciones)

**1. `routine_exercises` — nueva columna `planned_sets`** (jsonb, default `'[]'`):
```
[{ "set_type": "work", "rpe": 8, "min_reps": 8, "max_reps": 12 }, ...]
```

**2. `sets` — nueva columna `rpe`** (numeric, nullable)

### Cambios en código

| Archivo | Cambio |
|---|---|
| `src/lib/api.ts` | `addRoutineExercise` acepta `planned_sets`. `createSet` acepta `set_type` y `rpe`. |
| `src/lib/constants.ts` | Escala RPE labels (opcional) |
| `src/pages/RoutineDetail.tsx` | Expandir cada ejercicio para mostrar/editar series pautadas: botón añadir serie, tipo (select), RPE (select 1-10), rango reps (min-max inputs). Guardar como jsonb en `planned_sets`. |
| `src/pages/SessionDetail.tsx` | Añadir select RPE (1-10) en `SetRow`. Mostrar rango de reps pautado como placeholder/referencia si la sesión viene de rutina. |
| `src/pages/NewSession.tsx` | Al crear sesión desde rutina, leer `planned_sets` de cada `routine_exercise` y crear los sets con `set_type` y `rpe` del plan. |

### Flujo de uso

1. **Plantilla**: "Press banca → Serie 1: Trabajo, RPE 8, 8-12 reps / Serie 2: Trabajo, RPE 9, 6-8 reps"
2. **Iniciar sesión desde rutina**: Se crean automáticamente 2 sets con tipo, RPE y el rango como referencia
3. **Durante entreno**: El usuario rellena peso/reps reales, ajusta RPE si quiere, y puede añadir/quitar series extra

### UI en RoutineDetail (diseño)

Cada ejercicio se expande para mostrar sus series pautadas:
```text
┌─────────────────────────────────────┐
│ 1  Press banca inclinado    ▲ ▼ 🗑  │
│  ┌──────────────────────────────┐   │
│  │ S1: Trabajo  RPE 8  8-12rep │ 🗑 │
│  │ S2: Trabajo  RPE 9  6-8rep  │ 🗑 │
│  │ S3: Aprox.   RPE 6  10-12   │ 🗑 │
│  │       [+ Añadir serie]      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### UI en SessionDetail — SetRow con RPE

Cada fila de serie añade un select compacto de RPE al final:
```text
[Trabajo ▼] [80 kg] [10 reps] [RPE 8 ▼] 🗑
```

