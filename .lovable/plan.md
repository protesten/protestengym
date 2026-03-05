

## Fix: Rutinas completadas siguen apareciendo como activas

### Problema

`TodayRoutineSuggestion` muestra todas las rutinas programadas para la semana actual, pero nunca comprueba si ya existe una sesión de hoy con ese `routine_id`. Así que aunque hayas completado la rutina, sigue apareciendo con el botón de Play.

### Solución

En la query del componente, después de obtener los `routineIds` programados, consultar las sesiones de hoy y filtrar las rutinas que ya tengan una sesión registrada. Si todas están completadas, el componente no se renderiza.

### Cambios

| Archivo | Acción |
|---|---|
| `src/components/TodayRoutineSuggestion.tsx` | Tras obtener `routineIds`, consultar `sessions` filtrando por `date = hoy` y descartar las rutinas cuyo `routine_id` ya aparezca en una sesión de hoy |

Cambio de ~10 líneas en 1 archivo. La lógica adicional:

```typescript
// 4.5 Check which routines already have a session today
const today = now.toISOString().slice(0, 10);
const { data: todaySessions } = await supabase
  .from('sessions')
  .select('routine_id')
  .eq('date', today);
const completedIds = new Set(todaySessions?.map(s => s.routine_id).filter(Boolean));
// Filter out completed routines
const pendingIds = routineIds.filter(id => !completedIds.has(id));
if (!pendingIds.length) return null;
```

Luego usar `pendingIds` en lugar de `routineIds` para construir la lista final.

