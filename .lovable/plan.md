

## Plan: 12 Nuevas Funcionalidades — Implementación por Fases

Dado el volumen, propongo dividir en **4 sprints** para mantener calidad y poder probar cada grupo antes de avanzar.

---

### Sprint 1: Mejoras en la sesión de entrenamiento

**1. Valores de sesión anterior**
- Al cargar un ejercicio en `SessionDetail`, consultar la última sesión donde se usó ese ejercicio
- Mostrar peso/reps anteriores como texto gris debajo de cada campo de input
- Formato: "Anterior: 80kg × 10"

**2. Temporizador de descanso**
- Componente `RestTimer` flotante que aparece al completar una serie
- Tiempos predeterminados: 60s, 90s, 120s, 180s (configurable en perfil)
- Cuenta regresiva visual con barra de progreso circular
- Vibración del navegador al terminar (`navigator.vibrate`)

**3. Notas por ejercicio**
- Nueva columna `notes` (text, nullable) en tabla `exercises`
- Icono de nota en `SessionDetail` junto al nombre del ejercicio
- Al tocar, abre un popover para ver/editar la nota persistente
- Útil para: "Agarre ancho", "Ajuste de máquina: 5", "Codo pegado al cuerpo"

---

### Sprint 2: Análisis avanzado

**4. Series por músculo por semana**
- Nueva pestaña en `Analysis.tsx` o integrar en la tab "Músculo"
- Calcular working sets (solo tipo 'work') por grupo muscular en la semana actual
- Mostrar barra de progreso vs objetivo configurable (ej: 10-20 sets/semana)
- Código de colores: rojo (<10), amarillo (10-15), verde (15-20), naranja (>20)

**5. Estimación de 1RM**
- Fórmula Epley: `1RM = peso × (1 + reps/30)`
- Calcular automáticamente para cada ejercicio weight_reps
- Mostrar en la tab PRs y en el historial del ejercicio
- Gráfico de evolución del 1RM estimado en el tiempo

**6. Racha y consistencia**
- Calcular racha actual (semanas consecutivas con al menos 1 sesión)
- Calendario de actividad estilo GitHub (grid de cuadrados coloreados por intensidad)
- Stats: sesiones este mes, media semanal, mejor racha, días desde última sesión
- Mostrar racha prominente en la página de Inicio

**7. Notificación de PR en vivo**
- Al guardar peso/reps en `SetRow`, comparar con el máximo histórico
- Si supera el PR: animación de confetti/celebración + toast especial
- Guardar automáticamente como nuevo PR
- Badge "🏆 PR" junto a la serie que lo batió

---

### Sprint 3: Planificación y medidas

**8. Medidas corporales**
- Nueva tabla `body_measurements`: user_id, date, weight_kg, body_fat_pct, chest_cm, waist_cm, arm_cm, thigh_cm, notes
- Nueva página `/measurements` con formulario de registro y gráficos de evolución
- Añadir al menú de navegación o como sub-sección del perfil

**9. Calculadora de calentamiento**
- Dado el peso de trabajo, generar series progresivas automáticas
- Ejemplo para 100kg: barra vacía (20kg) × 10, 50kg × 8, 70kg × 5, 85kg × 3, luego trabajo
- Configurable: peso de barra, porcentajes, reps por nivel
- Botón "Generar calentamiento" en cada ejercicio dentro de la sesión

**10. Programación por bloques/mesociclos**
- Nueva tabla `programs`: id, user_id, name, weeks, deload_week, created_at
- Nueva tabla `program_weeks`: id, program_id, week_number, routine_id, notes
- UI para crear un programa de 4-8 semanas asignando rutinas a cada semana
- Vista de calendario/timeline del bloque con deload automático
- Al iniciar sesión, sugerir la rutina del día según el programa activo

---

### Sprint 4: Exportación e informes

**11. Informe mensual automático**
- Generar resumen al inicio de cada mes (o bajo demanda)
- Contenido: sesiones completadas, volumen total, PRs batidos, músculos más/menos trabajados, tendencia de 1RM, racha
- Renderizar como card visual en la app
- Opción de descargar como imagen (html2canvas)

**12. Exportar/compartir entrenamientos**
- Exportar sesión individual como imagen compartible (estilo Instagram story)
- Exportar historial completo como CSV
- Compartir rutina via link (generar URL pública de solo lectura)
- Botones de compartir en `SessionDetail` y `RoutineDetail`

---

### Base de datos (migraciones necesarias)

| Tabla/Columna | Cambio |
|---|---|
| `exercises.notes` | Nueva columna text nullable |
| `body_measurements` | Nueva tabla completa con RLS |
| `programs` | Nueva tabla con RLS |
| `program_weeks` | Nueva tabla con RLS |
| `profiles.preferences` | Ampliar jsonb para rest_timer_seconds, weekly_set_targets |

### Orden de implementación sugerido

Empezamos por **Sprint 1** (3 features de sesión) que son las que más impacto inmediato tienen en la experiencia de entrenamiento diario. Cada sprint se puede implementar y probar antes de pasar al siguiente.

**¿Empezamos con el Sprint 1?**

