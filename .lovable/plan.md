

## Plan: Mejorar panel de administración con gestión completa de usuarios y copia de datos

### Problemas actuales
1. **Solo transferencia, no copia**: La transferencia actual ya copia (no borra origen), pero falta la opción de "mover" (copiar + borrar origen)
2. **Gestión de usuarios limitada**: Solo se puede aprobar o eliminar. No hay forma de ver detalles del usuario, pausarlo (revocar aprobación) ni ver estadísticas

### Cambios

#### 1. Tab "Usuarios" mejorado (`src/pages/Admin.tsx`)
- Al pulsar en un usuario se abre un **diálogo de detalle** con:
  - Info completa: nombre, email, fecha registro, sexo, altura, fecha nacimiento
  - Estadísticas: número de ejercicios, rutinas, sesiones, medidas (obtenidas via Edge Function)
  - Acciones: **Aprobar / Pausar** (toggle `is_approved`), **Eliminar**
- Los usuarios aprobados muestran un botón "Pausar" que revoca `is_approved` (deja la cuenta pero impide el acceso por RLS)
- Badge visual diferenciado: "Aprobado" (verde), "Pendiente" (amarillo), "Pausado" (rojo) — Pausado = existía aprobación previa que se revocó

#### 2. Tab "Datos" mejorado (renombrar de "Transferir")
- Añadir opción de modo: **Copiar** (mantiene datos en origen) vs **Mover** (copia y borra datos del origen)
- Radio group para seleccionar el modo antes de ejecutar

#### 3. Edge Function (`supabase/functions/admin-users/index.ts`)
- Nueva acción `suspend_user`: pone `is_approved = false` en el perfil del usuario
- Nueva acción `user_stats`: devuelve conteos de ejercicios, rutinas, sesiones, medidas para un `user_id`
- Ampliar `transfer_data` con parámetro `mode: 'copy' | 'move'` — si es "move", tras copiar elimina los datos del origen en las tablas seleccionadas

#### 4. API (`src/lib/api.ts`)
- Añadir `suspendUser(userId)`, `getUserStats(userId)`
- Modificar `transferUserData` para aceptar `mode`

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Admin.tsx` | Diálogo detalle usuario, botón pausar, modo copiar/mover |
| `supabase/functions/admin-users/index.ts` | Acciones `suspend_user`, `user_stats`, modo `move` en transfer |
| `src/lib/api.ts` | Nuevas funciones `suspendUser`, `getUserStats`, param `mode` en transfer |

### Seguridad
- Todas las nuevas acciones pasan por `verifyAdmin()` en la Edge Function
- La suspensión usa service role para actualizar `is_approved` (el trigger `profiles_protect_is_approved` ya protege esto en el lado cliente)

