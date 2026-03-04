

## Sistema de aprobación manual de usuarios

Cuando un usuario nuevo inicie sesión con Google, quedará en estado "pendiente" y verá una pantalla indicando que su cuenta está pendiente de aprobación. Solo un administrador podrá aprobar usuarios.

### Cambios en base de datos

1. **Añadir columna `is_approved` a `profiles`** con valor por defecto `false`
2. **Actualizar el trigger `handle_new_user`** para que los nuevos perfiles se creen con `is_approved = false`

### Cambios en el frontend

1. **`src/components/ProtectedRoute.tsx`**: Después de verificar que el usuario está autenticado, consultar su perfil para comprobar `is_approved`. Si no está aprobado, mostrar una pantalla de "Cuenta pendiente de aprobación" con opción de cerrar sesión.

2. **`src/pages/Profile.tsx`** (o nueva sección admin): Añadir un panel visible solo para administradores que liste los usuarios pendientes (`is_approved = false`) con botón para aprobarlos.

3. **`src/lib/api.ts`**: Añadir funciones:
   - `getPendingUsers()` — consulta perfiles no aprobados (solo admins)
   - `approveUser(userId)` — actualiza `is_approved = true`

### Seguridad (RLS)

- Añadir política en `profiles` que permita a admins leer todos los perfiles (para gestionar aprobaciones), usando la función `has_role` existente.
- Añadir política que permita a admins actualizar `is_approved` en cualquier perfil.

### Flujo

```text
Usuario nuevo → Login Google → Perfil creado (is_approved=false)
                              → Ve pantalla "Pendiente de aprobación"
                              
Admin → Perfil → Panel admin → Ve usuarios pendientes → Aprueba
                              → Usuario puede acceder
```

