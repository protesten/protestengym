

## Módulo "Coach IA" — Inteligencia de Entrenamiento

### Concepto

Una nueva página `/coach` con un botón "Consultar al Coach" que recopila datos del usuario (historial de ejercicios, RPE, medidas antropométricas), los envía a una edge function que llama al Lovable AI Gateway (GPT), y muestra un análisis personalizado en cards con colores según el estado (verde/ámbar/rojo).

### Arquitectura

```text
[CoachPage] → recopila datos del cliente → POST /functions/v1/ai-coach
                                                    ↓
                                          [Edge Function ai-coach]
                                                    ↓
                                          Lovable AI Gateway (GPT)
                                                    ↓
                                          JSON estructurado con análisis
                                                    ↓
                                          [CoachPage] renderiza cards
```

### Cambios

**1. Edge Function `supabase/functions/ai-coach/index.ts`**

- Recibe los datos preprocesados del cliente (resúmenes de 1RM por ejercicio en las últimas N sesiones, RPE promedio semanal, peso corporal y % grasa recientes, estancamientos detectados).
- Construye un system prompt que instruye al modelo a analizar:
  - **Estancamiento**: ejercicios con 3+ sesiones sin mejora de 1RM.
  - **Fuerza relativa**: si peso baja pero 1RM se mantiene/sube.
  - **Fatiga**: si RPE promedio semanal > 8.5, sugerir deload.
- Usa tool calling para extraer respuesta estructurada: `{ achievement: string, alert: string, advice: string, status: 'progress' | 'plateau' | 'overtraining' }`.
- Añadir al `config.toml`: `[functions.ai-coach] verify_jwt = false`.

**2. `src/db/coach-data.ts`** (nuevo) — Funciones de recopilación de datos

- `getCoachData()`: función que recopila todo lo necesario para el análisis:
  - Por cada ejercicio `weight_reps`: 1RM de las últimas 5 sesiones (usando `calculate1RM` existente). Detecta estancamiento (3+ sesiones sin mejora).
  - RPE promedio de la última semana.
  - Últimas 2 mediciones de peso corporal y % grasa (de `body_measurements`).
  - Devuelve un objeto listo para enviar al edge function.

**3. `src/pages/Coach.tsx`** (nuevo)

- Botón "Consultar al Coach" que llama a `getCoachData()` y envía a la edge function.
- Muestra 3 cards con el resultado:
  - **Logro de la semana** (borde verde si `status === 'progress'`).
  - **Alerta de mejora** (borde ámbar si `status === 'plateau'`).
  - **Consejo personalizado** (borde rojo si `status === 'overtraining'`, verde si no).
- Estado de carga con skeleton.
- Historial de consultas anteriores guardado en `localStorage` (no necesita DB).

**4. `src/App.tsx`**: Añadir ruta `/coach`.

**5. `src/components/BottomNav.tsx`**: Añadir "Coach" al menú "Más" con icono `Brain`.

### Lógica de detección de estancamiento (cliente)

```typescript
// Para cada ejercicio, obtener 1RM por sesión (últimas 5)
// Si las últimas 3 sesiones tienen 1RM <= max de las 3 anteriores → "meseta"
```

### Prompt del sistema (edge function)

El prompt instruirá al modelo a responder en español, ser conciso, usar los datos proporcionados, y devolver la estructura via tool calling. Incluirá reglas específicas sobre cuándo marcar cada status.

### Archivos afectados

| Archivo | Acción |
|---|---|
| `supabase/functions/ai-coach/index.ts` | Nuevo: edge function con Lovable AI |
| `supabase/config.toml` | Añadir `[functions.ai-coach]` |
| `src/db/coach-data.ts` | Nuevo: recopilación de datos para el coach |
| `src/pages/Coach.tsx` | Nuevo: página del coach |
| `src/App.tsx` | Añadir ruta `/coach` |
| `src/components/BottomNav.tsx` | Añadir enlace al coach |

No se necesitan migraciones de base de datos. Se usa `LOVABLE_API_KEY` ya configurado.

