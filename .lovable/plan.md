

## Plan: Añadir registro e inicio de sesión con email y contraseña

### Cambios necesarios

**1. AuthContext (`src/contexts/AuthContext.tsx`)**
- Añadir dos funciones: `signUp(email, password)` y `signInWithEmail(email, password)`
- `signUp` usa `supabase.auth.signUp()` con `emailRedirectTo: window.location.origin`
- `signInWithEmail` usa `supabase.auth.signInWithPassword()`
- Exportar ambas en el contexto

**2. Página Auth (`src/pages/Auth.tsx`)**
- Añadir tabs o toggle para alternar entre "Iniciar sesión" y "Registrarse"
- Formulario con campos email + contraseña (y confirmar contraseña en registro)
- Validación con zod: email válido, contraseña mínimo 6 caracteres, confirmación coincide
- Mantener el botón de Google como opción alternativa debajo del formulario
- Separador visual "o" entre el formulario y Google
- Tras registro exitoso: mostrar mensaje "Revisa tu correo para confirmar tu cuenta"
- Enlace "¿Olvidaste tu contraseña?" que muestra campo de email + botón para enviar reset

**3. Página Reset Password (`src/pages/ResetPassword.tsx`)**
- Nueva página en `/reset-password`
- Detecta `type=recovery` en URL hash
- Formulario para nueva contraseña + confirmación
- Llama a `supabase.auth.updateUser({ password })`
- Ruta pública (no protegida) en `App.tsx`

**4. Trigger `handle_new_user` (ya existente)**
- Ya crea el perfil automáticamente con `is_approved: false` — funciona igual para email signup, extrayendo `full_name` del metadata (será vacío para email, lo cual está bien con el COALESCE a '')

**5. No se activa auto-confirm**
- El usuario eligió verificación por email, así que se mantiene la configuración por defecto (email debe ser verificado antes de poder iniciar sesión)

### Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `src/contexts/AuthContext.tsx` | Añadir `signUp`, `signInWithEmail`, `resetPassword` |
| `src/pages/Auth.tsx` | Formulario email/contraseña con tabs login/registro + Google |
| `src/pages/ResetPassword.tsx` | Nueva página para restablecer contraseña |
| `src/App.tsx` | Añadir ruta `/reset-password` (pública) |

