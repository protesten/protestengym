

## Plan: Panel de Administración con Gestión de Usuarios e Importación/Exportación de Datos

### 1. Nueva página de Administración (`src/pages/Admin.tsx`)

Página dedicada solo para admins con dos secciones principales:

**A) Gestión de usuarios** - Tabla con todos los usuarios del sistema:
- Columnas: Nombre, Email (del perfil), Estado (aprobado/pendiente), Fecha de registro, Acciones
- Acciones por usuario: Aprobar, Rechazar/Eliminar, Ver datos
- Mover aquí el componente `AdminUserApproval` existente o integrarlo en la tabla

**B) Importar/Exportar datos entre cuentas** - Interfaz para transferir datos:
- Seleccionar usuario origen y usuario destino
- Seleccionar qué datos transferir: ejercicios, rutinas, sesiones (con sets), medidas corporales, programas
- Botón de ejecutar transferencia

### 2. Edge Function para operaciones admin (`supabase/functions/admin-users/index.ts`)

Ampliar la Edge Function existente con nuevas acciones:

- `action: "list_users"` — Listar todos los perfiles (con email de auth.users via service role)
- `action: "transfer_data"` — Copiar datos de un usuario a otro:
  - Recibe `source_user_id`, `target_user_id`, `tables[]` (exercises, routines, sessions, measurements, programs)
  - Usa service role para leer datos del origen e insertarlos con el `user_id` del destino
  - Para datos relacionales (routines→routine_exercises, sessions→session_exercises→sets, programs→program_weeks), mantiene las relaciones con nuevos UUIDs

### 3. Navegación

- Añadir enlace "Admin" en el menú "Más" de `BottomNav.tsx`, visible solo para admins
- Nueva ruta `/admin` en `App.tsx` (protegida + verificación de admin)

### 4. Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Admin.tsx` | Nueva página con tabla de usuarios + UI de transferencia |
| `supabase/functions/admin-users/index.ts` | Añadir acciones `list_users` y `transfer_data` |
| `src/App.tsx` | Añadir ruta `/admin` |
| `src/components/BottomNav.tsx` | Enlace "Admin" para admins en menú Más |
| `src/lib/api.ts` | Funciones `getAdminUsers()` y `transferUserData()` |

### 5. Seguridad

- Todas las operaciones admin pasan por la Edge Function con service role
- Verificación de rol admin en la Edge Function antes de ejecutar cualquier acción
- La transferencia de datos NO elimina datos del origen (es una copia)

### 6. Datos transferibles y sus relaciones

```text
exercises (personal) ─── independiente
routines ──┬── routine_exercises (referencia exercise_id)
programs ──┬── program_weeks (referencia routine_id)
sessions ──┬── session_exercises ──┬── sets
body_measurements ─── independiente
```

La transferencia resp