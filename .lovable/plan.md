

## Plan: Fichas/funciones configurables en el perfil

### Concepto
Ampliar el sistema de preferencias existente (`preferences` JSONB en `profiles`) con un nuevo campo `app_features` que permita activar/desactivar secciones y fichas de la app. Cada pantalla consultará estas preferencias para ocultar componentes desactivados.

### Funciones configurables identificadas

**Pantalla de Inicio:**
- `home_weekly_activity` — Ficha de actividad semanal (L-M-X-J-V-S-D)
- `home_quick_stats` — Estadísticas rápidas (sesiones, volumen)
- `home_streak` — Racha de entrenamiento
- `home_today_routine` — Sugerencia de rutina del día
- `home_recent_sessions` — Sesiones recientes
- `home_quick_actions` — Accesos rápidos (Rutinas/Análisis)

**Análisis (tabs):**
- `analysis_exercise` — Tab Ejercicio
- `analysis_muscle` — Tab Músculo
- `analysis_volume` — Tab Volumen
- `analysis_1rm` — Tab 1RM
- `analysis_prs` — Tab PRs
- `analysis_body` — Tab Cuerpo
- `analysis_relative` — Tab F. Relativa
- `analysis_summary` — Tab Resumen

**Fatiga:**
- `fatigue_heatmap` — Mapa de fatiga corporal
- `fatigue_history` — Historial de fatiga
- `fatigue_critical` — Músculos críticos
- `fatigue_overview` — Resumen general

**Navegación / Secciones completas:**
- `nav_coach` — Coach IA
- `nav_fatigue` — Fatiga
- `nav_measurements` — Medidas
- `nav_programs` — Programas
- `nav_calendar` — Calendario
- `nav_report` — Informe mensual

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/ai-insights.ts` | Añadir interfaz `AppFeatures`, defaults, helper `getAppFeatures()` |
| `src/pages/Profile.tsx` | Nueva sección "Personalizar App" con switches agrupados por categoría (Inicio, Análisis, Fatiga, Secciones) |
| `src/pages/Index.tsx` | Leer preferencias y envolver cada ficha en condicional |
| `src/pages/Analysis.tsx` | Filtrar tabs visibles según preferencias |
| `src/pages/Fatigue.tsx` | Ocultar secciones desactivadas |
| `src/components/BottomNav.tsx` | Filtrar `moreItems` según `nav_*` prefs |

### Implementacion

1. **`ai-insights.ts`**: Añadir tipo `AppFeaturePreferences` con todos los keys arriba (default `true`). Añadir `getAppFeatures(prefs)` similar a `getAIPreferences`.

2. **`Profile.tsx`**: Nueva sección colapsable "Personalizar App" con icono `LayoutGrid`, agrupada en sub-secciones:
   - **Inicio**: 6 switches
   - **Análisis**: 8 switches (uno por tab)
   - **Fatiga**: 4 switches
   - **Secciones**: 6 switches (ocultar secciones enteras del menú)
   
   Se guardan en `preferences.app_features` al pulsar Guardar.

3. **Cada página**: Importar `getAppFeatures`, leer del perfil cacheado con `useQuery(['profile'])`, y renderizar condicionalmente.

4. **`BottomNav.tsx`**: Leer preferencias del perfil para filtrar items del menú "Más" según `nav_*`.

### No se requieren migraciones SQL
Todo se almacena en el campo JSONB `preferences` existente.

