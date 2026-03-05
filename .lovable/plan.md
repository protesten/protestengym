

## Rediseño visual de la vista de sesión de entrenamiento

Basándome en la imagen de referencia, el objetivo es reducir ruido visual y mejorar la jerarquía de información.

### Cambios principales

| Cambio | Descripción |
|---|---|
| **Barra de progreso** | Añadir barra horizontal en la parte superior que muestra el progreso (ejercicios con series registradas / total ejercicios) |
| **Header simplificado** | Fecha a la izquierda, solo iconos de compartir y eliminar sesión a la derecha. Mover CSV/duplicar/descargar al menú de compartir o eliminarlos del header |
| **Notas como input inline** | Cambiar el botón de notas por un `Input` placeholder "Notas..." siempre visible, más limpio |
| **Ejercicio activo destacado** | El ejercicio expandido muestra un card con borde más prominente. Encabezados de sección: "OBJETIVO DE SESIÓN" y "REGISTRO DE SERIES" como labels uppercase pequeñas |
| **Ejercicios colapsados compactos** | Los ejercicios no expandidos muestran: nombre + badge de objetivo (peso×reps) en una línea, sin acordeón pesado |
| **Sección "SIGUIENTES EJERCICIOS"** | Los ejercicios sin series registradas aparecen listados al final en una sección separada con iconos de acción inline (copiar, completar, info) |
| **Botón "+ Serie" más prominente** | Estilo filled con gradiente primario en vez de outline dashed |

### Archivo afectado

| Archivo | Acción |
|---|---|
| `src/pages/SessionDetail.tsx` | Reestructurar el render: header, progreso, ejercicio activo, colapsados, siguientes |

### Estructura visual resultante

```text
┌─────────────────────────────────┐
│ ████████████████░░░░  (progreso)│
│ 2026-03-05 📅        🔗  🗑    │
│ [Notas...                     ] │
├─────────────────────────────────┤
│ ┌─ Ejercicio Activo ──────────┐ │
│ │ Hip Thrust...    🎥 📋 ⚙ ⋮ │ │
│ │ Prev: 85kg×12, 11           │ │
│ │                             │ │
│ │ OBJETIVO DE SESIÓN          │ │
│ │ Hipertrofia: 91.5kg (8-12)  │ │
│ │                             │ │
│ │ REGISTRO DE SERIES          │ │
│ │ [T] 91.5 kg  10 reps  Máx  │ │
│ │ [T] 91.5 kg  10 reps  Máx  │ │
│ │ [══ + Serie ══════════════] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ▿ Sentadilla hack...           │
│   🔥 51kg · 8-12r              │
│                                 │
│ ▿ Prensa inclinada...          │
│   🔥 16.5kg · 8-12r            │
│                                 │
│ SIGUIENTES EJERCICIOS           │
│ 2. Curl femoral...    📋 ✅ ℹ  │
│ 3. Sentadilla hack... 📋 ⚠ ℹ  │
└─────────────────────────────────┘
```

### Detalles de implementación

- **Barra de progreso**: calcular `completedCount` (ejercicios con ≥1 serie con datos) vs `total` y renderizar un `<Progress>` de radix
- **Ejercicios divididos en 3 grupos**: activo (expandido, el primero sin completar o el que el usuario toque), colapsados (con series), y "siguientes" (sin series aún)
- **Header**: reducir a 2 iconos (share, delete). El resto se agrupa en un dropdown o se quita
- **Notas**: `Input` directo con `onBlur` para guardar, sin estado de edición separado
- Se mantiene toda la lógica existente de sets, mutations, PR detection, offline queue

