

## Plan: Corrección de 4 problemas de seguridad restantes

### 1. HTML Injection en notificación admin (edge function)
**Archivo:** `supabase/functions/notify-admin-new-user/index.ts`

Añadir función `escapeHtml()` y aplicarla a `newUserName` y `userEmail` antes de interpolarlos en el HTML. También sanitizar el subject del email.

### 2. `is_approved` solo en frontend — bypass via API (migración SQL)
**Problema:** Las políticas RLS no verifican `is_approved`, permitiendo a usuarios no aprobados operar directamente via API.

**Solución:** Crear función `is_approved_user()` SECURITY DEFINER y actualizar todas las políticas RLS de las tablas de usuario (`exercises`, `sessions`, `sets`, `session_exercises`, `routines`, `routine_exercises`, `programs`, `program_weeks`, `body_measurements`) para incluir `AND public.is_approved_user()` en sus condiciones USING/WITH CHECK.

```sql
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_approved = true
  );
$$;
```

Luego recrear cada política añadiendo la comprobación. Para tablas con ownership directo (`user_id = auth.uid()`), se añade `AND public.is_approved_user()`. Para tablas con ownership indirecto (`owns_session()`, `owns_routine()`, etc.), se añade `AND public.is_approved_user()` al USING/WITH CHECK.

Las políticas de `profiles` NO se modifican (el usuario necesita leer/actualizar su perfil incluso sin aprobar).

### 3. Error messages internos expuestos (3 edge functions)
**Archivos:** `admin-users/index.ts`, `notify-admin-new-user/index.ts`, `ai-coach/index.ts`

Reemplazar `err.message` por mensajes genéricos en los catch blocks, manteniendo `console.error` para debugging.

### 4. Leaked password protection
Activar mediante la herramienta de configuración de autenticación.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Migración SQL | Función `is_approved_user()` + recrear ~36 políticas RLS |
| `supabase/functions/notify-admin-new-user/index.ts` | Escape HTML + error genérico |
| `supabase/functions/admin-users/index.ts` | Error genérico en catch |
| `supabase/functions/ai-coach/index.ts` | Error genérico en catch |
| Auth config | Leaked password protection |

