

## Plan: 7 mejoras de UX, IA y funcionalidad

### 1. Mover botón IA arriba en todas las pantallas
En cada página donde `AIInsightCard` aparece al final, moverlo justo después del título/header. Afecta: `Index.tsx`, `Profile.tsx`, `Programs.tsx`, `Analysis.tsx`, `Fatigue.tsx`, `Measurements.tsx`, `SessionDetail.tsx`, `SessionCalendar.tsx`, `MonthlyReport.tsx`, `NewSession.tsx`, `RoutineDetail.tsx`.

### 2. Preferencias de IA en Perfil (activar/desactivar + estilo + funciones granulares)
Ampliar el campo `preferences` (JSONB) en `profiles` para almacenar:
```json
{
  "units": "kg",
  "ai_enabled": true,
  "ai_tone": "technical" | "casual",
  "ai_mood": "motivator" | "focused",
  "ai_features": {
    "home_summary": true,
    "exercise_analysis": true,
    "routine_review": true,
    "session_feedback": true,
    "fatigue_advice": true,
    "measurement_insight": true,
    "program_review": true,
    "calendar_patterns": true,
    "monthly_report_narrative": true,
    "profile_recommendations": true,
    "new_session_suggestion": true
  },
  "font_size": "normal" | "large",
  "theme": "dark-orange"
}
```

**Profile.tsx**: Añadir secciones con switches:
- "Asistente IA" (switch global on/off)
- "Estilo de lenguaje" (select: Técnico / Coloquial)
- "Tono" (select: Motivador / Centrado)
- "Funciones IA" (collapsible con switches individuales por contexto)
- "Tamaño de letra" (select: Normal / Grande)
- "Tema" (select con opciones)

**AIInsightCard.tsx**: Leer preferencias del perfil. Si `ai_enabled` es false o el contexto específico está desactivado, no renderizar. Pasar `ai_tone` y `ai_mood` a la Edge Function.

**Edge Function `ai-insights`**: Recibir `tone` y `mood` en el body. Prepend al system prompt:
- `technical` → "Usa terminología técnica de entrenamiento (periodización, MEV/MAV/MRV, RPE, etc.)"
- `casual` → "Explica como si hablaras con un amigo que no sabe de entrenamiento, sin jerga técnica"
- `motivator` → "Sé animador y positivo, usa emojis y exclamaciones"
- `focused` → "Sé directo, conciso, sin adornos, solo datos y acciones"

### 3. Tamaño de letra grande
Aplicar una clase CSS en `<html>` cuando `font_size === 'large'` que escala la base font-size.
En `index.css`: `.font-large { font-size: 18px; }` (default es ~16px).
En `App.tsx` o layout: leer preferencia y aplicar clase al `<html>`.
Revisar clases `text-[10px]`, `text-xs` para asegurar que en modo grande usen `text-xs`/`text-sm` mínimo.

### 4. Edición de programa creado
El programa ya se puede ver y asignar rutinas, pero falta editar nombre, número de días y deload. Añadir al detail view:
- Botón "Editar" junto al nombre que abre campos editables (nombre, deload_week)
- Botón "Añadir día" para añadir más días al programa (insertar nuevo `program_week`)
- Botón "Eliminar día" para quitar el último día
- Mutation para actualizar `programs.name`, `programs.deload_week`

### 5. Temas de color
Definir 4-5 temas con variables CSS alternativas:
- **Naranja oscuro** (actual/default)
- **Azul oscuro** — primary: azul
- **Verde oscuro** — primary: verde
- **Morado oscuro** — primary: púrpura
- **Claro** — light mode

Almacenar en `preferences.theme`. Aplicar con clase en `<html>` que override las CSS variables.

### 6. Nombre de sesión en "Sesiones Recientes" (Index.tsx)
El campo `sessions.routine_id` ya existe. Hacer join con `routines` para mostrar el nombre de la rutina asociada. Modificar `getSessions()` en `api.ts` para hacer `.select('*, routines(name)')` o, más simple, cargar routines aparte (ya se cargan en Index) y resolver el nombre en el render.

### 7. Texto desbordando cajas
Auditar y aplicar `truncate`, `break-words`, `overflow-hidden` y `min-w-0` en los puntos problemáticos. Subir tamaños mínimos de `text-[10px]` a `text-[11px]` para legibilidad móvil.

---

### Archivos a modificar/crear

| Archivo | Cambio |
|---|---|
| `src/pages/Profile.tsx` | Secciones IA, tamaño letra, tema |
| `src/components/AIInsightCard.tsx` | Leer preferencias, pasar tone/mood, ocultar si desactivado |
| `src/lib/ai-insights.ts` | Aceptar tone/mood params |
| `supabase/functions/ai-insights/index.ts` | Procesar tone/mood en prompts |
| `src/index.css` | Temas CSS + clase font-large |
| `src/App.tsx` | Aplicar clase tema + font-size a html |
| `src/pages/Index.tsx` | Mover AI card arriba + mostrar nombre rutina en sesiones |
| `src/pages/Programs.tsx` | Edición de programa (nombre, deload, añadir/quitar días) |
| 9 páginas más | Mover AI card arriba |

No se requieren migraciones SQL (todo usa `preferences` JSONB existente).

