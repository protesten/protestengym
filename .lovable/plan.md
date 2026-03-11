

## Diagnóstico

El problema está claramente identificado en los logs de autenticación:

```
ERROR: function extensions.http_post(url => text, body => text, headers => jsonb) does not exist (SQLSTATE 42883)
msg: "500: Database error saving new user"
```

**Cadena de fallos:**
1. Nuevo usuario hace login con Google → Supabase crea fila en `auth.users`
2. Trigger `on_auth_user_created` → ejecuta `handle_new_user()` → inserta en `profiles`
3. Trigger `on_profile_created_notify_admin` → ejecuta `notify_admin_new_user()` → llama a `extensions.http_post()`
4. `http_post` NO EXISTE en Lovable Cloud (la extensión `pg_net`/`http` no está disponible)
5. **Toda la transacción se aborta**: no se crea el perfil, no se completa el registro, el usuario queda en un estado roto

Por eso el usuario vuelve a la pantalla de login y el admin no ve ninguna solicitud.

## Plan de corrección

### 1. Migración SQL: eliminar el trigger problemático

Eliminar el trigger `on_profile_created_notify_admin` y la función `notify_admin_new_user()` que usan `extensions.http_post`. También eliminar la extensión `pg_net` que no funciona en Lovable Cloud.

```sql
DROP TRIGGER IF EXISTS on_profile_created_notify_admin ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_admin_new_user();
DROP EXTENSION IF EXISTS pg_net;
```

### 2. Notificación al admin desde el código del cliente

Mover la lógica de notificación al frontend: después de que `onAuthStateChange` detecte un `SIGNED_IN` y el perfil exista con `is_approved = false`, invocar la Edge Function `notify-admin-new-user` desde el cliente.

**Archivo:** `src/contexts/AuthContext.tsx`
- En el listener de `onAuthStateChange`, cuando `event === 'SIGNED_IN'`:
  - Consultar el perfil del usuario
  - Si `is_approved === false`, llamar a la Edge Function `notify-admin-new-user` con `supabase.functions.invoke()`
  - Usar un flag en `sessionStorage` para evitar llamadas duplicadas

### 3. Actualizar la Edge Function para aceptar llamadas autenticadas

**Archivo:** `supabase/functions/notify-admin-new-user/index.ts`
- Actualmente solo acepta `SERVICE_ROLE_KEY`. Modificar para que también acepte JWT de usuario autenticado (validando el token y extrayendo el `user_id` del claim)
- Mantener la lógica existente de buscar admins y enviar emails

**Archivo:** `supabase/config.toml`
- Mantener `verify_jwt = false` para esta función (la validación se hace manualmente dentro)

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| Migración SQL | Eliminar trigger, función y extensión rotas |
| `src/contexts/AuthContext.tsx` | Llamar a notify edge function tras login de usuario no aprobado |
| `supabase/functions/notify-admin-new-user/index.ts` | Aceptar JWT de usuario además de service role key |

