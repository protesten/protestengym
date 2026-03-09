

## Plan: Coach IA v2 — Análisis exhaustivo + Chat interactivo

### Estudio competitivo (hallazgos clave)

Las apps líderes (Juggernaut AI, Fitbod, Arvo, SensAI) analizan estos parámetros que tu app actualmente **no cubre**:

| Parámetro | Juggernaut AI | Fitbod | Tu app actual |
|---|---|---|---|
| Volumen por músculo (series efectivas/semana) | ✅ MEV/MAV/MRV | ✅ | ❌ |
| Frecuencia por músculo (veces/semana) | ✅ | ✅ | ❌ |
| Intensidad relativa (% del 1RM usado) | ✅ | ✅ | ❌ |
| Tasa de progresión (% mejora/semana) | ✅ | ❌ | ❌ |
| Desequilibrios bilaterales | ❌ | ❌ | ❌ (datos existen) |
| Ratio push/pull, agonista/antagonista | ✅ | ❌ | ❌ |
| Distribución de rangos de reps | ✅ | ✅ | ❌ |
| Contexto de programa/mesociclo | ✅ | ❌ | ❌ |
| Composición corporal cruzada con fuerza | ❌ | ✅ | Parcial (solo ratio) |
| Consistencia y adherencia | ❌ | ❌ | Parcial (streak) |
| Sugerencia pre-sesión | ✅ | ✅ | ❌ |

### Datos disponibles en la app que NO se envían al Coach actualmente

Tu app ya tiene toda esta información calculable desde las tablas existentes:

1. **Series semanales por músculo** (`getWeeklyMuscleSets`) — volumen por grupo muscular
2. **Fatiga actual por músculo** (`computeFatigue`) — estado de recuperación en tiempo real
3. **Frecuencia muscular** — cuántas veces se trabaja cada músculo por semana
4. **Distribución de rangos de reps** — qué % de series son fuerza (1-5), hipertrofia (6-12), resistencia (13+)
5. **Intensidad relativa** — peso medio usado vs 1RM estimado por ejercicio
6. **Desequilibrios bilaterales** — bíceps D vs I, muslo D vs I (datos en body_measurements)
7. **Ratios antropométricos** — cintura/cadera, IMC, masa magra estimada
8. **Programa activo** — semana actual, objetivo del bloque, si toca deload
9. **Tendencia de volumen semanal** — si sube/baja/se mantiene en las últimas 4 semanas
10. **Consistencia** — streak, sesiones/semana, días desde última sesión
11. **PRs recientes** — récords batidos esta semana
12. **Ratio push/pull** — balance entre ejercicios de empuje y tirón

---

### Cambios propuestos

#### 1. Ampliar `getCoachData()` (`src/db/coach-data.ts`)

Enriquecer el payload que se envía a la IA con todos los parámetros calculados en cliente:

```text
CoachData actual:          CoachData v2 (añadido):
─────────────────          ──────────────────────
exercises[]                + weeklyMuscleSets[] (series/semana por músculo)
weeklyAvgRPE               + muscleFatigue[] (fatiga actual por músculo)
last3SessionsAvgRPE        + muscleFrequency[] (veces/semana por músculo)
bodyWeight[]               + repDistribution { strength%, hypertrophy%, endurance% }
bodyFat[]                  + intensityByExercise[] (peso medio vs 1RM)
                           + bilateralSymmetry[] (deltas D vs I)
                           + anthropometrics { imc, waistHipRatio, leanMass }
                           + activeProgram { name, week, goal, deloadWeek }
                           + volumeTrend[] (vol total últimas 4 semanas)
                           + consistency { streak, sessionsPerWeek, daysSinceLast }
                           + recentPRs[] (PRs de la última semana)
                           + pushPullRatio
                           + profile { sex, age, height }
```

Todos estos datos ya son calculables con funciones existentes en `calculations.ts` y `fatigue-config.ts`. No se necesitan cambios en la base de datos.

#### 2. Nuevo edge function con streaming: `ai-coach-chat` (`supabase/functions/ai-coach-chat/index.ts`)

Reemplazar la arquitectura actual de "una consulta = una respuesta estructurada" por un **chat con streaming SSE**:

- Primera invocación: recibe todos los datos y genera el análisis completo
- Siguientes mensajes: el usuario puede preguntar "¿por qué estoy estancado en press banca?" y la IA responde con contexto completo
- Historial de conversación se mantiene en el frontend (array de messages)
- Streaming token-by-token para UX fluida

El system prompt se enriquece con todas las reglas de análisis:

```text
Reglas nuevas (además de las actuales):
- Volume Landmarks: si un músculo tiene <10 series/semana → infravolumen (MEV)
                     si tiene 10-20 → zona óptima (MAV)
                     si tiene >20 → riesgo de sobreentrenamiento (MRV)
- Frecuencia: si un músculo se trabaja 1x/semana → insuficiente para hipertrofia
              si se trabaja 4+x/semana → excesiva para la mayoría
- Intensidad: si >80% de series son al mismo % del 1RM → falta de variabilidad
- Distribución de reps: si >70% de series son en rango 1-5 → falta volumen de hipertrofia
- Desequilibrios bilaterales: si la diferencia D-I en perímetros >2cm → alerta
- Push/Pull: si ratio >1.5 o <0.67 → desequilibrio agonista/antagonista
- Programa: contextualizar consejos según semana del mesociclo y objetivo del bloque
- Consistencia: si <3 sesiones/semana y objetivo es hipertrofia → insuficiente
- Composición corporal: cruzar tendencia de peso + grasa + perímetros para detectar
  recomposición, ganancia de grasa, o pérdida de masa muscular
```

#### 3. Nueva UI: Chat interactivo (`src/pages/Coach.tsx`)

Transformar la página de Coach de "botón + cards" a una **interfaz de chat**:

- Al abrir: botón "Iniciar consulta" que carga datos y genera análisis inicial
- El análisis inicial llega como mensaje del asistente (renderizado con markdown)
- Input de texto para hacer preguntas de seguimiento
- Historial de conversación visible (scroll)
- Indicador de "escribiendo..." durante streaming
- Botón "Nueva consulta" para reiniciar con datos frescos
- El historial de consultas anteriores se mantiene

#### 4. Mantener edge function original (`ai-coach`)

Conservar la función actual para compatibilidad. La nueva `ai-coach-chat` será la principal.

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/db/coach-data.ts` | Ampliar `CoachData` con ~12 nuevos parámetros calculados |
| `supabase/functions/ai-coach-chat/index.ts` | Nueva edge function con streaming SSE y prompt enriquecido |
| `src/pages/Coach.tsx` | Reescribir como interfaz de chat interactivo con streaming |
| `supabase/config.toml` | Añadir configuración para `ai-coach-chat` |

No se requieren cambios en la base de datos ni migraciones SQL.

