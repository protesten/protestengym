

## Plan: Rediseño visual estilo FitPulse (dark, pro, mobile-first)

Basándome en las capturas de referencia, el estilo busca: **fondo oscuro**, **acentos naranjas/gradientes**, **cards con bordes sutiles**, **tipografía bold**, **chips/badges de colores**, y una estética fitness profesional.

### Cambios principales

**1. Tema de colores (`src/index.css`)**
- Cambiar el tema dark como default (forzar dark mode)
- Nuevos colores: fondo negro/gris muy oscuro, primario naranja (#FF6B35 o similar), acentos con gradientes naranja-azul
- Cards más oscuras con bordes sutiles
- Texto blanco brillante para títulos, gris para secundarios

**2. Página de Inicio (`Index.tsx`)**
- Saludo personalizado "¡Hola, [nombre]!"
- Sección "Objetivos del día" con indicadores circulares (calorías, tiempo activo, entrenamientos semana)
- Quick Start: botón grande con gradiente naranja para iniciar rutina + botón secundario "Entrenamiento rápido"
- Vista semanal (Lu-Do) con indicadores de actividad
- Card de "Performance Insight" con mini gráfico

**3. Página de Ejercicios (`Exercises.tsx`)**
- Barra de búsqueda con estilo oscuro
- Chips/filtros por grupo muscular (Pecho, Pierna, Espalda, etc.) como pills horizontales scrollables
- Cards de ejercicio más grandes con información de músculos
- Separación visual "Mis Ejercicios" con estilo diferenciado

**4. Página de Rutinas (`Routines.tsx`)**
- Header "MIS RUTINAS Y PLANES" en bold
- Cards de rutina como filas con chevron, fondo oscuro con borde
- Al expandir/seleccionar una rutina: mostrar resumen (volumen total, calorías estimadas, tiempo)
- Lista de ejercicios con formato "Squat 4x10x85kg" compacto
- Botón grande "NUEVA RUTINA" con gradiente

**5. Sesión en curso (`SessionDetail.tsx`)**
- Header "SESIÓN EN CURSO" con estilo bold
- Resumen superior: tiempo total, calorías estimadas
- Ejercicio actual destacado con nombre grande
- Registro de series: checkmarks para series completadas, datos inline (peso x reps)
- Indicador de RPE/esfuerzo por serie
- "Siguiente ejercicio" como preview

**6. Análisis (`Analysis.tsx`)**
- Tabs: Métricas / Tendencias / Logros
- Gráficos con colores naranja/azul sobre fondo oscuro
- Cards de "Personal Best" con valores destacados
- Sección de Logros/badges (100 Workouts, 1RM Club, etc.)

**7. Bottom Nav (`BottomNav.tsx`)**
- Fondo oscuro sólido, iconos con color naranja cuando activos
- Posible efecto de highlight/glow en item activo

**8. Auth (`Auth.tsx`)**
- Fondo oscuro con gradiente sutil
- Logo/marca "FITPULSE" o mantener el nombre actual pero con estilo bold
- Botón de login con gradiente naranja

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/index.css` | Nuevo tema dark-first con paleta naranja/oscura, gradientes |
| `src/App.tsx` | Forzar dark mode por defecto |
| `src/pages/Index.tsx` | Rediseño completo: saludo, objetivos, quick start, vista semanal |
| `src/pages/Exercises.tsx` | Chips de músculo, cards más visuales |
| `src/pages/Routines.tsx` | Cards estilo FitPulse, resumen de rutina |
| `src/pages/RoutineDetail.tsx` | Formato compacto de ejercicios con series inline |
| `src/pages/SessionDetail.tsx` | Estilo sesión en curso con checkmarks y highlight |
| `src/pages/Analysis.tsx` | Tabs métricas/tendencias/logros, badges |
| `src/pages/Auth.tsx` | Estilo dark con gradiente |
| `src/pages/Profile.tsx` | Cards oscuras, avatar más grande |
| `src/pages/NewSession.tsx` | Botones con gradiente, estilo consistente |
| `src/components/BottomNav.tsx` | Estilo oscuro, acentos naranja |

### Enfoque

La funcionalidad existente se mantiene intacta. Solo se cambia la capa visual: colores, espaciado, tipografía, y disposición de elementos para lograr el look profesional de las capturas de referencia.

