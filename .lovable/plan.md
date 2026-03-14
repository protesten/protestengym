

## Plan: Corregir datos enviados a la IA para el briefing diario

### Problema raíz

La IA dice "4 días de inactividad" cuando solo ha habido 1 día sin entrenar. Esto ocurre porque los datos enviados al contexto `home_summary` son insuficientes:

- **No se envía la fecha actual** (`today`), así que la IA no puede calcular correctamente los días desde la última sesión
- **Solo se envía `lastSessionDate`** como string sin contexto temporal — la IA tiene que "adivinar" qué día es hoy
- **No se filtran sesiones completadas** — se envían todas, incluyendo incompletas, lo que puede confundir

### Cambios

| Archivo | Cambio |
|---|---|
| `src/pages/Index.tsx` | Añadir `today`, `daysSinceLastSession` (calculado), lista de las últimas 5 fechas con sesiones completadas, y fatiga general si está disponible |
| `supabase/functions/ai-insights/index.ts` | Actualizar el prompt de `home_summary` para que use `today` y `daysSinceLastSession` como dato explícito y NO intente calcularlo |

### Detalle de los datos a enviar

```typescript
data={{
  today: new Date().toISOString().slice(0, 10),
  weekCount,
  totalSessions,
  weekVolume,
  lastSessionDate: completedSessions?.[0]?.date ?? null,
  daysSinceLastSession, // calculado en el componente
  recentSessionDates: completedSessions?.slice(0, 5).map(s => s.date) ?? [],
  weekDaysActive: weekDays.filter(d => d.active).map(d => d.label),
}}
```

### Detalle del prompt actualizado

Añadir al prompt de `home_summary`:
- "Los datos incluyen `today` (fecha actual) y `daysSinceLastSession` (días calculados desde la última sesión completada). Usa estos valores directamente, NO los recalcules."
- Filtrar `sessions` con `is_completed === true` antes de calcular `lastSessionDate`

### Archivos a modificar: 2

- `src/pages/Index.tsx` — enriquecer datos del briefing
- `supabase/functions/ai-insights/index.ts` — ajustar prompt para usar datos precalculados

