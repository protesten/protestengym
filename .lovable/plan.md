

## Bug: Sesiones de hoy se ignoran en el cálculo de fatiga

### Causa raíz

En `src/lib/fatigue-config.ts`, línea 69, la fecha de cada sesión se convierte a timestamp usando `T12:00:00` (mediodía):

```typescript
const sessionTime = new Date(session.date + 'T12:00:00').getTime();
const hoursAgo = (now - sessionTime) / 3_600_000;
if (hoursAgo < 0 || hoursAgo > 14 * 24) continue;  // ← SKIP si negativo
```

Si consultas la fatiga **antes de las 12:00 del mediodía**, `hoursAgo` es negativo para la sesión de hoy → se descarta por completo. Esto explica por qué no ves fatiga alguna a pesar de haber entrenado hoy.

### Solución

Cambiar `T12:00:00` por `T00:00:00` para que la sesión cuente desde el inicio del día. Así cualquier consulta posterior a medianoche incluirá la sesión correctamente.

### Cambios

| Archivo | Acción |
|---|---|
| `src/lib/fatigue-config.ts` | Cambiar `'T12:00:00'` → `'T00:00:00'` en línea 69 |

Es un cambio de 1 línea.

