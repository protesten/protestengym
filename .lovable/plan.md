

## Plan: Migrar a Supabase con autenticación Google y sincronización

Este es un cambio grande: migrar de Dexie.js (local) a Supabase (cloud) con autenticación Google y perfiles de usuario.

---

### Fase 1: Conectar Supabase y crear esquema

**Prerequisito**: Habilitar Lovable Cloud (Supabase) en el proyecto.

**Migración SQL** — Crear todas las tablas en Supabase adaptando el esquema actual:

- `muscles` — tabla compartida de solo lectura, pre-poblada con los músculos actuales
- `profiles` — id (uuid, FK auth.users), display_name, avatar_url, preferences (jsonb: unidades, tema)
- `exercises` — id, user_id (FK auth.users), name, tracking_type, primary_muscle_ids (int[]), secondary_muscle_ids (int[])
- `routines` — id, user_id, name
- `routine_exercises` — id, routine_id, exercise_id, order_index
- `sessions` — id, user_id, date, routine_id, notes
- `session_exercises` — id, session_id, exercise_id, order_index
- `sets` — id, session_exercise_id, set_type, weight, reps, duration_seconds, distance_meters

**RLS policies**: Cada tabla con user_id usa `auth.uid() = user_id`. Tablas hijas (routine_exercises, session_exercises, sets) verifican ownership del padre via EXISTS. `muscles` es SELECT para todos.

**Trigger**: Auto-crear perfil al registrarse (on auth.users insert).

---

### Fase 2: Autenticación con Google

Archivos nuevos:
- `src/integrations/supabase/client.ts` — cliente Supabase
- `src/contexts/AuthContext.tsx` — contexto de auth con `onAuthStateChange`, login/logout Google
- `src/pages/Auth.tsx` — página de login con botón Google
- `src/components/ProtectedRoute.tsx` — wrapper que redirige a /auth si no autenticado

Modificar `src/App.tsx`:
- Envolver con AuthProvider
- Rutas protegidas excepto /auth

---

### Fase 3: Capa de datos Supabase

Reemplazar `src/db/index.ts` con `src/lib/api.ts` — funciones CRUD usando el cliente Supabase en vez de Dexie:
- `getExercises()`, `createExercise()`, `updateExercise()`, `deleteExercise()`
- `getRoutines()`, `getRoutineExercises()`, etc.
- `getSessions()`, `getSessionExercises()`, `getSets()`, etc.

Usar `@tanstack/react-query` (ya instalado) para cache y reactividad en vez de `useLiveQuery`.

---

### Fase 4: Adaptar todas las páginas

Refactorizar cada página para usar las nuevas funciones API + react-query en vez de Dexie:

| Página | Cambio principal |
|---|---|
| `Index.tsx` | Mostrar nombre del usuario |
| `Exercises.tsx` | useQuery/useMutation en vez de useLiveQuery/db.exercises |
| `Routines.tsx` | Igual |
| `RoutineDetail.tsx` | Igual |
| `NewSession.tsx` | Igual |
| `SessionDetail.tsx` | Igual |
| `Analysis.tsx` | Adaptar calculations.ts para usar API |

`src/db/calculations.ts` se refactorizará para recibir datos como parámetros en vez de acceder a Dexie directamente.

---

### Fase 5: Perfil y preferencias

- Nueva página `src/pages/Profile.tsx` — nombre, avatar, unidades (kg/lb), tema
- Botón de perfil en la BottomNav o header
- Almacenar preferencias en `profiles.preferences` como JSONB

---

### Resumen de archivos

| Acción | Archivos |
|---|---|
| Crear | `src/integrations/supabase/client.ts`, `src/contexts/AuthContext.tsx`, `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx`, `src/lib/api.ts`, `src/pages/Profile.tsx` |
| Refactorizar | `src/App.tsx`, `src/pages/Exercises.tsx`, `src/pages/Routines.tsx`, `src/pages/RoutineDetail.tsx`, `src/pages/NewSession.tsx`, `src/pages/SessionDetail.tsx`, `src/pages/Analysis.tsx`, `src/db/calculations.ts`, `src/components/BottomNav.tsx` |
| Eliminar | `src/db/index.ts` (reemplazado por api.ts) |

### Nota importante

Se necesita habilitar Lovable Cloud antes de empezar. Tambien se requiere configurar Google OAuth en el dashboard de Supabase (añadir Google como proveedor de auth con las credenciales de Google Cloud Console).

