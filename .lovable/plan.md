

## Plan: IA como Analista Deportivo de Alto Rendimiento + Objetivos de Entrenamiento en Perfil + Revisión RPE

### Resumen

Transformar la IA en un Analista Deportivo que sugiera ajustes en tiempo real durante el entrenamiento, ampliar los objetivos de entrenamiento del usuario en su perfil, y corregir deficiencias del sistema RPE.

---

### Análisis del RPE actual — Problemas detectados

1. **RPE Feedback demasiado simplista**: `RPEFeedback` solo considera `weight` y `rpe` con umbrales fijos (+5% si RPE<=7, +2% si RPE<=9). No considera: tracking_type (solo funciona con peso), objetivo del usuario, historial, ni tipo de serie.
2. **RPE no se adapta al objetivo**: Un RPE 8 en fuerza (3-5 reps) es diferente a RPE 8 en hipertrofia (8-12 reps). Actualmente no hay diferenciación.
3. **No hay objetivo de entrenamiento en el perfil**: El `training_goal` solo existe a nivel de rutina, no del usuario. Para la IA esto es insuficiente.
4. **WeightSuggestion limitada a 3 objetivos**: Solo fuerza/hipertrofia/resistencia. El usuario pide más: potencia explosiva, técnica pura, resistencia aeróbica.
5. **RPE en series warmup/approach**: El RPE se muestra para todas las series excepto drop_set y partial, lo cual es correcto, pero el feedback (`RPEFeedback`) solo aplica a peso, ignorando reps_only/time_only.

---

### Cambios propuestos

#### 1. Ampliar objetivos de entrenamiento (`src/lib/constants.ts`)

Añadir nuevos objetivos:

| Objetivo | % 1RM | Reps | Uso |
|---|---|---|---|
| strength | 85% | 3-5 | Fuerza máxima |
| hypertrophy | 75% | 8-12 | Hipertrofia |
| endurance | 60% | 15+ | Resistencia muscular |
| **power** | **90%** | **1-3** | **Potencia explosiva** |
| **technique** | **50%** | **8-12** | **Técnica pura** |
| **aerobic** | **40%** | **20+** | **Resistencia aeróbica** |

#### 2. Añadir `training_goal` al perfil del usuario (`src/pages/Profile.tsx`)

- Nuevo campo `Select` en el perfil para elegir el objetivo principal
- Se guarda en `profiles.preferences.training_goal`
- Este objetivo se usa como fallback cuando la rutina no tiene uno definido

#### 3. Mejorar RPEFeedback con lógica inteligente (`src/components/RPEFeedback.tsx`)

Refactorizar para que considere:
- **Objetivo del usuario**: Rangos de RPE óptimos por objetivo (fuerza: 8-9, hipertrofia: 7-9, resistencia: 6-7, potencia: 7-8, técnica: 5-6)
- **Tipo de tracking**: Adaptar sugerencias a reps_only/time_only (no solo peso)
- **Tipo de serie**: No dar feedback de carga en warmup/approach (solo validar que el RPE sea bajo)
- Pasar `trainingGoal` y `trackingType` como props

#### 4. Sugerencias IA en tiempo real durante el entrenamiento (`SessionDetail.tsx`)

Nuevo componente `AISetCoach` que aparece inline tras registrar una serie de trabajo:
- Se activa cuando el usuario completa una serie (tiene peso + reps + RPE)
- Envía al backend: ejercicio, serie actual, series anteriores, objetivo, historial previo
- Recibe sugerencia corta: "Sube 2.5kg en la siguiente serie" o "Baja reps a 8 para mantener RPE 8"
- Usa el contexto `set_coaching` (nuevo) en la Edge Function ai-insights
- Aparece como texto inline pequeño debajo de la serie (similar a RPEFeedback pero generado por IA)
- Solo se activa para series de trabajo, no warmup/approach
- Incluye cooldown para no saturar la API (1 llamada por serie completada, máx cada 15s)

#### 5. Nuevo contexto `set_coaching` en Edge Function (`supabase/functions/ai-insights/index.ts`)

Prompt especializado de analista deportivo:

```
Eres un Analista Deportivo de Alto Rendimiento. Analiza la serie que acaba de completar el atleta.
Datos: ejercicio, peso, reps, RPE, objetivo (fuerza/hipertrofia/potencia/etc), historial previo.
Sugiere UN ajuste concreto para la siguiente serie: cambio de peso, cambio de reps, o mantener.
Considera: tipo de serie (trabajo vs calentamiento), fatiga acumulada, objetivo del atleta.
Responde en UNA frase corta y directa. Sin introducciones.
```

#### 6. System prompt global de Analista Deportivo

Actualizar todos los prompts del `ai-insights` y `ai-coach-chat` para que la IA se comporte como un **Analista Deportivo de Alto Rendimiento** con conocimiento en:
- Periodización ondulante y lineal
- Autorregulación por RPE (Helms, Zourdos)
- Velocidad de ejecución como indicador de fatiga
- Rangos óptimos de RPE por objetivo y fase de entrenamiento

---

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/constants.ts` | Añadir objetivos: power, technique, aerobic |
| `src/pages/Profile.tsx` | Select de objetivo de entrenamiento en perfil |
| `src/components/RPEFeedback.tsx` | Lógica adaptada a objetivo + tracking type + tipo de serie |
| `src/pages/SessionDetail.tsx` | Integrar `AISetCoach` inline tras cada serie de trabajo completada |
| `src/components/AISetCoach.tsx` | **Nuevo** — componente de sugerencia IA por serie |
| `supabase/functions/ai-insights/index.ts` | Nuevo contexto `set_coaching` + actualizar prompts como Analista Deportivo |
| `src/lib/ai-insights.ts` | Añadir `set_coaching` al tipo `InsightContext` |
| `src/components/WeightSuggestion.tsx` | Soportar nuevos objetivos (power, technique, aerobic) |

---

### Flujo de la sugerencia IA en tiempo real

```text
Usuario registra serie → onBlur/onUpdate detecta serie completa
  → Si set_type === 'work' && weight && reps && rpe → trigger AISetCoach
    → Envía: { exercise, weight, reps, rpe, goal, prevSets, setIndex }
    → Edge Function responde: "Sube a 82.5kg, RPE objetivo 8"
    → Se muestra inline debajo de la serie (texto pequeño con icono Sparkles)
```

