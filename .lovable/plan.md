

## Diagnóstico

He verificado el estado actual de la base de datos y el flujo completo:

1. **El registro SÍ funciona**: el usuario sergio130578@gmail.com se registró correctamente, se creó su perfil con `is_approved: false`, y la Edge Function `notify-admin-new-user` respondió `{"ok": true}`.

2. **El email NO se envió (o no hay evidencia)**: Los logs de la Edge Function solo muestran boot/shutdown, sin ningún mensaje de "RESEND_API_KEY not configured" ni errores de envío. Es probable que la función ejecutó pero el email no llegó (problema con el dominio remitente `notifications@gym.protesten.com` no verificado en Resend, o similar).

3. **La notificación in-app es invisible**: El componente `AdminUserApproval` solo aparece **al final de la página de Perfil**. No hay ningún badge, punto rojo ni indicador en la navegación que avise al admin de que tiene usuarios pendientes. Si el admin no va expresamente a Perfil y hace scroll, nunca lo ve.

4. **El usuario nuevo NO recibe feedback claro**: Solo ve la pantalla de "Cuenta pendiente de aprobación" pero no sabe si se avisó al administrador ni cuánto tardará.

## Plan de corrección

### 1. Badge de notificación en la navegación para admins

**Archivo:** `src/components/BottomNav.tsx`

Cuando el usuario es admin, consultar `getPendingUsers` y mostrar un **punto rojo con número** sobre el icono de "Más" (o sobre "Perfil" en el menú expandido) cuando haya usuarios pendientes. Esto hace visible la solicitud sin necesidad de navegar a Perfil.

### 2. Mejorar la pantalla de "Cuenta pendiente" para el usuario nuevo

**Archivo:** `src/components/ProtectedRoute.tsx`

Añadir un mensaje más claro: "Se ha notificado al administrador. Recibirás acceso cuando apruebe tu cuenta." para que el usuario sepa que el proceso está en marcha.

### 3. Asegurar que el email realmente se envía (logging en Edge Function)

**Archivo:** `supabase/functions/notify-admin-new-user/index.ts`

Añadir `console.log` explícitos antes y después del envío del email, incluyendo el status de la respuesta de Resend, para poder diagnosticar si el email se envía o falla silenciosamente. También loguear si `RESEND_API_KEY` está presente.

### 4. Verificar dominio de envío en Resend

El email se envía desde `notifications@gym.protesten.com`. Si este dominio no está verificado en Resend, los emails se rechazan silenciosamente. Se necesita verificar que el dominio está configurado correctamente, o usar el dominio por defecto de Resend para testing.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/BottomNav.tsx` | Badge con número de pendientes para admins |
| `src/components/ProtectedRoute.tsx` | Mejorar mensaje UX para usuario no aprobado |
| `supabase/functions/notify-admin-new-user/index.ts` | Añadir logging detallado del envío de email |

