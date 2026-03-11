

## Plan: Corregir panel de administración y consolidar gestión de usuarios

### Problema 1: "No hay usuarios" — Error en Edge Function
La Edge Function `admin-users` usa `SUPABASE_PUBLISHABLE_KEY` que no existe en el entorno de Edge Functions. Las otras funciones usan `SUPABASE_ANON_KEY`. Este es el error en los logs: `supabaseKey is required`.

**Fix**: Cambiar `SUPABASE_PUBLISHABLE_KEY` por `SUPABASE_ANON_KEY` en `supabase/functions/admin-users/index.ts` (línea 23).

### Problema 2: Consolidar "Usuarios pendientes" en el panel Admin
Actualmente el componente `AdminUserApproval` se renderiza en la página de Perfil. Hay que moverlo al panel de administración y quitarlo de Perfil.

### Cambios

| Archivo | Cambio |
|---|---|
| `supabase/functions/admin-users/index.ts` | `SUPABASE_PUBLISHABLE_KEY` → `SUPABASE_ANON_KEY` |
| `src/pages/Profile.tsx` | Eliminar import y uso de `AdminUserApproval` |
| `src/pages/Admin.tsx` | Ya tiene gestión de usuarios con aprobación/eliminación — no necesita cambios adicionales, ya incluye esa funcionalidad integrada en la tabla |

Re-deploy de la Edge Function tras el cambio.

