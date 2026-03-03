

## App de Registro y Análisis de Entrenamientos (MVP Offline)

### Tecnología de almacenamiento
- **Dexie.js** (wrapper sobre IndexedDB) para base de datos local offline-first
- Todas las tablas y relaciones definidas localmente en el navegador
- Sin backend/Supabase — funciona 100% sin internet

### Modelo de datos
Se crearán 7 tablas en IndexedDB siguiendo exactamente el esquema especificado: Muscle (con seed de 11 músculos), Exercise, Routine, RoutineExercise, WorkoutSession, SessionExercise y Set. Validaciones por tracking_type en la capa de UI/servicio.

### Módulo de cálculos
Funciones reutilizables para:
- **work_metric** por ejercicio según tracking_type (solo sets work)
- **Distribución muscular**: primary 100%, secondary +50% adicional; cardio separado
- **Comparativas**: última sesión, 7d vs 7d previos, mes vs mes anterior — con valor actual, anterior, diferencia y flecha ↑↓=

### Pantallas

1. **Home** — 4 botones: Iniciar sesión, Análisis, Rutinas, Ejercicios

2. **Ejercicios** — Lista con búsqueda + CRUD (name, tracking_type, primary/secondary muscle)

3. **Rutinas** — Lista + CRUD. Dentro de cada rutina: añadir ejercicios del catálogo, reordenar con drag o botones ↑↓, eliminar

4. **Iniciar sesión** — Elegir fecha (default hoy) → elegir "Desde rutina" o "Sesión libre"

5. **Sesión en curso** — Lista de ejercicios en accordion. Cada ejercicio muestra sus series con campos dinámicos según tracking_type. Selector de set_type (warmup/approach/work). Guardado inmediato. Botón añadir ejercicio. Resumen inferior: fuerza total, isométricos total, cardio total.

6. **Análisis** con 3 tabs:
   - **Por ejercicio**: selector → comparativas (última sesión, 7d, mes) con flechas
   - **Por músculo**: tabla de músculos con volumen fuerza/reps + tiempo isométrico, comparativas 7d y mes
   - **Por sesión**: historial descendente con totales por sesión

### UX
- Diseño limpio, sin distracciones, optimizado para móvil
- Registro de serie en máximo 3 toques + números
- Sin gráficos — solo números, flechas y etiquetas claras
- Navegación inferior o header con tabs

