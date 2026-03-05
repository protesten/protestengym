

## Reingeniería del Núcleo — Plan de Implementación

### 1. Caché Global con TanStack Query (Anti Over-fetching)

**`src/App.tsx`**: Configurar `QueryClient` con `staleTime` y `gcTime` para datos estables:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 min
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

**`src/pages/SessionDetail.tsx`** y otros consumidores: Las queries de `all_exercises` y `profile` ya usan queryKeys compartidos. Solo hay que asegurar que no usen `refetchOnMount: true` y que las mutaciones invaliden selectivamente.

### 2. Optimistic Updates + Offline Persistence

**`src/pages/SessionDetail.tsx`**: `addSetMutation` y `updateSetMutation` ya tienen optimistic updates implementados. Extender `updateSetMutation` para guardar en `localStorage` como fallback si la red falla.

Nuevo hook **`src/hooks/useOfflineQueue.ts`**:
- Al fallar una mutación de set, almacenar `{ setId, data, timestamp }` en `localStorage` bajo la key `offline_queue`.
- Al detectar reconexión (`navigator.onLine` + event listener `online`), reintentar las mutaciones pendientes y limpiar la cola.
- Mostrar un badge discreto "Sin conexión — datos guardados localmente" cuando hay items en cola.

### 3. Validación de Sesión Auth + Listener

**`src/contexts/AuthContext.tsx`**: El listener `onAuthStateChange` ya existe. Añadir detección de `TOKEN_REFRESHED` fallido y `SIGNED_OUT` inesperado:
- Si el token expira durante una sesión activa, mostrar un `toast` con botón "Reconectar" que llame a `signInWithGoogle()`.
- No limpiar el formulario/datos locales hasta que el usuario cierre sesión explícitamente.

### 4. Robustez de Inputs y TypeScript Estricto

**`src/pages/SessionDetail.tsx` — `NumericInput`**: Refactorizar para:
- Reemplazar comas por puntos automáticamente.
- Validar que el valor sea un número positivo finito.
- Si `NaN` o negativo → tratar como `null`.

```typescript
const sanitize = (raw: string): number | null => {
  const cleaned = raw.trim().replace(',', '.');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
```

**Eliminar `any`** en los casteos de:
- `set.rpe` (ya existe en el tipo `sets` como `numeric | null`).
- `re.planned_sets` → usar tipo `PlannedSet[]`.
- `profile.is_approved` → ya está en el schema.

### 5. Timer Automático por RPE

**`src/components/RestTimer.tsx`**: Exponer un método `start(seconds)` via ref o contexto.

**`src/pages/SessionDetail.tsx`**: Crear un ref al `RestTimer` y tras guardar RPE en `updateSetMutation.onSuccess`:
- Si RPE > 8 → `restTimerRef.current.start(180)` (3 min).
- Si RPE ≤ 8 y RPE ≥ 1 → `restTimerRef.current.start(90)` (90 seg).

Modificar `RestTimer` para aceptar `ref` con `useImperativeHandle` que exponga `start(seconds)`.

### 6. Manejo de Unidades (kg/lb)

**`src/lib/constants.ts`**: Añadir tipo `WeightUnit = 'kg' | 'lb'` y factor de conversión `KG_TO_LB = 2.20462`.

**`src/components/ui` / display layer**: Los valores en DB siempre se almacenan en kg. La UI lee la preferencia del perfil (`profiles.preferences.weight_unit`) y aplica conversión solo en la capa de visualización. Los inputs convierten de vuelta a kg antes de guardar.

### Archivos afectados

| Archivo | Acción |
|---|---|
| `src/App.tsx` | Configurar QueryClient con staleTime/gcTime |
| `src/hooks/useOfflineQueue.ts` | Nuevo: cola offline con localStorage + retry |
| `src/contexts/AuthContext.tsx` | Listener de token expirado con toast |
| `src/pages/SessionDetail.tsx` | NumericInput robusto, eliminar `any`, auto-timer por RPE, integrar offline queue |
| `src/components/RestTimer.tsx` | Exponer `start()` via `useImperativeHandle` |
| `src/lib/constants.ts` | Tipos de unidad de peso |

No se necesitan migraciones de base de datos.

