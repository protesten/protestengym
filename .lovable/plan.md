

## Datos adicionales para el Coach IA

### Lo que YA se envía (15 parámetros)

| Categoría | Datos |
|---|---|
| Rendimiento | `exercises` (tendencias 1RM, mesetas), `recentPRs`, `intensityByExercise` |
| Volumen | `weeklyMuscleSets` (MEV/MAV/MRV), `muscleFrequency`, `volumeTrend` (4 sem), `repDistribution` |
| Fatiga/Balance | `muscleFatigue`, `pushPullRatio`, `bilateralSymmetry` |
| Biometría | `bodyWeight`, `bodyFat`, `anthropometrics` (IMC, cintura/cadera, masa magra) |
| Contexto | `activeProgram`, `consistency`, `weeklyAvgRPE`, `last3SessionsAvgRPE`, `profile` |

### Lo que se puede AÑADIR (calculable con datos existentes, sin nuevas tablas)

#### A. Datos derivables de las tablas actuales

1. **Tasa de progresión por ejercicio** — % de mejora del 1RM por semana/mes (ya tienes `sessionRMs`, solo falta calcular la pendiente/slope)
2. **Volumen total por sesión** (tonnage = peso x reps) — tendencia de carga total por sesión, no solo semanal
3. **Densidad de entrenamiento** — sets totales / duración estimada de sesión (usando timestamps de `created_at` de sets para estimar duración)
4. **Ratio warmup/work** — % de series de calentamiento vs trabajo; demasiado poco warmup = riesgo lesión
5. **Variedad de ejercicios** — cuántos ejercicios distintos usa por músculo; baja variedad = posible estancamiento
6. **Adherencia al programa** — si tiene programa activo, % de rutinas completadas vs planificadas (cruzando `sessions.routine_id` con `program_weeks.routine_id`)
7. **Distribución semanal** (días de entreno) — qué días de la semana entrena, para detectar distribución irregular
8. **Perímetros en tendencia** — no solo la última medición bilateral, sino la evolución de perímetros (pecho, brazo, muslo) en las últimas 5 mediciones
9. **Fuerza relativa** (1RM / peso corporal) — ya existe en Analysis pero no se envía al Coach
10. **RPE por ejercicio** — RPE medio por ejercicio individual (no solo global), para detectar ejercicios donde el esfuerzo es consistentemente alto
11. **Notas de sesión** — las últimas notas escritas por el usuario en sesiones recientes (`sessions.notes`), para contexto cualitativo
12. **Rutinas disponibles** — nombres y objetivos de las rutinas del usuario para sugerir cuál hacer hoy

#### B. Mejoras al system prompt (sin cambios de datos)

13. **Periodización ondulante** — reglas para detectar si el usuario alterna correctamente entre bloques de fuerza/hipertrofia/resistencia
14. **Recomendaciones de ejercicios sustitutos** — cuando detecta estancamiento, sugerir variaciones (ej: "si estás estancado en press banca, prueba press inclinado con mancuernas")
15. **Estimación de tiempo de recuperación** — basado en fatiga muscular, decir "tu pecho necesita ~36h más de descanso"
16. **Análisis de calentamiento** — evaluar si el ratio approach/warmup es adecuado antes de series de trabajo

### Cambios propuestos

#### 1. Ampliar `getCoachData()` con ~8 nuevos campos

| Campo nuevo | Fuente | Cálculo |
|---|---|---|
| `progressionRate[]` | `sessionRMs` existentes | Slope lineal del 1RM por ejercicio (% mejora/semana) |
| `sessionTonnage[]` | sets work | `Σ(peso × reps)` por sesión, últimas 10 sesiones |
| `exerciseVariety[]` | session_exercises × muscles | Ejercicios distintos por músculo en últimos 28 días |
| `programAdherence` | sessions × program_weeks | % rutinas completadas vs planificadas |
| `trainingDayDistribution` | sessions.date | Conteo por día de la semana (Lun-Dom) |
| `relativeStrength[]` | 1RM / bodyWeight | Top 5 ejercicios con su ratio |
| `rpeByExercise[]` | sets.rpe agrupado | RPE medio por ejercicio (top 10) |
| `recentSessionNotes[]` | sessions.notes | Últimas 3 notas no vacías |
| `measurementTrends` | body_measurements (5 últimas) | Tendencia de pecho, brazo, muslo, cintura |
| `availableRoutines[]` | routines | Nombres + objetivos para sugerir hoy |

#### 2. Enriquecer el system prompt

Añadir reglas para los nuevos datos:
- Progresión <0.5%/semana en ejercicio principal = estancamiento
- Tonnage bajando 2+ semanas seguidas = posible fatiga acumulada
- <3 ejercicios distintos por músculo en 28 días = baja variedad
- Adherencia al programa <80% = inconsistencia
- Distribución irregular (3 días seguidos + 4 sin) = mala planificación
- Fuerza relativa: press banca 1x BW = principiante, 1.5x = intermedio, 2x = avanzado
- RPE consistentemente >9 en un ejercicio = demasiado peso o fatiga acumulada

#### 3. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/db/coach-data.ts` | Añadir ~8 nuevos campos calculados al `CoachData` |
| `supabase/functions/ai-coach-chat/index.ts` | Ampliar system prompt con nuevas reglas |

No se requieren migraciones SQL ni cambios en la base de datos.

